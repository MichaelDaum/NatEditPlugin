/*
 * Permissions Editor 
 *
 * Copyright (c) 2008-2025 Michael Daum http://michaeldaumconsulting.com
 *
 * Licensed under the GPL license http://www.gnu.org/licenses/gpl.html
 *
 */

"use strict";
(function($) {

  var defaults = {
    debug: false,
    userUrl: null
  };

  function PermissionsEditor(elem, opts) {
    var self = this;

    self.elem = $(elem);
    self.opts = $.extend({}, defaults, self.elem.data(), opts);
    self.init();
  }

  PermissionsEditor.prototype.init = function() {
    var self = this;

    if (!self.opts.userUrl) {
      self.opts.userUrl = foswiki.getScriptUrl("rest", "NatEditPlugin", "users");
    }

    self.log("called init opts=",self.opts);

    // details behavior
    self.elem.find(".ui-natedit-details-container input").on("blur", function() {
      var $this = $(this);
      $this.trigger("AddValue", $this.val());
    }).textboxlist({
      onSelect: function (box) {
        self.updateDetails(box);
      },
      onDeselect: function (box) {
        self.updateDetails(box);
      },
      onClear: function (box) {
        self.updateDetails(box);
      },
      onReset: function (box) {
        self.updateDetails(box);
      },
      autocomplete: self.opts.userUrl 
    });

    // radio behavior
    self.elem.find("input[type=radio]").on("click", function() {
      self.setPermissionSet($(this).data());
    });

    // initial values
    self.elem.find("input[type=radio]:checked").not(":disabled").each(function() {
      self.setPermissionSet($(this).data());
    });
  };

  PermissionsEditor.prototype.log = function() {
    var self = this, args;

    if (console && self.opts.debug) {
      args = $.makeArray(arguments);
      args.unshift("PERM: ");
      console && console.log.apply(console, args); // eslint-disable-line no-console
    }
  };

  PermissionsEditor.prototype.setPermission = function(type, rules) {
    var self = this,
      key, val;

    self.elem.find(".permset_" + type).each(function() {
      $(this).val("undefined");
    });

    for (key in rules) {
      if (rules.hasOwnProperty(key)) {
        val = rules[key];
        self.log("setting ."+key+"_"+type+"="+val); 
        self.elem.find("." + key + "_" + type).val(val);
      }
    }
  };

  PermissionsEditor.prototype.showPermDetails = function(type) {
    var self = this,
      names = [],
      val;

    self.elem.find(".ui-natedit-"+type+"-perms .ui-natedit-details-container").slideDown(300);
    self.elem.find("input[name='Local+PERMSET_" + type.toUpperCase() + "_DETAILS']").each(function() {
      val = $(this).val();
      if (val && val !== '') {
        names.push(val);
      }
    });

    names = names.join(', ');
    //self.log("showPermDetails - names="+names);

    self.setPermission(type, {
      allow: names
    });
  };

  PermissionsEditor.prototype.hidePermDetails = function(type) {
    var self = this;

    self.elem.find(".ui-natedit-"+type+"-perms .ui-natedit-details-container").slideUp(300);
    self.setPermission(type);
  };

  PermissionsEditor.prototype.updateDetails = function(txtboxlst) {
    var self = this,
      currentValues = txtboxlst.currentValues,
      type = $(txtboxlst.input).data("permType");

    self.log("currentValues="+currentValues.join(", "));
    self.setPermission(type, {
      allow: currentValues.join(", ")
    });
  }

  PermissionsEditor.prototype.setPermissionSet = function (data) {
    var self = this;

    if (data.perms === 'details') {
      self.showPermDetails(data.permType);
    } else {
      self.hidePermDetails(data.permType);
      self.setPermission(data.permType, data.perms);
    }
  }

  $.fn.permissionsEditor = function (opts) {
    return this.each(function () {
      if (!$.data(this, "PermissionsEditor")) {
        $.data(this, "PermissionsEditor", new PermissionsEditor(this, opts));
      }
    });
  };

  $(function() {
    $(".ui-natedit-permissions-form").livequery(function() {
      $(this).permissionsEditor();
    });
  });

})(jQuery);
