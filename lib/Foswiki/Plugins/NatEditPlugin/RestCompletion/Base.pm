# Copyright (C) 2021-2024 Michael Daum http://michaeldaumconsulting.com
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

package Foswiki::Plugins::NatEditPlugin::RestCompletion::Base;

use strict;
use warnings;

use Foswiki::Func();

use constant TRACE => 0;
#use Data::Dump qw(dump);

sub new {
  my $class = shift;
  my $session = shift;
  my $response = shift;

  my $this = bless({
    session => $session,
    response => $response,
    params => {},
    @_
  }, $class);

  $this->init();

  return $this;
}

sub DESTROY {
  my $this = shift;

  undef $this->{session};
  undef $this->{response};
  undef $this->{params};
}

sub init {
  my $this = shift;

  _writeDebug("called init");
  my $request = Foswiki::Func::getRequestObject();

  foreach my $key ($request->param()) {
    my $val = $request->param($key);
    $val = _urlDecode($val);
    $this->{params}{$key} = $val;
    _writeDebug("param $key=$val");
  }

  $this->{params}{web} //= $this->{session}{webName};
  $this->{params}{limit} //= 0;
  $this->{params}{term} //= "";
  $this->{params}{mode} //= "";

  #_writeDebug(dump($this->{params}));

  return $this;
}

sub param {
  my ($this, $key) = @_;

  my $val = $this->{params}{$key};

  _writeDebug("called param($key) = $val");

  return $val;
}

sub formatResult {
  my ($this, $result) = @_;

  $result = JSON::to_json($result, {pretty => 1});

  $this->{response}->header(
    -status => 200,
    -type => 'text/plain',
  );
  $this->{response}->print($result);

  return "";
}

sub handle {
  my $this = shift;

  _writeDebug("called handle");

  my $mode = $this->param("mode");
  _writeDebug("mode=$mode");

  return $this->handleMention() if $mode eq 'mention';
  return $this->handleTopic() if $mode eq 'topic';
  return "";
}

sub handleTopic {
  die "not implemented";
}

sub handleMention {
  die "not implemented";
}

sub _urlDecode {
  my $text = shift;

  $text =~ s/%([\da-fA-F]{2})/chr(hex($1))/ge;

  return $text;
}

sub _writeDebug {
  return unless TRACE;
  my $msg = shift // "";
  print STDERR "RestCompletion::Base - $msg\n";
}

1;
