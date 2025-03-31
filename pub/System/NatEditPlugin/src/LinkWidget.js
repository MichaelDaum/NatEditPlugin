/*
 * LinkWidget for CodeMirror
 *
 * Copyright (c) 2021-2025 Michael Daum http://michaeldaumconsulting.com
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

// static method to create all link widgets within the given editor
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

  return self.parse().then(function() {

    if (typeof(self.elem) === 'undefined') {
      self.elem = $("<a>"+self.linkText+"</a>")
        .addClass("cm-natedit-wiki-link")
        .on("click", function(ev) {
          var cm = self.editor.cm;

          //SMELL: not called with selectLeft/selectRight=false, handleMouseEvents does not make any change
          console.log("clicked",self.from);

          self.editor.setSelectionRange(self.from, self.to);
          self.editor.shell.linkDialog(self.getText()).always(function() {
            //console.log("scrolling to",self.from);
            cm.setCursor(self.from)
            cm.scrollIntoView(self.from);
            cm.refresh();
          });
          ev.preventDefault();
          return false;
        });
    }

    self.mark = self.editor.cm.markText(self.from, self.to, {
      replacedWith: self.elem[0],
      addToHistory: false,
      clearOnEnter: true,
      clearWhenEmpty: true,
      handleMouseEvents: true,
      widget: self,
      selectLeft: false,
      selectRight: false
    });
  });
};

LinkWidget.prototype.parse = function(text) {
  var self = this,
      dfd = $.Deferred();

  if (typeof(text) === 'undefined') {
    text = self.getText();
  }

  if (text.match(/\s*\[\[(.*?)\]\[(.*?)\]\]\s*/)) {
    self.linkTarget = RegExp.$1;
    self.linkText = RegExp.$2;
    self.type = 1;
    dfd.resolve(self.linkTarget, self.linkText);
  } else if (text.match(/\s*\[\[(.*?)\]\]\s*/)) {
    self.linkTarget = RegExp.$1;
    self.type = 2;

    if (self.linkTarget.match(/^\w+:\/\//)) {
      self.linkText = self.linkTarget;
      dfd.resolve(self.linkTarget, self.linkText);
    } else {

      self.editor.shell.getTopicTitle(self.linkTarget).done(function(topicTitle)  {
        if (topicTitle) {
          self.linkText = topicTitle;
        } else {
          self.linkText = self.linkTarget;
        }
        dfd.resolve(self.linkTarget, self.linkText);
      });
    }

  } else {
    dfd.reject("text of LinkWidget does not make up a [[...]] wiki link:",text);
  }

  return dfd.promise();
};

/*
LinkWidget.prototype.stringify = function() {
  var self = this;

  self.parse();
  return `[[${self.linkTarget}][${self.linkText}]]`;
};
*/

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

    /*
    $.get(foswiki.getScriptUrl("rest", "NatEditPlugin", "topicTitle"), {
      topic : opts.web + "." + opts.topic
    }).done(function(data) {
      console.log("topicTitle=",data);
    });
    */

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
