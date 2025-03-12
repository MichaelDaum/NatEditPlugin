# Plugin for Foswiki - The Free and Open Source Wiki, http://foswiki.org/
#
# Copyright (C) 2006-2025 Michael Daum, http://michaeldaumconsulting.com
#
# This program is free software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License
# as published by the Free Software Foundation; either version 2
# of the License, or (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
# GNU General Public License for more details, published at
# http://www.gnu.org/copyleft/gpl.html

package Foswiki::Plugins::NatEditPlugin::NATEDIT;
use strict;
use warnings;

use Foswiki::Func                          ();
use Foswiki::Plugins::JQueryPlugin::Plugin ();
use Foswiki::Plugins::NatEditPlugin ();
our @ISA = qw( Foswiki::Plugins::JQueryPlugin::Plugin );

=begin TML

---+ package Foswiki::Plugins::NatEditPlugin::NATEDIT

This is the perl stub for the jquery.natedit plugin.

=cut

=begin TML

---++ ClassMethod new( $class, ... )

Constructor

=cut

sub new {
    my $class = shift;

    my $this = bless(
        $class->SUPER::new(
            name          => 'NatEdit',
            version       => $Foswiki::Plugins::NatEditPlugin::VERSION,
            author        => 'Michael Daum',
            homepage      => 'http://foswiki.org/Extensions/NatEditPlugin',
            puburl        => '%PUBURLPATH%/%SYSTEMWEB%/NatEditPlugin/build',
            css           => ['bundle.css'],
            documentation => "$Foswiki::cfg{SystemWebName}.NatEditPlugin",
            javascript    => [ 'bundle.js' ],
            i18n => $Foswiki::cfg{SystemWebName} . "/NatEditPlugin/i18n",
            dependencies => [
                'JQUERYPLUGIN::NATEDIT::PREFERENCES', 'foswiki',
                'JQUERYPLUGIN::FOSWIKI::PREFERENCES', 'textboxlist',
                'pnotify',                            'fontawesome',
                'form',                               'validate',
                'ui',                                 'ui::dialog',
                'ui::tooltip',                        'tabpane',
                'ui::autocomplete',                   'ui::button',
                'button',                             'loader',
                'JQUERYPLUGIN::UPLOADER',             'blockui',
                'render',                             'imagesloaded',
                'image'
            ],
        ),
        $class
    );

    return $this;
}

=begin TML

---++ ClassMethod init( $this )

Initialize this plugin by adding the required static files to the html header

=cut

sub init {
    my $this = shift;

    return unless $this->SUPER::init();

    my $request = Foswiki::Func::getRequestObject();
    my @files = ();
    push @files, 
      split /\s*,\s*/,
      Foswiki::Func::expandCommonVariables("%PUBURLPATH%/%SYSTEMWEB%/SkinTemplates/base.css, %FOSWIKI_STYLE_URL%, %FOSWIKI_COLORS_URL%");

    push @files, "$Foswiki::cfg{PubUrlPath}/$Foswiki::cfg{SystemWebName}/ImagePlugin/image.css"
      if Foswiki::Func::getContext("ImagePluginEnabled");

    my $contentCSS = join ", ", map {"\"$_\""} @files;
   
    Foswiki::Func::addToZone(
        "script", "JQUERYPLUGIN::NATEDIT::PREFERENCES",
        <<"HERE", "JQUERYPLUGIN::FOSWIKI::PREFERENCES" );
<script class='\$zone \$id foswikiPreferences' type='text/json'>{ 
  "NatEditPlugin": {
    "version": "$this->{version}",
    "ContentCSS": [$contentCSS],
    "EmojiPluginEnabled": %IF{"context EmojiPluginEnabled" then="true" else="false"}%,
    "FarbtasticEnabled": %IF{"context FarbtasticEnabled" then="true" else="false"}%,
    "ImagePluginEnabled": %IF{"context ImagePluginEnabled" then="true" else="false"}%,
    "MathEnabled": %IF{"context MathModePluginEnabled or context MathJaxPluginEnabled" then="true" else="false"}%,
    "TopicInteractionPluginEnabled": %IF{"context TopicInteractionPluginEnabled" then="true" else="false"}%,
    "NoAutolink": %IF{"'%NOAUTOLINK{default=""}%'='on'" then="true" else="false"}%,
    "debug": %IF{"'%NATEDIT_DEBUG{default="off"}%'='on'" then="true" else="false"}%,
    "purifyInput": %IF{"'%NATEDIT_PURIFY{default="true"}%'=~'(on|1|true)'" then="true" else="false"}%,
    "purify": {
      "ADD_ATTR": "%NATEDIT_PURIFY_ADDATTRS{default="contenteditable"}%",
      "ADD_TAGS": "%NATEDIT_PURIFY_ADDTAGS{default="verbatim, literal, sticky, nop, noautolink, dirtyarea, graphviz, dot, mermaid, latex"}%",
      "FORBID_ATTRS": "%NATEDIT_PURIFY_FORBIDATTRS{default=""}%",
      "FORBID_TAGS": "%NATEDIT_PURIFY_FORBIDTAGS{default=""}%"
    }
  }
}</script>
HERE

}

1;
