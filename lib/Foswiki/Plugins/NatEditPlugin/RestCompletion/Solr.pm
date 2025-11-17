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

package Foswiki::Plugins::NatEditPlugin::RestCompletion::Solr;

use strict;
use warnings;

use Foswiki::Plugins::SolrPlugin ();
use Foswiki::Plugins::NatEditPlugin::RestCompletion::Base();
use base 'Foswiki::Plugins::NatEditPlugin::RestCompletion::Base';

use constant TRACE => 0;

sub handleMention {
  my $this = shift;

  _writeDebug("called handleMention");

  my $thisUser = Foswiki::Func::getWikiName();
  my $term = $this->param("term");
  $term =~ s/^@//;
  $term = _sanitizeString($term);

  _writeDebug("term=$term");

  my $web = $Foswiki::cfg{UsersWebName};
  my $db = Foswiki::Plugins::DBCachePlugin::getDB($web);

  my $index = 0;
  my $limit = $this->param("limit");
  my @result = ();

  my $userForm = $Foswiki::cfg{SolrPlugin}{PersonDataForm} || $Foswiki::cfg{PersonDataForm} || $Foswiki::cfg{Ldap}{PersonDataForm} || '*UserForm';
  my $search = "web:$Foswiki::cfg{UsersWebName} form:$userForm ( title_search:$term* OR topic_search:$term* )"; 
  _writeDebug("search=$search");

  $this->searcher->iterate({
      q => $search,
      fl => "web,topic,title",
      sort => "title_sort asc",
    },
    sub {
      my $doc = shift;
      my $web = $doc->value_for("web");
      my $topic = $doc->value_for("topic");
      my $topicTitle = $doc->value_for("title");

      # SMELL: skip any non-existing user ... should be part of the query, but NOT use the state:enabled field as that might be used otherwise by a custom workflow
      return 1 unless Foswiki::Func::getCanonicalUserID($topic);

      push @result, {
        web => $web,
        topic => $topic,
        title => $topicTitle,
      };

      $index++;
      return $limit && $index >= $limit ? 0 : 1;
    }
  );

  return $this->formatResult(\@result);
}

sub handleTopic {
  my $this = shift;

  _writeDebug("called handleTopic");

  my $term = $this->param("term");
  my $web = $this->param("web");
  my $limit = $this->param("limit");

  $term =~ s/^\[\[//;
  $term = _sanitizeString($term);

  _writeDebug("term=$term, web=$web, limit=$limit");

  my $termWeb;
  ($termWeb, $term) = Foswiki::Func::normalizeWebTopicName($web, $term);
  return "[]" unless Foswiki::Func::webExists($termWeb);
  
  my $index = 0;
  my @result = ();

  my $search = "web:$termWeb type:topic (title_search:$term* OR topic_search:$term*)";
  _writeDebug("search=$search");

  $this->searcher->iterate({
      q => $search,
      fl => "web,topic,title", 
      sort => "title_sort asc",
    },
    sub {
      my $doc = shift;
      my $web = $doc->value_for("web");
      my $topic = $doc->value_for("topic");
      my $topicTitle = $doc->value_for("title");

      push @result, {
        web => $web,
        topic => $topic,
        title => $topicTitle,
      };

      $index++;
      return $limit && $index >= $limit ? 0 : 1;
    }
  );

  # get webs, same as in default -> move it to Base?
  if ($web eq $termWeb && (!$limit || $index < $limit)) {
    my $topic = $Foswiki::cfg{HomeTopicName};
    $this->searcher->iterateFacet("web", sub {
      my ($val, $count) = @_;
      if ($count) {
        push @result, {
          web => $val,
          topic => $topic,
          title => Foswiki::Func::getTopicTitle($val, $topic),
        };
        $index++;
      }

      return $limit && $index >= $limit ? 0 : 1;
    }, 0, "web_search:$term");
  }

  return $this->formatResult(\@result);
}

sub searcher {
  my $this = shift;
  return Foswiki::Plugins::SolrPlugin::getSearcher();
}


sub _writeDebug {
  return unless TRACE;
  my $msg = shift // "";
  print STDERR "RestCompletion::Solr - $msg\n";
}

sub _sanitizeString {
  my $str = shift;

  return unless defined $str;

  $str =~ s/[^\w\.\/\%_\-]//g;

  return $str;
}

1;

