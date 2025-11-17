/*
 * KaTexWidget for CodeMirror
 *
 * Copyright (c) 2025 Michael Daum http://michaeldaumconsulting.com
 *
 * Licensed under the GPL license http://www.gnu.org/licenses/gpl.html
 *
 */

"use strict";

(function($) {

var mathRegExp = /<math([^>]*)>(.*?)<\/math>/ms;

function KaTexWidget(editor, from, to) {
  var self = this;

  console.log("creating an KaTexWidget at from=",from,"to=",to);

  self.editor = editor;
  self.from = from;
  self.to = to;
};

// static method to create all link widgets within the given editor
KaTexWidget.createWidgets = function(editor) {
  var search = editor.cm.getSearchCursor(mathRegExp, 0, 0),
      cursor = editor.cm.getCursor(),
      marks, dfds = [];

  while (search.findNext()) {
    if (!_posInsideRange(cursor, search.pos) && !_posEqual(cursor, search.pos.to)) {
      marks = editor.cm.findMarksAt(search.pos.from);
      if (!marks.find(function(mark) {
        return mark.widget !== undefined;
      })) {
        let link = new KaTexWidget(editor, search.pos.from, search.pos.to);
        dfds.push(link.init());
      }
    }
  }

  return $.when(dfds)
};

KaTexWidget.prototype.getText = function() {
  var self = this;
  return self.editor.cm.getRange(self.from, self.to);
};

KaTexWidget.prototype.init = function() {
  var self = this, 
      text = self.getText(),
      params = {
        displayMode: false,
        fleqn: false,
        output: "html",
      };

  if (mathRegExp.test(text)) {
    const attrs = RegExp.$1;
    text = RegExp.$2;
    self.attrs = new foswiki.Attrs(attrs);
  }

  const align = self.attrs.get("align") || "left";

  if (align == 'center') {
    params.displayMode = true;
  } else if (align == 'inline') {
    params.displayMode = false;
  } else if (align == 'left') {
    params.displayMode = "true";
    params.fleqn = "true";
  }

  self.elem = $('<span>');
  katex.render(text, self.elem[0], params)

  if (typeof(self.elem) !== 'undefined') {
    self.elem.addClass("cm-katex-widget");
    self.elem.data("KaTexWidget", self);
  }

  self.mark = self.editor.cm.markText(self.from, self.to, {
    replacedWith: self.elem[0],
    addToHistory: false,
    clearOnEnter: true,
    clearWhenEmpty: true,
    //handleMouseEvents: true,
    atomic: true,
    selectLeft: true,
    selectRight: true,
  });

  /*
  self.mark.on("beforeCursorEnter", function() {
    console.log("beforeCursorEnter");
  });
  */
};

/* export */
window.KaTexWidget = KaTexWidget;

})(jQuery);
