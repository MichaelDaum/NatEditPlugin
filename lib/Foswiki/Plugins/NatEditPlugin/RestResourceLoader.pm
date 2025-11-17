# Copyright (C) 2025 Michael Daum http://michaeldaumconsulting.com
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

package Foswiki::Plugins::NatEditPlugin::RestResourceLoader;

use strict;
use warnings;

use Foswiki::Func ();

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

sub restGetDocumentTitle {
  my $this = shift;

  my $request = $this->{session}{request};
  my $url = $request->param('url');
  return "" unless $url;
  return "" unless $url =~ /^https?:\/\//;

  my $response;

  if (exists $Foswiki::cfg{CacheContrib}) {
    require Foswiki::Contrib::CacheContrib;
    $response = Foswiki::Contrib::CacheContrib::getExternalResource($url);
  } else {
    $response = Foswiki::Func::getExternalResource($url);
  }

  return "" if $response->is_error() || !$response->isa('HTTP::Response');

  my $contentType = $response->header("Content-Type");
  return "" unless $contentType =~ /^text\/html/;

  my $content = $response->decoded_content();

  if ($content =~ /<title>\s*(.*?)\s*<\/title>/) {
    return Foswiki::entityDecode($1);
  }

  return "";
}

1;
