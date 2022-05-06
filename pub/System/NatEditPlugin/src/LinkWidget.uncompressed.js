/*
 * LinkWidget for CodeMirror
 *
 * Copyright (c) 2021 Michael Daum http://michaeldaumconsulting.com
 *
 * Licensed under the GPL license http://www.gnu.org/licenses/gpl.html
 *
 */

"use strict";

(function($) {

var linkRegExp = /\[\[.*?\](\[.*?\])?\]/;

function LinkWidget(editor, from, to) {
  var self = this;

  //console.log("creating an LinkWidget at from=",from,"to=",to);

  self.editor = editor;
  self.from = from;
  self.to = to;
  self.init();
}

LinkWidget.createWidgets = function(editor) {
  var search = editor.cm.getSearchCursor(linkRegExp, 0, 0),
      cursor = editor.cm.getCursor(),
      marks;

  while (search.findNext()) {
    if (!_posInsideRange(cursor, search.pos) && !_posEqual(cursor, search.pos.to)) {
      marks = editor.cm.findMarksAt(search.pos.from);
      if (!marks.find(function(mark) {
        return typeof(mark.widget) !== 'undefined';
      })) {
        new LinkWidget(editor, search.pos.from, search.pos.to);
      }
    }
  }
};

LinkWidget.prototype.init = function() {
  var self = this;

  self.parse();

  if (typeof(self.elem) === 'undefined') {
    self.elem = $("<a>"+self.linkText+"</a>")
      .addClass("cm-natedit-wiki-link")
      .on("click", function(ev) {
        //console.log("clicked ",self);
        var dialogData = self.editor.shell.parseLink(self.getText());

        self.editor.shell.dialog({
          name: "insertlink",
          open: function(elem) {
            self.editor.shell.initLinkDialog(elem);
          },
          data: dialogData,
          event: ev
        }).then(function(dialog) {
            var $currentTab = $(dialog).find(".jqTab.current"),
                opts;

            if ($currentTab.is(".topic")) {
              opts = {
                web: $currentTab.find("input[name='web']").val(),
                topic: $currentTab.find("input[name='topic']").val(),
                text: $currentTab.find("input[name='linktext_topic']").val()
              };
            } else if ($currentTab.is(".external")) {
              opts = {
                url: $currentTab.find("input[name='url']").val(),
                text: $currentTab.find("input[name='linktext_external']").val()
              };
            } else if ($currentTab.is(".attachment")) {
              opts = {
                web: $currentTab.find("input[name='web']").val(),
                topic: $currentTab.find("input[name='topic']").val(),
                file: $currentTab.find("select[name='file']").val(),
                text: $currentTab.find("input[name='linktext_attachment']").val()
              };
            }
            self.set(opts);
          }, function(dialog) {
            //cancelHandler.call(self, dialog);
          }
        );
      });
  }

  self.mark = self.editor.cm.markText(self.from, self.to, {
    replacedWith: self.elem[0],
    addToHistory: false,
    atomic: false,
    clearOnEnter: true,
    clearWhenEmpty: true,
    handleMouseEvents: true,
    widget: self
    /*
    readOnly: true,
    selectLeft: true,
    selectRight: true
    */
  });
};

LinkWidget.prototype.parse = function(text) {
  var self = this;

  if (typeof(text) === 'undefined') {
    text = self.getText();
  }

  if (text.match(/\s*\[\[(.*?)\]\[(.*?)\]\]\s*/)) {
    self.linkTarget = RegExp.$1;
    self.linkText = RegExp.$2;
  } else if (text.match(/\s*\[\[(.*?)\]\]\s*/)) {
    self.linkTarget = self.linkText = RegExp.$1;
  } else {
    console.warn("text of LinkWidget does not make up a [[...]] wiki link:",text);
  }
};

LinkWidget.prototype.stringify = function() {
  var self = this;

  self.parse();
  return `[[${self.linkTarget}][${self.linkText}]]`;
};

LinkWidget.prototype.getText = function() {
  var self = this;
  return self.editor.cm.getRange(self.from, self.to);
};

LinkWidget.prototype.setText = function(text) {
  var self = this,
      len = text.length;

  self.editor.cm.replaceRange(text, self.from, self.to);
  self.to.ch = self.from.ch + len;
  self.init();
};

LinkWidget.prototype.set = function(opts) {
  var self = this, markup;

  //self.shell.log("set opts=",opts);

  if (typeof(opts.url) !== 'undefined') {
    // external link
    if (typeof(opts.url) === 'undefined' || opts.url === '') {
      return; // nop
    }

    if (typeof(opts.text) !== 'undefined' && opts.text !== '') {
      self.linkText = opts.text;
      self.linkTarget = opts.url;
      markup = "[["+opts.url+"]["+opts.text+"]]";
    } else {
      self.linkText = opts.url;
      self.linkTarget = opts.url;
      markup = "[["+opts.url+"]]";
    }
  } else if (typeof(opts.file) !== 'undefined') {
    // attachment link

    if (typeof(opts.web) === 'undefined' || opts.web === '' || 
        typeof(opts.topic) === 'undefined' || opts.topic === '') {
      return; // nop
    }

    if (opts.web === self.editor.shell.opts.web && opts.topic === self.editor.shell.opts.topic) {
      self.linkText = self.linkTarget = '%ATTACHURLPATH%/'+opts.file;
      markup = "[[%ATTACHURLPATH%/"+opts.file+"]";
    } else {
      self.linkText = self.linkTarget = "%PUBURLPATH%/"+opts.web+"/"+opts.topic+"/"+opts.file;
      markup = "[[%PUBURLPATH%/"+opts.web+"/"+opts.topic+"/"+opts.file+"]";
    }

    if (typeof(opts.text) !== 'undefined' && opts.text !== '') {
      self.linkText = opts.text;
      markup += "["+opts.text+"]";
    } else {
      self.linkText = opts.file;
      markup += "["+opts.file+"]";
    }
    markup += "]";

  } else {
    // wiki link
    
    if (typeof(opts.topic) === 'undefined' || opts.topic === '') {
      return; // nop
    }

    if (opts.web === self.editor.shell.opts.web) {
      self.linkText = self.linkTarget = opts.topic;
      markup = "[["+opts.topic+"]";
    } else {
      self.linkText = self.linkTarget = opts.web+".".opts.topic;
      markup = "[["+opts.web+"."+opts.topic+"]";
    }

    if (typeof(opts.text) !== 'undefined' && opts.text !== '') {
      self.linkText = opts.text;
      markup += "["+opts.text+"]";
    } 
    markup += "]";
  }

  //self.elem.text(self.linkText);

  self.setText(markup);
};

/* export */
window.LinkWidget = LinkWidget;

})(jQuery);
