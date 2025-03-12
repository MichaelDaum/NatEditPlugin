/*
 * NatEdit: base engine
 *
 * Copyright (c) 2015-2025 Michael Daum http://michaeldaumconsulting.com
 *
 * Licensed under the GPL license http://www.gnu.org/licenses/gpl.html
 *
 */
"use strict";

/* export */
var BaseEngine;

(function($) {

var italicRegExp     = /_(\S+|(?:\S.*?\S))_(?=$|[\s,.;:!?)])/g,
    boldRegExp       = /\*(\S+|(?:\S.*?\S))\*(?=$|[\s,.;:!?)])/g,
    boldItalicRegExp = /__(\S+|(?:\S.*?\S))__(?=$|[\s,.;:!?)])/g,
    monoRegExp       = /=(\S+|(?:\S.*?\S))=(?=$|[\s,.;:!?)])/g,
    boldMonoRegExp   = /==(\S+|(?:\S.*?\S))==(?=$|[\s,.;:!?)])/g,
    colorTagRegExp   = /%(AQUA|BLACK|BLUE|BROWN|GRAY|GREEN|LIME|MAROON|NAVY|OLIVE|ORANGE|PINK|PURPLE|RED|SILVER|TEAL|WHITE|YELLOW)%\s*|\s*%ENDCOLOR%/g;


/*****************************************************************************
 * constructor
 */
BaseEngine = function() {
  var self = this;

  if (typeof(self.opts) === 'undefined') {
    self.opts = {};
  }
};

/*************************************************************************
 * init this engine
 */
BaseEngine.prototype.init = function() {
  var self = this;

  //self.shell.log("init");

  return $.Deferred().resolve(self).promise();
};

/*************************************************************************
 * init gui
 */
BaseEngine.prototype.initGui = function() {
  var self = this;

  if (self.shell.opts.resizable) {
    self.getWrapperElement().resizable();
  }

  self.getWrapperElement().addClass("ui-natedit-widget");

  $("body").on("fileuploaddrop", function(ev, data) {
    /*
    var origEv = ev.originalEvent.delegatedEvent,
      evX = origEv.pageX,
      evY = origEv.pageY;

    console.log("got event fileuploaddrop",ev);
    console.log("evX=",evX,"evY=",evY);

    data.files.forEach(function(file) {
      // SMELL: allow other files as well
      if (file.type && file.type.indexOf("image/") > -1) {
        self.insertImage({
          web: self.shell.opts.web,
          topic: self.shell.opts.topic,
          file: file.name,
          width: "200",
          classList: "imageResponsive"
        });
      }
    });
    */
  });

};

/*************************************************************************
 * get the DOM element that holds the editor engine
 */
BaseEngine.prototype.getWrapperElement = function() {
  var self = this;

  return $(self.shell.txtarea);
};

/*************************************************************************
 * set focus
 */
BaseEngine.prototype.focus = function() {
  var self = this;

  $(self.shell.txtarea).focus();
};

/*************************************************************************
 * register events to editor engine
 */
BaseEngine.prototype.on = function(eventName, func) {
  var self = this;

  // by default forward it to wrapper element
  return self.getWrapperElement().on(eventName, func);  
};

/*************************************************************************
 * set the size of the editor
 */
BaseEngine.prototype.setSize = function(width, height) {
  var self = this,
      elem = self.getWrapperElement();

  if (width) {
    elem.css("width", width);
  }

  if (height) {
    elem.css("height", height);
  }
};

/*************************************************************************
 * toggles fullscreen mode
 */
BaseEngine.prototype.toggleFullscreen = function() {
  var self = this;

  if(self.shell.container.is(".ui-natedit-fullscreen")) {
    self._previousHeight = self.getWrapperElement().outerHeight();
    $(window).off("resize.natedit");
    self.shell.form.find(".natEditBottomBar").hide();
    $("html").css("overflow-y", "initial");
    self.setSize(undefined,"100%");
  } else {
    $("html").css("overflow-y", "scroll");
    self.shell.form.find(".natEditBottomBar").show();
    self.setSize(undefined, self._previousHeight);
    if (self.shell.opts.autoMaxExpand) {
      self.shell.autoMaxExpand();
    }
  }
};

/*************************************************************************
 * get the size of the editor
 */
BaseEngine.prototype.getSize = function() {
  var self = this,
      elem = self.getWrapperElement();

  return {
    width: elem.width(),
    height: elem.height(),
  };
};

/*************************************************************************
 * called during save process
 */
BaseEngine.prototype.beforeSubmit = function() {
  return $.Deferred().resolve().promise();
};

/*************************************************************************
 * set the value of the editor
 */
BaseEngine.prototype.setValue = function(val) {
  var self = this,
      elem = self.getWrapperElement();

  elem.val(val);
};

/*************************************************************************
 * get the value of the editor
 */
BaseEngine.prototype.getValue = function() {
  var self = this,
      elem = self.getWrapperElement();

  return elem.val();
};

/*************************************************************************
 * replace text between two positions
 */
BaseEngine.prototype.replace = function(/*text, from, to*/) {
  /*var self = this,*/

  throw("not implemented: replace()");
};

/*************************************************************************
 * insert stuff at the given cursor position
 */
BaseEngine.prototype.insert = function(/* text */) {
  /*var self = this;*/

  throw("not implemented: insert()");
};

/*************************************************************************
 * remove the selected substring
 */
BaseEngine.prototype.remove = function() {
  /*var self = this;*/

  throw("not implemented: remove()");
};

/*************************************************************************
 * returns a Range object for the word at the cursor position 
 */
BaseEngine.prototype.getWordRange = function() {
  /*var self = this;*/

  throw("not implemented: getWord()");
};


/*************************************************************************
 * returns the current selection
 */
BaseEngine.prototype.getSelection = function() {
  /*var self = this;*/

  throw("not implemented: getSelection()");
};

/*************************************************************************
  * returns the currently selected lines
  */
BaseEngine.prototype.getSelectionLines = function() {
  /*var self = this;*/

  throw("not implemented: getSelectionLines()");
};

/*************************************************************************
 * set the selection
 */
BaseEngine.prototype.setSelectionRange = function(/*start, end*/) {
  /*var self = this;*/

  throw("not implemented: setSelectionRange()");
};

/*************************************************************************
 * set the caret position to a specific position. thats done by setting
 * the selection range to a single char at the given position
 */
BaseEngine.prototype.setCaretPosition = function(/*caretPos*/) {
  /*var self = this;*/

  throw("not implemented: setCaretPosition()");
};

/*************************************************************************
 * get the caret position 
 */
BaseEngine.prototype.getCaretPosition = function() {
  /*var self = this;*/

  throw("not implemented: getCaretPosition()");
};

/*************************************************************************
 * undo recent change
 */
BaseEngine.prototype.undo = function() {
  /*var self = this;*/

  throw("not implemented: undo()");
};

/*************************************************************************
 * returns true if changes have beem made
 */
BaseEngine.prototype.hasChanged = function() {
  /*var self = this;*/

  return true;
};

/*************************************************************************
 * redo recent change
 */
BaseEngine.prototype.redo = function() {
  /*var self = this;*/

  throw("not implemented: redo()");
};

/*****************************************************************************
 * handle toolbar action. returns the data to be used by the toolbar action.
 * return undef to intercept the shell's actions
 */
BaseEngine.prototype.handleToolbarAction = function(ui) {
  return ui.data();
};

/*************************************************************************
 * used for line oriented tags - like bulleted lists
 * if you have a multiline selection, the tagOpen/tagClose is added to each line
 * if there is no selection, select the entire current line
 * if there is a selection, select the entire line for each line selected
 */
BaseEngine.prototype.insertLineTag = function(/*markup*/) {
  /*var self = this;*/

  throw("not implemented: insertLineTag()");
};

/*************************************************************************
 * remove all formats in the selection
 */
BaseEngine.prototype.removeFormat = function() {
  var self = this,
      selection = self.getSelection(),
      result;

  if (typeof(selection) === 'undefined' || selection === '') {
    return;
  }

  //console.log("removeFormat on selection",selection);

  result = selection
    .replace(boldItalicRegExp, "$1")
    .replace(boldMonoRegExp, "$1")
    .replace(italicRegExp, "$1")
    .replace(boldRegExp, "$1")
    .replace(monoRegExp, "$1")
    .replace(colorTagRegExp, "");

  //console.log("... result=",result);

  self.remove();
  self.insert(result);
};

/*************************************************************************
 * apply foreground color
 */
BaseEngine.prototype.applyColor = function(color) {
  var self = this,
      markup = self.shell.opts.colorMarkup;

  markup[0] = '%'+ color.toUpperCase() + '%';

  self.insertTag(markup);
};

/*************************************************************************
 * insert a topic markup tag 
 */
BaseEngine.prototype.insertTag = function(/*markup*/) {
  /*var self = this;*/

  throw("not implemented: insertTag()");
};

/*************************************************************************
 * insert a TML table with the given header rows, rows and cols.
 * See Table.create()
 */
BaseEngine.prototype.insertTable = function(opts) {
  var self = this;
    cursor = self.getCaretPosition();

  opts.init = new foswiki.Table(self.getSelection());

  self.remove();
  self.insert(foswiki.Table.create(opts).toString());
  self.setCaretPosition(cursor);
};

/***************************************************************************
 * insert a link
 * opts is a hash of params that can have either of two forms:
 *
 * insert a link to a topic:
 * {
 *   web: "TheWeb",
 *   topic: "TheTopic",
 *   text: "the link text" (optional)
 * }
 *
 * insert an external link:
 * {
 *   url: "http://...",
 *   text: "the link text" (optional)
 * }
 *
 * insert an attachment link:
 * {
 *   web: "TheWeb",
 *   topic: "TheTopic",
 *   file: "TheAttachment.jpg",
 *   text: "the link text" (optional)
 * }
 */
BaseEngine.prototype.insertLink = function(opts) {
  var self = this, markup;

  //self.shell.log("insertLink opts=",opts);

  if (typeof(opts.url) !== 'undefined') {
    // external link
    if (typeof(opts.url) === 'undefined' || opts.url === '') {
      return; // nop
    }

    if (typeof(opts.text) !== 'undefined' && opts.text !== '') {
      markup = "[["+opts.url+"]["+opts.text+"]]";
    } else {
      markup = "[["+opts.url+"]]";
    }
  } else if (typeof(opts.file) !== 'undefined') {
    // attachment link

    if (typeof(opts.web) === 'undefined' || opts.web === '' || 
        typeof(opts.topic) === 'undefined' || opts.topic === '') {
      return; // nop
    }

    if (opts.web === self.shell.opts.web && opts.topic === self.shell.opts.topic) {
      markup = "[[%ATTACHURLPATH%/"+opts.file+"]";
    } else {
      markup = "[[%PUBURLPATH%/"+opts.web+"/"+opts.topic+"/"+opts.file+"]";
    }

    if (typeof(opts.text) !== 'undefined' && opts.text !== '') {
      markup += "["+opts.text+"]";
    } else {
      markup += "["+opts.file+"]";
    }
    markup += "]";

  } else {
    // wiki link
    
    if (typeof(opts.topic) === 'undefined' || opts.topic === '') {
      return; // nop
    }

    $.get(foswiki.getScriptUrl("rest", "NatEditPlugin", "topicTitle"), {
      topic : opts.web + "." + opts.topic
    }).done(function(data) {
      console.log("topicTitle=",data);
    });

    if (opts.web === self.shell.opts.web) {
      markup = "[["+opts.topic+"]";
    } else {
      markup = "[["+opts.web+"."+opts.topic+"]";
    }

    if (typeof(opts.text) !== 'undefined' && opts.text !== '') {
      markup += "["+opts.text+"]";
    } 
    markup += "]";
  }

  self.remove();
  self.insert(markup);
};

/***************************************************************************
 * insert an image
 *
 * opts: {
 *   web: "TheWeb",
 *   topic: "TheTopic",
 *   file: "TheAttachment.jpg",
 *   width: number,
 *   height: number,
 *   align: "left" or "right" or "center"
 * }
 */
BaseEngine.prototype.insertImage = function(opts) {
  var self = this, markup;

  opts.prefix = opts.prefix === undefined ? "": opts.prefix;
  opts.suffix = opts.suffix === undefined ? "": opts.suffix;


  markup = opts.prefix + '%IMAGE{"'+opts.file+'"';
  if (opts.web !== self.shell.opts.web || opts.topic !== self.shell.opts.topic) {
    markup += ' topic="';
    if (opts.web !== self.shell.opts.web) {
      markup += opts.web+'.';
    }
    markup += opts.topic+'"';
  }

  if (opts.width && !opts.height) {
    markup += ' size="'+opts.width+'"';
  } else if (!opts.width && opts.height) {
    markup += ' size="'+opts.height+'"';
  } else if (opts.width || opts.height) {
    markup += ' size="'+opts.width+'x'+opts.height+'"';
  }

  if (opts.align) {
    markup += ' align="'+opts.align+'"';
  }

  if (opts.caption) {
    markup += ' caption="'+opts.caption+'"';
  }

  if (opts.type) {
    markup += ' type="'+opts.type+'"';
  }

  if (opts.id) {
    markup += ' id="'+opts.id+'"';
  }

  if (opts.classList) {
    markup += ' class="'+opts.classList+'"';
  }

  markup += '}%' + opts.suffix;

  self.remove();
  self.insert(markup);
};

/*****************************************************************************
 * get the coordinates of the cursor
 */
BaseEngine.prototype.getCursorCoords = function(/*include*/) {
 /*var self = this;*/

  throw("not implemented: getCursorCoords()");
};

/*****************************************************************************
 * get text from line start to cursor; include -> character at cursor pos 
 */
BaseEngine.prototype.getBeforeCursor = function(/*include*/) {
 /*var self = this;*/

  throw("not implemented: getBeforeCursor()");
};

/*****************************************************************************
 * get text from cursor to line end; include -> character at cursor pos
 */
BaseEngine.prototype.getAfterCursor = function(/*include*/) {
 /*var self = this;*/

  throw("not implemented: getAfterCursor()");
};

/*****************************************************************************
 * parse the currently selected image into a data hash
 */
BaseEngine.prototype.getImageData = function(data) {
  var self = this,
      selection = self.getSelection(),
      elem, urlData, webTopic, params,
      excludePattern = new RegExp("image(Simple|Float|Thumb|Frame|Plain)(_left|_right|_none)?");

  data = $.extend({
    web: self.shell.opts.web,
    topic: self.shell.opts.topic,
  }, data);

  if (selection.match(/^(\s*)(<img.*>)(\s*)$/)) {
    data.prefix = RegExp.$1;
    data.suffix = RegExp.$3;
    elem = $(RegExp.$2);
    urlData = self.shell.parseUrl(elem.attr("src"));

    data.width = elem.attr("width") || data.width;
    data.height = elem.attr("height") || data.height;
    data.align = elem.align("align") || data.align;
    data.type = elem.data("type");
    data.caption = elem.data("caption");
    data.web = urlData.web || data.web || self.shell.opts.web;
    data.topic = urlData.topic || data.topic || self.shell.opts.topic;
    data.file = urlData.file;

    data.classList = urlData.attr("class").split(/\s*,\s*/).filter(function(item) {
      return !excludePattern.test(item);
    });
  } else if (selection.match(/^(\s*)%IMAGE\{(.*?)\}%(\s*)$/)) {
    data.prefix = RegExp.$1;
    data.suffix = RegExp.$3;
    params = new foswiki.Attrs(RegExp.$2);
    params.keys().filter(key => key[0] !== '_').forEach(function(key) {
      data[key] = params.get(key);
    });

    data.file = params.get("_default");
    data.classList = params.remove("class");
  }

  webTopic = foswiki.normalizeWebTopicName(data.web, data.topic);
  data.web = webTopic[0];
  data.topic = webTopic[1];
  if (data.width === undefined && data.height === undefined && data.size) {
    if (/^(\d+)x(\d+)/.test(data.size)) {
      data.width = RegExp.$1;
      data.height = RegExp.$2;
    } else {
      data.width = data.size;
    }
  }

  //console.log("data=",data);
  return data;
};

/*****************************************************************************
 * search & replace a term in the textarea
 */
BaseEngine.prototype.searchReplace = function(/*term, text, ignoreCase*/) {
  /*var self = this;*/

  throw("not implemented: searchReplace()");
};

})(jQuery);
