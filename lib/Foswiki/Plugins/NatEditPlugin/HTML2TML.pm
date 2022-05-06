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

package Foswiki::Plugins::NatEditPlugin::HTML2TML;

use strict;
use warnings;

use Foswiki::Func ();
use Error qw( :try );
use JSON ();
use Foswiki::Plugins ();
use Foswiki::Plugins::WysiwygPlugin::HTML2TML ();
use Foswiki::Plugins::WysiwygPlugin::Handlers ();

sub restConvert {
  my ($session, $plugin, $verb, $response) = @_;

  my $request = $session->{request};
  my $html = $request->param('text');
  my $tml = convert($html, $session);

  $response->header(
    -status => 200,
    -charset => 'UTF-8',
    -type => 'text/plain',
  );
  $response->print($tml);

  return "";
}

sub convert {
  my ($html, $session) = @_;

  $session ||= $Foswiki::Plugins::SESSION;

  $html =~ s/<!--$Foswiki::Plugins::WysiwygPlugin::Handlers::SECRET_ID-->//g;
  my $html2tml = Foswiki::Plugins::WysiwygPlugin::HTML2TML->new();

  return $html2tml->convert(
    $html,
    {
      web => $session->{webName},
      topic => $session->{topicName},
      very_clean => 1,
      stickybits => Foswiki::Func::getPreferencesValue('WYSIWYGPLUGIN_STICKYBITS'),
      ignoreattrs => Foswiki::Func::getPreferencesValue('WYSIWYGPLUGIN_IGNOREATTRS'),
      convertImage => \&convertImage,
      rewriteURL => \&Foswiki::Plugins::WysiwygPlugin::Handlers::postConvertURL,
    }
  );
}

#use Data::Dump qw(dump);
sub convertImage {
  my $img = shift;

  #print STDERR "called convertImage()\n";
  #print STDERR "attrs=".dump($img->{attrs})."\n";

  if (Foswiki::Func::getContext()->{ImagePluginEnabled}) {
    my $src = $img->{attrs}{src};
    my $web = $img->{attrs}{web};
    my $topic = $img->{attrs}{topic};
    my $file;

    if ($src =~ /^(?:%ATTACHURL(?:PATH)?%\/)(.*?)$/) {
      $file = $1;
    } elsif ($src =~ /(?:(?:%PUBURL(?:PATH)?%|\/pub)\/)(.*)\/(.*?)\/(.*?)$/) {
      $web = $1;
      $topic = $2;
      $file = $3;
    }

    my @params = ();
    push @params, "\"$file\"";
    push @params, "topic=\"$web.$topic\"" if $web && $topic;
    push @params, "class=\"$img->{attrs}{class}\"" if $img->{attrs}{class};
    push @params, "width=\"$img->{attrs}{width}\"" if defined $img->{attrs}{width};
    push @params, "height=\"$img->{attrs}{height}\"" if defined $img->{attrs}{height};
    push @params, "align=\"$img->{attrs}{align}\"" if $img->{attrs}{align};
    push @params, 'type="' . $img->{attrs}{"data-type"} . '"' if $img->{attrs}{"data-type"};
    push @params, 'caption="' . $img->{attrs}{"data-caption"} . '"' if $img->{attrs}{"data-caption"};

    return "%IMAGE{" . join(" ", @params) . "}%";
  }

  return;
}

1;
