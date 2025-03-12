"use strict";

(function($) {

function TableWidget(cm, from, to) {
  var self = this;

  console.log("creating an TableWidget at from=",from,"to=",to);

  self.cm = cm;
  self.from = from;
  self.to = to;

  self.init();
};

TableWidget.prototype.init = function() {
  var self = this, 
      text;

  /*
  if (/^<img\s*(.*)\s*\/?>$/.test(self.getText())) {
    text = RegExp.$1;
  }
  */

  self.attrs = utils.getAttrs(text);

  if (typeof(self.elem) === 'undefined') {
    self.elem = $("<table contenteditable='true'>").appendTo("body");
    self.elem.attr(self.attrs).addClass("cm-table-widget");
    self.elem.data("TableWidget", self);
  }

  self.mark = self.cm.markText(self.from, self.to, {
    replacedWith: self.elem[0],
    //clearOnEnter: true,
    clearWhenEmpty: false,
    handleMouseEvents: true
  });

  self.mark.on("beforeCursorEnter", function() {
    console.log("beforeCursorEnter");
  });
};

})(jQuery);
