# Copyright (C) 2022-2026 Michael Daum http://michaeldaumconsulting.com
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

package Foswiki::Plugins::NatEditPlugin::HTML2TML;

use strict;
use warnings;

use Foswiki::Func ();
use Error qw( :try );
use JSON ();
use Foswiki::Plugins ();
use Foswiki::Plugins::WysiwygPlugin::HTML2TML ();
use Foswiki::Plugins::WysiwygPlugin::Handlers ();
use MIME::Base64 ();
use Digest::MD5 ();
use Encode ();

sub new {
  my $class = shift;
  my $session = shift;

  my $this = bless({
      session => $session,
      @_
    },
    $class
  );

  return $this;
}

sub DESTROY {
  my $this = shift;

  undef $this->{session};
  undef $this->{types};
  undef $this->{queuedAttachments};
}

sub restConvert {
  my ($this, $plugin, $verb, $response) = @_;

  my $request = $this->{session}{request};
  my $html = $request->param('text');
  $html = Foswiki::urlDecode($html) if Foswiki::Func::getContext()->{command_line};
  my $tml = $this->convert($html);

  my $doAttach = Foswiki::Func::isTrue($request->param('attach', 1));
  $this->saveQueuedAttachments() if $doAttach;

  $response->header(
    -status => 200,
    -charset => 'UTF-8',
    -type => 'text/plain',
  );
  $response->print($tml);

  return "";
}

sub convert {
  my ($this, $html, $meta) = @_;

  return '' unless defined $html;

  $html =~ s/<!--$Foswiki::Plugins::WysiwygPlugin::Handlers::SECRET_ID-->//g;

  my $html2tml = Foswiki::Plugins::WysiwygPlugin::HTML2TML->new();

  my $tml = $html2tml->convert(
    $html,
    {
      web => $this->{session}{webName},
      topic => $this->{session}{topicName},
      meta => $meta,
      very_clean => 1,
      #br2nl =>1,
      #keepws => 1,
      stickybits => Foswiki::Func::getPreferencesValue('WYSIWYGPLUGIN_STICKYBITS'),
      ignoreattrs => Foswiki::Func::getPreferencesValue('WYSIWYGPLUGIN_IGNOREATTRS'),
      convertImage => sub {
        return $this->convertImage(@_)
      },
      rewriteURL => \&Foswiki::Plugins::WysiwygPlugin::Handlers::postConvertURL,
    }
  );

  return $tml;
}

sub convertImage {
  my ($this, $img) = @_;

  return unless ref($img);

  #print STDERR "called convertImage()\n";

  return unless Foswiki::Func::getContext()->{ImagePluginEnabled};

  my $defaultType = Foswiki::Func::getPreferencesValue("NATEDIT_IMAGEFORMAT") // '';
  my $defaultAlign = Foswiki::Func::getPreferencesValue("NATEDIT_IMAGEALIGN") // '';
  my $defaultClass = Foswiki::Func::getPreferencesValue("NATEDIT_IMAGECLAS") // '';

  my $src = $img->{attrs}{src};
  my $web = $img->{attrs}{"data-orig-web"} || $img->{attrs}{"data-web"} || $img->{context}{web} || $this->{session}{webName};
  my $topic = $img->{attrs}{"data-orig-topic"} || $img->{attrs}{"data-topic"} || $img->{context}{topic} || $this->{session}{topicName};
  my $file = $img->{attrs}{"data-orig-file"} || $img->{attrs}{"data-file"};

  my $width = $img->{attrs}{width};
  my $height = $img->{attrs}{height};
  my $size = $img->{attrs}{"data-size"} || '';
  my $zoom = $img->{attrs}{"data-zoom"} || '';
  my $output = $img->{attrs}{"data-output"} || '';
  my $ratio = $img->{attrs}{"data-ratio"} || '';
  my $filter = $img->{attrs}{"data-filter"} || '';

  my $href = $img->{attrs}{"data-href"};# || $img->{attrs}{href};
  my $type = $img->{attrs}{"data-orig-type"} || $img->{attrs}{"data-type"};
  $type = $defaultType unless $type && $type ne "none";

  $src = Encode::encode_utf8($src);
  $src = Foswiki::urlDecode($src);

  my $restUrlPath = $this->getScriptUrlPath("ImagePlugin", "process", "rest");
  if ($file) {
    if ($src =~ /^data:(.*)$/) {
      $this->queueAttachment($web, $topic, $img->{context}{meta}, $1, $file);
    }
  } elsif ($src =~ /^(?:%ATTACHURL(?:PATH)?%\/)(.*?)$/) {
    $file = $1;
  } elsif ($src =~ /(?:(?:%PUBURL(?:PATH)?%|\/pub)\/)(.*)\/(.*?)\/(.*?)$/) {
    $web = $1;
    $topic = $2;
    $file = $3;
    return if $file =~ /\.svgz?$/;# don't convert svgs
  } elsif ($src =~ /^data:(.*)$/) {
    $file = $this->queueAttachment($web, $topic, $img->{context}{meta}, $1);
  } elsif ($src =~ /^(?:$restUrlPath|(?:%SCRIPTURL(?:PATH)?%\/rest\/ImagePlugin)\/process)\?topic=(.*?);file=(.*)$/) {
    $file = $2;
  } else {
    $file = $src;
  }

  ($web, $topic) = Foswiki::Func::normalizeWebTopicName($web, $topic);

  #print STDERR "web=$web, topic=$topic, file=$file baseWeb=$this->{session}{webName}, baseTopic=$this->{session}{topicName}\n";

  $web = "" if $web eq $this->{session}{webName};
  $topic = "" if $topic eq $this->{session}{topicName};

  my $class = $img->{attrs}{class} // $defaultClass;
  $class =~ s/\bimage(Simple|Float|Thumb|Frame|Plain)(_left|_right|_none|_center)?\b//g;
  $class =~ s/^\s+//;
  $class =~ s/\s+$//;

  my $align = $img->{attrs}{"align"};
  $align = $defaultAlign unless $align && $align ne "none";

  my @params = ();
  push @params, "\"$file\"";

  if ($topic) {
    if ($web) {
      push @params, "topic=\"$web.$topic\"";
    } else {
      push @params, "topic=\"$topic\"";
    }
  }

  push @params, 'caption="' . $img->{attrs}{"data-caption"} . '"' if $img->{attrs}{"data-caption"};

  #push @params, "size=\"$size\"" if $size;
  push @params, "width=\"$width\"" if defined $width;
  push @params, "height=\"$height\"" if defined $height;
  push @params, "zoom=\"$zoom\"" if $zoom && $zoom ne 'off';
  push @params, "output=\"$output\"" if $output;
  push @params, "ratio=\"$ratio\"" if $ratio && $ratio ne 'on';
  push @params, "filter=\"$filter\"" if $filter;

  push @params, "class=\"$class\"" if $class;
  push @params, "align=\"$align\"" if $align;
  push @params, "type=\"$type\"" if $type && $type ne 'simple';
  push @params, "href=\"$href\"" if $href;

  return "%IMAGE{" . join(" ", @params) . "}%";
}

sub queueAttachment {
  my ($this, $web, $topic, $meta, $blob, $fileName) = @_;

  #print STDERR "called queueAttachment()\n";
  return unless $blob =~ /([a-z]+\/[a-z\-\.\+]+)?(;[a-z\-]+\=[a-z\-]+)?;base64,(.*)$/;

  my $mimeType = $1;
  return unless $mimeType;

  my $charset = $2 || '';
  my $data = MIME::Base64::decode_base64($3);

  my $suffix = $this->mimeTypeToSuffix($mimeType);
  my $attachment = Digest::MD5::md5_hex($data) . '.' . $suffix;
  if ($this->{queuedAttachments}{$attachment}) {
    print STDERR "WARNING: already queued blob attachment ... skipping\n";
  } else {

    my $fh = File::Temp->new();
    binmode($fh);
    my $tmpFile = $fh->filename;

    my $offset = 0;
    my $size = do { use bytes; length $data };
    my $r = $size;
    while ($r) {
      my $w = syswrite($fh, $data, $r, $offset);
      die "system write error: $!\n" unless defined $w;
      $offset += $w;
      $r -= $w;
    }

    # queue blobs to be attached later on
    $this->{queuedAttachments}{$attachment} = {
      name => $fileName || $attachment,
      fh => $fh,
      file => $tmpFile,
      filesize => $size,
    };
  }

  return $attachment;
}

sub saveQueuedAttachments {
  my ($this, $meta) = @_;

  #print STDERR "called saveQueuedAttachments\n";
  return unless defined $this->{queuedAttachments};

  ($meta) = Foswiki::Func::readTopic($this->{session}{webName}, $this->{session}{topicName})
    unless $meta;

  return unless $meta->existsInStore();

  my $attachments = $this->{queuedAttachments};
  undef $this->{queuedAttachments};

  foreach my $item (values %$attachments) {
    next if $meta->hasAttachment($item->{name});

    #print STDERR "attaching $item->{name} to ".$meta->getPath()."\n";

    $meta->attach(
      name => $item->{name},
      file => $item->{file},
      stream => $item->{fh},
      filesize => $item->{filesize},
      minor => 1,
      dontlog => 1,
      comment => 'Auto-attached by NatEditPlugin',
    );
  }
}

sub mimeTypeToSuffix {
  my ($this, $mimeType) = @_;

  my $suffix = '';
  if ($mimeType =~ /.*\/(.*)/) {
    $suffix = $1;             # fallback
  }

  $this->readMimeTypes();

  if ($this->{types} =~ /^$mimeType\s*(\S*)(?:\s|$)/im) {
    $suffix = $1;
  }

  return $suffix;
}

sub readMimeTypes {
  my $this = shift;

  unless ($this->{types}) {
    $this->{types} = Foswiki::readFile($Foswiki::cfg{MimeTypesFileName});
  }

  return $this->{types};
}

sub getScriptUrlPath {
  my $this = shift;

  my $scriptUrlPath = Foswiki::Func::getScriptUrlPath(@_);
  my $urlHost = Foswiki::Func::getUrlHost();
  $scriptUrlPath =~ s/^$urlHost//;

  return $scriptUrlPath;
}

1;
