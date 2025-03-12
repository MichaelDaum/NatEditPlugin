# Copyright (C) 2021-2022 Michael Daum http://michaeldaumconsulting.com
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

package Foswiki::Plugins::NatEditPlugin::RestCompletion;

use strict;
use warnings;

use Foswiki::Func ();
use Foswiki::Meta ();
use JSON ();

use constant DBCACHE_ENABLED => 1;
use constant SOLR_ENABLED => 0;

sub handle {
  my ($session, $plugin, $verb, $response) = @_;

  my $context = Foswiki::Func::getContext();

  my $impl = "Foswiki::Plugins::NatEditPlugin::RestCompletion::";

  if (DBCACHE_ENABLED && $context->{DBCachePluginEnabled}) {
    $impl .= "DBCache";
  } elsif (SOLR_ENABLED && $context->{SolrPluginEanabled}) {
    $impl .= "Solr";
  } else {
    $impl .= "Default";
  }

  eval "require $impl";
  die $@ if $@;

  return $impl->new($session, $response)->handle();
}

1;
