# Plugin for Foswiki - The Free and Open Source Wiki, http://foswiki.org/
#
# Copyright (C) 2006-2021 Michael Daum, http://michaeldaumconsulting.com
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
            version       => '4.991',
            author        => 'Michael Daum',
            homepage      => 'http://foswiki.org/Extensions/NatEditPlugin',
            puburl        => '%PUBURLPATH%/%SYSTEMWEB%/NatEditPlugin/build',
            css           => ['styles.css'],
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
                'render',                             'imagesloaded'
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
    my $engine;

    # TODO: make those two engines configurable
    if (Foswiki::Func::isTrue($request->param("nowysiwyg")) ||
      Foswiki::Func::getPreferencesFlag("TINYMCEPLUGIN_DISABLE") || 
      Foswiki::Func::getPreferencesFlag("NOWYSIWYG")) {

      $engine = "codemirror"; # wiki editor
    } else {
      $engine = "tinymce"; # wysiwyg editor
    }

    $engine = "Codemirror" if $engine =~ /^codemirror$/;
    $engine = "Prosemirror" if $engine =~ /^prosemirror$/;
    $engine = "TinyMCE" if $engine =~ /^tinymce$/;
    $engine = "TinyMCENative" if $engine =~ /^tinymcenative$/;
    $engine = "Textarea" if $engine =~ /^(textarea|raw)$/;
    $engine .= "Engine";

    Foswiki::Func::addToZone(
        "script", "JQUERYPLUGIN::NATEDIT::PREFERENCES",
        <<"HERE", "JQUERYPLUGIN::FOSWIKI::PREFERENCES" );
<script class='\$zone \$id foswikiPreferences' type='text/json'>{ 
  "NatEditPlugin": {
    "Engine": "$engine",
    "ContentCSS": ["%PUBURLPATH%/%SYSTEMWEB%/SkinTemplates/base.css","%FOSWIKI_STYLE_URL%","%FOSWIKI_COLORS_URL%", "%PUBURLPATH%/%SYSTEMWEB%/ImagePlugin/style.css"],
    "EmojiPluginEnabled": %IF{"context EmojiPluginEnabled" then="true" else="false"}%,
    "FarbtasticEnabled": %IF{"context FarbtasticEnabled" then="true" else="false"}%,
    "ImagePluginEnabled": %IF{"context ImagePluginEnabled" then="true" else="false"}%,
    "MathEnabled": %IF{"context MathModePluginEnabled or context MathJaxPluginEnabled" then="true" else="false"}%,
    "TopicInteractionPluginEnabled": %IF{"context TopicInteractionPluginEnabled" then="true" else="false"}%
  }
}</script>
HERE

}

1;
