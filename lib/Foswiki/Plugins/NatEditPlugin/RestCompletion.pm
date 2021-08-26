# Copyright (C) 2021 Michael Daum http://michaeldaumconsulting.com
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

sub handle {
  my ($session, $plugin, $verb, $response) = @_;

  my $request = $session->{request};
  my $id = $request->param("id");
  return "" unless defined($id) && $id =~ /^(mention|topic)$/;

  my $term = $request->param("term");
  my $web = $request->param("web") // $session->{webName};
  my $limit = $request->param("limit") // 0;
  my $thisUser = Foswiki::Func::getWikiName();
  my @result = ();

  if ($id eq 'mention') {
    $term =~ s/^@//;
    my $star = ($term =~ s/^\*// ? ".*":"");

    my $it = Foswiki::Func::eachUser();
    my $index = 0;

    while ($it->hasNext()) {
      $web //= $Foswiki::cfg{UsersWebName};
      my $user = $it->next();
      next if $term && $user !~ /^$star\Q$term\E/i;
      next if Foswiki::Func::topicExists($web, $user) &&
              !Foswiki::Func::checkAccessPermission("VIEW", $thisUser, undef, $user, $web);

      push @result, {
        web => $web,
        topic => $user,
        title => Foswiki::Func::getTopicTitle($web, $user),
      };
      $index++;
      last if $limit && $index >= $limit;
    }

    @result = sort {$a->{title} cmp $b->{title}} @result;

  } elsif ($id eq 'topic') {

    $term =~ s/^\[\[//;
    my $star = ($term =~ s/^\*// ? ".*":"");

    my $termWeb;
    ($termWeb, $term) = Foswiki::Func::normalizeWebTopicName($web, $term);

    # get topics
    my $webObject = Foswiki::Meta->new($session, $termWeb);
    my $it = $webObject->eachTopic();
    my $index = 0;

    while ($it->hasNext()) {
      my $topic = $it->next();
      next if $term && $topic !~ /^$star\Q$term\E/i;
      next if Foswiki::Func::topicExists($termWeb, $topic) &&
              !Foswiki::Func::checkAccessPermission("VIEW", $thisUser, undef, $topic, $termWeb);

      push @result, {
        web => $termWeb,
        topic => $topic,
        title => Foswiki::Func::getTopicTitle($termWeb, $topic),
      };

      $index++;
      last if $limit && $index >= $limit;
    }

    # get webs
    if ($web eq $termWeb && (!$limit || $index < $limit)) {
      my $topic = $Foswiki::cfg{HomeTopicName};
      foreach my $thisWeb (Foswiki::Func::getListOfWebs()) {
        next if $thisWeb =~ /^_/;
        next if $term && $thisWeb !~ /^$star\Q$term\E/i;
        next if Foswiki::Func::topicExists($thisWeb, $topic) &&
                !Foswiki::Func::checkAccessPermission("VIEW", $thisUser, undef, $topic, $thisWeb);

        push @result, {
          web => $thisWeb,
          topic => $topic,
          title => Foswiki::Func::getTopicTitle($thisWeb, $topic),
        };
        $index++;
        last if $limit && $index >= $limit;
      }
    }

    @result = sort {$a->{title} cmp $b->{title}} @result;
  }

  my $result = JSON::to_json(\@result, {pretty => 1});

  $response->header(
    -status => 200,
    -type => 'text/plain',
  );
  $response->print($result);

  return "";
}

1;
