# Copyright (C) 2007-2025 Michael Daum http://michaeldaumconsulting.com
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

package Foswiki::Plugins::NatEditPlugin;

use strict;
use warnings;

use Foswiki::Func                  ();
use Foswiki::Plugins               ();
use Foswiki::Validation            ();
use Foswiki::Request               ();
use Foswiki::Sandbox               ();
use Foswiki::Plugins::JQueryPlugin ();

BEGIN {
    # Backwards compatibility for Foswiki 1.1.x
    unless ( Foswiki::Request->can('multi_param') ) {
        no warnings 'redefine';
        *Foswiki::Request::multi_param = \&Foswiki::Request::param;
        use warnings 'redefine';
    }
}

our $VERSION           = '9.993';
our $RELEASE           = '%$RELEASE%';
our $NO_PREFS_IN_TOPIC = 1;
our $SHORTDESCRIPTION  = 'A Wikiwyg Editor';
our $LICENSECODE       = '%$LICENSECODE%';
our $doneNonce;
our $htmlConverter;
our $tmlConverter;

sub initPlugin {

    Foswiki::Plugins::JQueryPlugin::registerPlugin( "NatEdit",
        "Foswiki::Plugins::NatEditPlugin::NATEDIT" );

    Foswiki::Func::registerTagHandler(
        'NATFORMBUTTON',
        sub {
            require Foswiki::Plugins::NatEditPlugin::FormButton;
            return Foswiki::Plugins::NatEditPlugin::FormButton::handle(@_);
        }
    );
    Foswiki::Func::registerTagHandler(
        'NATFORMLIST',
        sub {
            require Foswiki::Plugins::NatEditPlugin::FormList;
            return Foswiki::Plugins::NatEditPlugin::FormList::handle(@_);
        }
    );

    # SMELL: wrapper around normal save not being able to handle
    # utf8->sitecharset conversion.
    Foswiki::Func::registerRESTHandler(
        'save',
        sub {
            require Foswiki::Plugins::NatEditPlugin::RestSave;
            return Foswiki::Plugins::NatEditPlugin::RestSave::handle(@_);
        },
        authenticate => 1,         # save always requires authentication
        validate     => 1,         # and validation
        http_allow   => 'POST',    # updates: restrict to POST.
        description  => 'Save or preview results of an edit.'
    );

    Foswiki::Func::registerRESTHandler(
        "attachments",
        sub {
            require Foswiki::Plugins::NatEditPlugin::RestAttachments;
            return Foswiki::Plugins::NatEditPlugin::RestAttachments::handle(@_);
        },
        authenticate => 0,             # handler checks it's own security.
        validate     => 0,             # doesn't update.
        http_allow   => 'GET,POST',    # doesn't update.
        description  => 'Expand the list of attachments.'
    );

    Foswiki::Func::registerRESTHandler(
        "users",
        sub {
            require Foswiki::Plugins::NatEditPlugin::RestUsers;
            return Foswiki::Plugins::NatEditPlugin::RestUsers::handle(@_);
        },
        authenticate => 0,             # handler checks it's own security.
        validate     => 0,             # doesn't update.
        http_allow   => 'GET,POST',    # doesn't update.
        description  => 'Expand the list of users and groups.'
    );

    Foswiki::Func::registerRESTHandler(
        "complete",
        sub {
            require Foswiki::Plugins::NatEditPlugin::RestCompletion;
            return Foswiki::Plugins::NatEditPlugin::RestCompletion::handle(@_);
        },
        authenticate => 1,
        validate     => 0,             # doesn't update.
        http_allow   => 'GET,POST',    # doesn't update.
        description  => 'Expand a list of possible text completions.'
    );

    Foswiki::Func::registerRESTHandler(
        "topicTitle",
        sub {
            my $session = shift;

            my $request = $session->{request};
            my $web     = $request->param("web")      || $session->{webName};
            my $topic   = $request->param("location") || $session->{topicName};

            ( $web, $topic ) =
              Foswiki::Func::normalizeWebTopicName( $web, $topic );

            return unless Foswiki::Func::topicExists( $web, $topic );
            return Foswiki::Func::getTopicTitle( $web, $topic );
        },
        authenticate => 0,
        validate     => 0,                                     # doesn't update.
        http_allow   => 'GET,POST',                            # doesn't update.
        description  => 'Returns the topic title of a topic.'
    );

    Foswiki::Func::registerRESTHandler(
        "html2tml",
        sub {
            return getHtmlConverter(shift)->restConvert(@_);
        },
        authenticate => 0,
        validate   => 0,                                       # doesn't update.
        http_allow => 'GET,POST',                              # doesn't update.
    );

    Foswiki::Func::registerRESTHandler(
        "tml2html",
        sub {
            return getTmlConverter(shift)->restConvert(@_);
        },
        authenticate => 0,
        validate     => 0,                                     # doesn't update.
        http_allow => 'GET,POST',                              # doesn't update.
    );

    $doneNonce = 0;

    # features
    Foswiki::Func::getContext()->{NatEditPlugin_CanInsertImage} = 1;

    return 1;
}

sub finishPlugin {
    undef $htmlConverter;
    undef $tmlConverter;
}

sub getHtmlConverter {
    my $session = shift;

    $session ||= $Foswiki::Plugins::SESSION;

    unless ($htmlConverter) {
        require Foswiki::Plugins::NatEditPlugin::HTML2TML;
        $htmlConverter =
          Foswiki::Plugins::NatEditPlugin::HTML2TML->new($session);
    }

    return $htmlConverter;
}

sub getTmlConverter {
    my $session = shift;

    $session ||= $Foswiki::Plugins::SESSION;

    unless ($tmlConverter) {
        require Foswiki::Plugins::NatEditPlugin::TML2HTML;
        $tmlConverter =
          Foswiki::Plugins::NatEditPlugin::TML2HTML->new($session);
    }

    return $tmlConverter;
}

sub beforeSaveHandler {
    my ( $text, $topic, $web, $meta ) = @_;

    my $context = Foswiki::Func::getContext();
    return unless $context->{save};

    my $request = Foswiki::Func::getRequestObject();

    foreach my $key ($request->param) {
      next unless $key =~ /^_text_format_(.*)$/;
      my $textFormat = $request->param($key) || 'tml';
      my $fieldName = $1;

      my $tml;
      if ( $textFormat eq 'html' ) {
          my $html = $request->param($fieldName);
          next unless defined $html;

          $tml = getHtmlConverter->convert( $html, $meta );

          if ($fieldName eq 'text') {
            $meta->text($tml);
          } else {
            my $field = $meta->get("FIELD", $fieldName);
            if ($field) {
              $field->{value} = $tml;
            }
          }
      }
    }
}

sub afterSaveHandler {
    my ( $text, $topic, $web, $error, $meta ) = @_;

    return if $error;

    getHtmlConverter->attachPending($meta);
}

# make sure there's a new nonce for consecutive save+continues
sub beforeEditHandler {
    my ( $text, $topic, $web, $error, $meta ) = @_;

    return if $doneNonce;
    $doneNonce = 1;

    my $session = $Foswiki::Plugins::SESSION;
    my $cgis    = $session->getCGISession();
    return unless $cgis;

    my $response = $session->{response};
    my $request  = $session->{request};

    my $context = $request->url( -full => 1, -path => 1, -query => 1 ) . time();
    my $useStrikeOne = ( $Foswiki::cfg{Validation}{Method} eq 'strikeone' );
    my $nonce;

    if ( Foswiki::Validation->can('generateValidationKey') ) {

        # newer foswikis have a proper api for things like this
        $nonce = Foswiki::Validation::generateValidationKey( $cgis, $context,
            $useStrikeOne );
    }
    else {

        # older ones get a quick and dirty approach
        my $result = Foswiki::Validation::addValidationKey( $cgis, $context,
            $useStrikeOne );
        if ( $result =~ m/value='(.*)'/ ) {
            $nonce = $1;
        }
    }

    #print STDERR "nonce=$nonce\n";

    $response->pushHeader( 'X-Foswiki-Validation', $nonce ) if defined $nonce;
}

1;
