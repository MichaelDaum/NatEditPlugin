# Copyright (C) 2022-2025 Michael Daum http://michaeldaumconsulting.com
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

package Foswiki::Plugins::NatEditPlugin::TML2HTML;

use strict;
use warnings;

use Foswiki::Func ();
use Error qw( :try );
use JSON ();
use Foswiki::Plugins::WysiwygPlugin ();
use Foswiki::Plugins::WysiwygPlugin::Handlers ();

sub new {
  my $class = shift;
  my $session = shift;

  my $this = bless({
    session => $session,
    @_
  }, $class);

  return $this;
}

sub DESTROY {
  my $this = shift;

  undef $this->{session};
}

sub restConvert {
  my ($this, $plugin, $verb, $response) = @_;

  my $request = Foswiki::Func::getRequestObject();
  my $tml = $request->param('text');
  $tml = Foswiki::urlDecode($tml) if Foswiki::Func::getContext()->{command_line};
  my $html = $this->convert($tml);

  $response->header(
    -status => 200,
    -charset => 'UTF-8',
    -type => 'text/plain',
  );

  $response->print($html);

  return "";
}

sub convert {
  my ($this, $tml) = @_;

  return '' unless defined $tml;

  return $tml if $tml =~ /<!--$Foswiki::Plugins::WysiwygPlugin::Handlers::SECRET_ID-->/;

  # SMELL: dunno better
  $tml =~ s/%BR%/<br \/>/g;

  my $html = Foswiki::Plugins::WysiwygPlugin::Handlers::TranslateTML2HTML($tml,
    clearHtml => "<img src='$Foswiki::cfg{PubUrlPath}/$Foswiki::cfg{SystemWebName}/NatEditPlugin/images/clear-float.svg' class='WYSIWYG_CLEAR' data-mce-resize='false' data-mce-placeholder='1' />",
  );

  # SMELL: don't know how to fix <br /> otherwise
  #$html =~ s/<br \/> <span class='WYSIWYG_HIDDENWHITESPACE'.*?<\/span>/<br \/>\n/g;

  return $html;
}

1;
