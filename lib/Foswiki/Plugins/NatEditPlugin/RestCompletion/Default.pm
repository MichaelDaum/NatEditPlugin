# Copyright (C) 2021-2023 Michael Daum http://michaeldaumconsulting.com
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

package Foswiki::Plugins::NatEditPlugin::RestCompletion::Default;

use strict;
use warnings;

use Foswiki::Plugins::NatEditPlugin::RestCompletion::Base();
use base 'Foswiki::Plugins::NatEditPlugin::RestCompletion::Base';

use constant TRACE => 0;

sub handleMention {
  my $this = shift;

  _writeDebug("called handleMention");

  my $thisUser = Foswiki::Func::getWikiName();
  my $term = $this->param("term");
  $term =~ s/^@//;
  $term = lc($term);
  my $star = ($term =~ s/^\*// ? ".*":"");

  _writeDebug("term=$term, star=$star");

  my $it = Foswiki::Func::eachUser();
  my $index = 0;
  my $web = $Foswiki::cfg{UsersWebName};
  my $limit = $this->param("limit");
  my @result = ();

  while ($it->hasNext()) {
    my $user = $it->next();
    next if $user =~ /^(ProjectContributor|WikiGuest|AdminUser|UnknownUser|RegistrationAgent)$/; # exclude base users TODO: make this configurable?
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

  return $this->formatResult(\@result);
}

sub handleTopic {
  my $this = shift;

  _writeDebug("called handleTopic");

  my $thisUser = Foswiki::Func::getWikiName();
  my $term = $this->param("term");
  my $web = $this->param("web");
  my $limit = $this->param("limit");

  $term =~ s/^\[\[//;
  my $star = ($term =~ s/^\*// ? ".*":"");

  my $termWeb;
  ($termWeb, $term) = Foswiki::Func::normalizeWebTopicName($web, $term);
  $term = lc($term);
  return "[]" unless Foswiki::Func::webExists($termWeb);

  # get topics
  my $webObject = Foswiki::Meta->new($this->{session}, $termWeb);
  my $it = $webObject->eachTopic();
  my $index = 0;
  my @result = ();

  while ($it->hasNext()) {
    my $topic = $it->next();
    my $topicTitle = Foswiki::Func::getTopicTitle($termWeb, $topic);
    next if $term && lc($topic) !~ /^$star\Q$term\E/i && $topicTitle !~ /^$star\Q$term\E/i;
    next if Foswiki::Func::topicExists($termWeb, $topic) &&
            !Foswiki::Func::checkAccessPermission("VIEW", $thisUser, undef, $topic, $termWeb);

    push @result, {
      web => $termWeb,
      topic => $topic,
      title => $topicTitle,
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

  return $this->formatResult(\@result);
}

sub _writeDebug {
  return unless TRACE;
  my $msg = shift // "";
  print STDERR "RestCompletion::Default - $msg\n";
}

1;

