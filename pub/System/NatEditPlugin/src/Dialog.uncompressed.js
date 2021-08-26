/*

Foswiki - The Free and Open Source Wiki, http://foswiki.org/

(c)opyright 2017-2021 Michael Daum http://michaeldaumconsulting.com

are listed in the AUTHORS file in the root of this distribution.
NOTE: Please extend that file, not this notice.

This program is free software; you can redistribute it and/or
modify it under the terms of the GNU General Public License
as published by the Free Software Foundation; either version 2
of the License, or (at your option) any later version. For
more details read LICENSE in the root of this distribution.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

As per the GPL, removal of this notice is prohibited.

*/

/*eslint-disable no-console */

"use strict";

(function($) {

  var defaults = {
    "template": "metadata",
    "debug": false,
    "data": {
      "cachecontrol": 0
    }
  };

  /* constructor **********************************************************/
  function Dialog(opts) {
    var self = this;

    self.opts = $.extend({}, defaults, opts);
  }

  /* shortcut *************************************************************/
  Dialog.load = function(opts) {
    var dialog = new Dialog(opts);
    return dialog.load();
  };

  /* logger ***************************************************************/
  Dialog.prototype.log = function() {
    var self = this, args;

    if (!console || !self.opts.debug) {
      return;
    }

    args = $.makeArray(arguments);
    args.unshift("DIALOG:");
    console.log.apply(console, args);
  };


  /* load *****************************************************************/
  Dialog.prototype.load = function(params) {
    var self = this,
        opts = $.extend({}, self.opts, params),
        $dialog = typeof(opts.id) === 'undefined'?undefined:$(opts.id),
        data,
        dfd = $.Deferred();

    self.log("called load() opts=",opts);

    function callback(elem) {
      if (typeof(opts.init) === 'function') {
        opts.init.call(elem);
      }
    }

    if ($dialog && $dialog.length) {
      $dialog.dialog("open");
      $dialog.find("form").resetForm();
      callback($dialog);
      dfd.resolve($dialog);
    } else {

      data = $.extend({}, opts.data, {
        name: opts.template,
        expand: opts.expand,
        topic: foswiki.getPreference("WEB")+"."+foswiki.getPreference("TOPIC")
      });

      $.ajax({
        url: foswiki.getScriptUrl("rest", "RenderPlugin", "template"),
        data: data,
        dataType: 'html',
        success: function(data) {
          var $dialog = $(data);
          $dialog.one("dialogopen", function() {
            callback($dialog);
            dfd.resolve($dialog);
          });
          $dialog.appendTo("body");
        },
        error: function(xhr, status, err) {
          dfd.reject($dialog, status, err);
        }
      });
    }

    return dfd.promise();
  };

  // export
  $.NatEditor.Dialog = Dialog;

})(jQuery);
