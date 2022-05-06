/*
 * EmojiWidget for CodeMirror
 *
 * Copyright (c) 2021-2022 Michael Daum http://michaeldaumconsulting.com
 *
 * Licensed under the GPL license http://www.gnu.org/licenses/gpl.html
 *
 */

"use strict";

(function($) {

function EmojiWidget(editor, from, to) {
  var self = this;

  self.editor = editor;
  self.from = from;
  self.to = to;
  self.init();
}

EmojiWidget.createWidgets = function(editor) {
  _searchEmojis(editor, Emojis.emojiRegExp);
  _searchEmojis(editor, Emojis.aliasRegExp);
};

function _searchEmojis(editor, regExp) {
  var search = editor.cm.getSearchCursor(regExp, 0, 0),
      cursor = editor.cm.getCursor(),
      marks;

  while (search.findNext()) {
    if (!_posInsideRange(cursor, search.pos) && !_posEqual(cursor, search.pos.to)) {
      marks = editor.cm.findMarksAt(search.pos.from);
      if (!marks.find(function(mark) {
        return typeof(mark.widget) !== 'undefined';
      })) {
        new EmojiWidget(editor, search.pos.from, search.pos.to);
      }
    }
  }
}

EmojiWidget.prototype.init = function() {
  var self = this;

  self.text = self.getText();
  //console.log("emoji at text='"+self.text+"'");

  if (typeof(self.elem) === 'undefined') {
    self.elem = $("<img>")
      .prop("src", Emojis.getUrl(self.getText()))
      .addClass("emoji cm-natedit-emoji");
  }

  self.mark = self.editor.cm.markText(self.from, self.to, {
    replacedWith: self.elem[0],
    addToHistory: false,
    atomic: true,
    clearOnEnter: true,
    clearWhenEmpty: true,
    widget: self
    /*
    readOnly: true,
    selectLeft: true,
    selectRight: true
    handleMouseEvents: true,
    */
  });
};

EmojiWidget.prototype.stringify = function() {
  return this.text;
};

EmojiWidget.prototype.getText = function() {
  var self = this;
  return self.editor.cm.getRange(self.from, self.to);
};

EmojiWidget.prototype.setText = function(text) {
  var self = this,
      len = text.length;

  self.editor.cm.replaceRange(text, self.from, self.to);
  self.to.ch = self.from.ch + len;
  self.init();
};

/* export */
window.EmojiWidget = EmojiWidget;

})(jQuery);

