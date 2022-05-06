# Copyright (C) 2022 Michael Daum http://michaeldaumconsulting.com
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
use Foswiki::Plugins::WysiwygPlugin::Handlers ();

sub restConvert {
  my ($session, $plugin, $verb, $response) = @_;

  my $request = $session->{request};
  my $tml = $request->param('text');
  my $html = convert($tml);

  $response->header(
    -status => 200,
    -charset => 'UTF-8',
    -type => 'text/plain',
  );

  $response->print($html);

  return "";
}

sub convert {
  my $tml = shift;

  return '' unless $tml;

  if ( $tml =~ /<!--$Foswiki::Plugins::WysiwygPlugin::Handlers::SECRET_ID-->/ ) {
    return $tml;
  }

  return Foswiki::Plugins::WysiwygPlugin::Handlers::TranslateTML2HTML($tml);
}

1;
