/*
 * DropDownMenu for NatEdit
 *
 * Copyright (c) 2021 Michael Daum http://michaeldaumconsulting.com
 *
 * Licensed under the GPL license http://www.gnu.org/licenses/gpl.html
 *
 */

"use strict";
(function($) {

var defaults = {
  "className": "ui-natedit-dropdown",
  "activeClassName": "ui-state-active"
};

function DropDownMenu (opts) {
  var self = this;

  self.opts = $.extend({}, defaults, opts);
  self.init();
}

DropDownMenu.prototype.init = function() {
  var self = this;

  self.elem = $("<div></div>").addClass(self.opts.className);
  self.list = $("<ul></ul>");
  self.list.appendTo(self.elem);

  self.elem.appendTo("body");

  return self;
};

DropDownMenu.prototype.show = function(position) {
  var self = this;

  if (typeof(position) !== 'undefined') {
    self.elem.css(position);
  }

  self.elem.show();
};

DropDownMenu.prototype.hide = function() {
  this.elem.hide();
};

DropDownMenu.prototype.isVisible = function() {
  return this.elem.is(":visible");
};

DropDownMenu.prototype.getSelection = function() {
  var self = this;

  return self.list.find("."+self.opts.activeClassName+":first");
};

DropDownMenu.prototype.getItem = function(pos) {
  var self = this;

  return self.list.children().eq(pos);
};

DropDownMenu.prototype.select = function(item) {
  var self = this;

  if (typeof(item) === 'undefined' || item.length === 0) {
    return;
  }

  self.list.children().removeClass(self.opts.activeClassName);
  self.list.scrollTo(item);

  item.addClass(self.opts.activeClassName);

  return item;
};

DropDownMenu.prototype.set = function(list) {
  var self = this;

  self.list.html(list);
  self.selectFirst();

  return self;
};

DropDownMenu.prototype.unset = function() {
  var self = this;

  self.list.empty();
  return self;
};

DropDownMenu.prototype.selectFirst = function() {
  var self = this;

  return self.select(self.getItem(0));
};

DropDownMenu.prototype.selectLast = function() {
  var self = this,
    pos = self.list.children().length -1;

  return self.select(self.getItem(pos));
};

DropDownMenu.prototype.selectPrev = function() {
  var self = this,
    item = self.getSelection().prev("li");

  return self.select(item);
};

DropDownMenu.prototype.selectNext = function() {
  var self = this,
    item = self.getSelection().next("li");

  return self.select(item);
};

DropDownMenu.prototype.callback = function(item) {
  var self = this, func;

  item = item || self.getSelection();
  if (typeof(item) !== 'undefined' && item.length) {
    func = item.data("callback");
    if (typeof(func) === 'function') {
      return func();
    }
  }

  console.warn("no callback at this position. item=",item);
  return;
};

/* export */
window.DropDownMenu = DropDownMenu;

})(jQuery);

