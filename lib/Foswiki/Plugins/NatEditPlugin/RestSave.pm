# Copyright (C) 2013-2025 Michael Daum http://michaeldaumconsulting.com
#
# This program is free software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License
# as published by the Free Software Foundation; either version 2
# of the License, or (at your option) any later version. For
# more details read LICENSE in the root of this distribution.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

package Foswiki::Plugins::NatEditPlugin::RestSave;

use strict;
use warnings;
use Foswiki::UI::Save ();
use Foswiki::OopsException ();
use Foswiki::Validation ();
use Foswiki::Plugins ();
use Foswiki::Func ();
use Encode ();
use Error qw( :try );
my $types;

sub handle {
  my ($session, $plugin, $verb, $response) = @_;

   # validate request
  unless (_isValidRequest($session)) {
    my $msg = $session->i18n->maketext("[_1] has received a suspicious change request from your browser.", "Foswiki");
    $msg .= $session->i18n->maketext("Press OK to confirm that this change was intentional.");
    $msg .= $session->i18n->maketext("Press Cancel otherwise.");
    $response->status(419);
    return $msg;
  }

  my $request = $session->{request};

  # convert to utf8
  foreach my $key ($request->multi_param()) {
    my @val = $request->multi_param($key);

    # hack to prevent redirecting
    if ($key eq 'redirectto' && @val && $val[0] eq '') {

      #print STDERR "deleting bogus redirectto\n";
      $request->delete($key);
      next;
    }

    if (ref $val[0] eq 'ARRAY') {
      $request->param($key, [map(_toSiteCharSet($_), @{$val[0]})]);
    } else {
      $request->param($key, [map(_toSiteCharSet($_), @val)]);
    }
  }

  # do a normal save
  my $error;
  my $status = 200;

  # enter save context
  Foswiki::Func::getContext()->{save} = 1;

  try {
    Foswiki::UI::Save::save($session);

    if ($request->param("action_checkpoint")) {
      # get a new lease
      my $topicObject = Foswiki::Meta->new($session, $session->{webName}, $session->{topicName});
      $topicObject->setLease($Foswiki::cfg{LeaseLength});
    }
  } catch Foswiki::OopsException with {
    $error = shift;
    if ($error->{def} eq 'merge_notice') {
      $error = "Topic has been merged";
    }
    $status = 419;
  };

  try {
    processUploads($session, $response);
  } catch Error with {
    $error = shift;
    $status = $error eq 'access denied' ? 403 : 500;
  };

  my $requestedWith = $request->http("X-Requested-With");
  return unless $requestedWith; # not an ajax call, leave the redirect intact

  # clear redirect enforced by a checkpoint action
  # preserve redirect location in another header to be performed client side 
  my $redirect = $response->getHeader("Location");
  $response->deleteHeader("Location", "Status");
  $response->pushHeader('X-Location', $redirect) if $redirect;
  $response->status($status);

  # add validation key to HTTP header, if required
  unless ($response->getHeader('X-Foswiki-Validation')) {
    my $nonce = _generateValidationKey($session);
    $response->pushHeader('X-Foswiki-Validation', $nonce) if $nonce;
  }

  return $error unless ref($error);
  return (defined $error) ? _stringifyError($error) : '';
}

sub processUploads {
  my ($session, $response) = @_;

  $session ||= $Foswiki::Plugins::SESSION;
  $response ||= $session->{response};

  my $request = $session->{request};
  my $uploads = $request->uploads();
  return unless $uploads;

  #print STDERR "found " . scalar(keys %$uploads) . " uploads\n" if $uploads;

  my $web = $session->{webName};
  my $topic = $session->{topicName};

  if ($topic =~ /AUTOINC|XXXXXXXXXX/) {
    # get expanded topic from redirect url
    my $redirect = $response->getHeader("Location") || '';
    if ($redirect =~ /\/([^\/]*?)$/) {
      $topic = $1;
      $topic =~ s/\Q$Foswiki::cfg{ScriptUrlSeparator}\E//g 
        if defined $Foswiki::cfg{ScriptUrlSeparator};
    }
  }
  #print STDERR "web=$web, topic=$topic\n";
  return unless Foswiki::Func::topicExists($web, $topic);

  my ($meta, $text) = Foswiki::Func::readTopic($web, $topic);

  throw Error::Simple("access denied")
    unless Foswiki::Func::checkAccessPermission("CHANGE", Foswiki::Func::getWikiName(), $text, $topic, $web, $meta);

  my $maxSize = Foswiki::Func::getPreferencesValue('ATTACHFILESIZELIMIT') // "";
  $maxSize = 0 unless ($maxSize =~ /([0-9]+)/);

  foreach my $fileName (keys %$uploads) {
    my $upload = $uploads->{$fileName};

    #print STDERR "found upload $fileName\n";
    my $tmpFileName = $upload->tmpFileName;
    my $origName;
    ($fileName, $origName) = Foswiki::Sandbox::sanitizeAttachmentName($fileName);

    unless ($fileName =~ /\./) {
      my $info = $upload->uploadInfo;
      my $suffix = _getSuffixOfMimeType($info->{"Content-Type"});
      $fileName .= "." . $suffix if $suffix;
    }

    my $stream = $upload->handle;
    my $fileSize;
    my $fileDate;
    if ($stream) {
      my @stats = stat $stream;
      $fileSize = $stats[7];
      $fileDate = $stats[9];
    }

    unless ($fileSize) {
      close($stream) if $stream;
      throw Error::Simple("Zero-sized file upload of '$fileName'");
    }

    if ($maxSize && $fileSize > $maxSize * 1024) {
      close($stream) if $stream;
      throw Error::Simple("Oversized upload of '$fileName'");
    }

    my $prevAttachment = $meta->get('FILEATTACHMENT', $fileName) || {};
    my $fileComment = $prevAttachment->{comment} // '';

    my $fileHide = ($prevAttachment->{attr} && $prevAttachment->{attr} =~ /h/) ? 'on' : 'off';
    $fileHide = $fileHide eq 'on' ? 1 : 0;

    #print STDERR "web=$web, topic=$topic, fileName=$fileName, origName=$origName, tmpFileName=$tmpFileName, fileComment=$fileComment, fileHide=$fileHide\n";

    my $error;
    try {
      $error = Foswiki::Func::saveAttachment(
        $web, $topic,
        $fileName,
        {
          comment => $fileComment,
          hide => $fileHide,
          stream => $stream,
          filesize => $fileSize,
          filedate => $fileDate,
          tmpFilename => $tmpFileName,
        }
      );
    } catch Error::Simple with {
      $error = shift->{-text};
    };
    close($stream) if $stream;

    throw Error::Simple($error) if $error;
  }
}

# compatibility wrapper
sub _generateValidationKey {
  my $session = shift;

  my $cgis = $session->getCGISession();
  return unless $cgis;

  my $request = $session->{request};
  my $context = $request->url(-full => 1, -path => 1, -query => 1) . time();
  my $usingStrikeOne = $Foswiki::cfg{Validation}{Method} eq 'strikeone';

  my $nonce;
  if (Foswiki::Validation->can("generateValidationKey")) {
    $nonce = Foswiki::Validation::generateValidationKey($cgis, $context, $usingStrikeOne);
  } else { # extract from "<input type='hidden' name='validation_key' value='?$nonce' />";

    my $html = Foswiki::Validation::addValidationKey(@_);
    if ($html =~ /value='\?(.*?)'/) {
      $nonce = $1;
    }
  }

  return $nonce;
}

sub _isValidRequest {
  my $session = shift;

  my $request = $session->{request};
  return unless $Foswiki::cfg{Validation}{Method} eq 'strikeone';

  my $nonce = $request->param('validation_key');
  my $cgiSession = $session->getCGISession();

  return unless defined $cgiSession;

  return Foswiki::Validation::isValidNonce($cgiSession, $nonce);
}

sub _stringifyError {
  my $error = shift;

  my $s = '';

  $s .= $error->{-text} if defined $error->{-text};
  $s .= ' ' . join(',', @{$error->{params}})
    if defined $error->{params};

  return $s;
}

sub _toSiteCharSet {
  my $string = shift;

  return unless defined $string;

  return $string if $Foswiki::UNICODE;

  return $string
    if ($Foswiki::cfg{Site}{CharSet} =~ /^utf-?8/i);

  # If the site charset is not utf-8, need to convert it
  # Leave this code using Encode:: - not used on UNICODE core.
  require Encode;
  return Encode::encode($Foswiki::cfg{Site}{CharSet}, Encode::decode_utf8($string), Encode::FB_PERLQQ);
}

sub _getSuffixOfMimeType {
  my $mimeType = shift;

  my $suffix;

  $types //= Foswiki::Func::readFile($Foswiki::cfg{MimeTypesFileName});

  if ($types =~ /^$mimeType\s+(\S+)\s*/im) {
    $suffix = $1;
  }

  return $suffix;
}

1;
