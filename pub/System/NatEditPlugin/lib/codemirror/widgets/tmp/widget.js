/*global CodeMirror */
"use strict";

// posEq convenience function from CodeMirror source
function posEq(a, b) {
  return a.line === b.line && a.ch === b.ch;
}

function Widget(cm) {
  // the subclass must define this.domNode before calling this constructor
  var self = this;

  this.cm = cm;
  cm.replaceSelection("\u2af7" + cm.getSelection() + "\u2af8", "around");

  var from = cm.getCursor("from");
  var to = cm.getCursor("to");

  this.mark = cm.markText(from, to, {
    replacedWith: this.domNode,
    clearWhenEmpty: false
  });

  if (this.enter) {
    CodeMirror.on(this.mark, "beforeCursorEnter", function(/*e*/) {
      // register the enter function 
      // the actual movement happens if the cursor movement was a plain navigation
      // but not if it was a backspace or selection extension, etc.
      var direction = posEq(self.cm.getCursor(), self.mark.find().from) ? 'left' : 'right';
      cm.widgetEnter = $.proxy(self, 'enterIfDefined', direction);
    });
  }

  cm.setCursor(to);
  cm.refresh();
}

Widget.prototype.enterIfDefined = function(direction) {
  // check to make sure the mark still exists
  if (this.mark.find()) {
    this.enter(direction);
  } else {
    // if we don't do this and do:

    // G = <integer widget>
    //
    // 3x3 table widget 

    // then backspace to get rid of table widget,
    // the integer widget disappears until we type on the first
    // line again.  Calling this refresh takes care of things.
    this.cm.refresh();
  }
};

Widget.prototype.range = function() {
  var find = this.mark.find();
  find.from.ch += 1;
  find.to.ch -= 1;
  return find;
};

Widget.prototype.setText = function(text) {
  var r = this.range();
  this.cm.replaceRange(text, r.from, r.to);
};

Widget.prototype.getText = function() {
  var r = this.range();
  return this.cm.getRange(r.from, r.to);
};
