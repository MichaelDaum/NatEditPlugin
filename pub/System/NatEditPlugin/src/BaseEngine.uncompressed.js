/*
 * jQuery NatEdit: base engine
 *
 * Copyright (c) 2015-2021 Michael Daum http://michaeldaumconsulting.com
 *
 * Licensed under the GPL license http://www.gnu.org/licenses/gpl.html
 *
 */
"use strict";

/* export */
var BaseEngine;

(function($) {

var italicRegExp     = /\_(\S+|(?:\S.*?\S))\_(?=$|[\s,.;:!?\)])/g,
    boldRegExp       = /\*(\S+|(?:\S.*?\S))\*(?=$|[\s,.;:!?\)])/g,
    boldItalicRegExp = /__(\S+|(?:\S.*?\S))__(?=$|[\s,.;:!?\)])/g,
    monoRegExp       = /\=(\S+|(?:\S.*?\S))\=(?=$|[\s,.;:!?\)])/g,
    boldMonoRegExp   = /\=\=(\S+|(?:\S.*?\S))\=\=(?=$|[\s,.;:!?\)])/g,
    colorTagRegExp   = /\%(AQUA|BLACK|BLUE|BROWN|GRAY|GREEN|LIME|MAROON|NAVY|OLIVE|ORANGE|PINK|PURPLE|RED|SILVER|TEAL|WHITE|YELLOW)\%\s*|\s*\%ENDCOLOR\%/g;


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
  // nop
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
BaseEngine.prototype.replace = function(text, from, to) {
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
 * insert a TML table with the given header rows, rows and cols
 * opts: 
 * {
 *   heads: integer, // number of header rows
 *   rows: integer, // number of rows
 *   cols: integer, // number of columns
 * }
 */
BaseEngine.prototype.insertTable = function(opts) {
  var self = this, table;

  if (typeof(opts.heads) === 'undefined') {
    opts.heads = 0;
  }
  if (typeof(opts.rows) === 'undefined') {
    opts.rows = 0;
  }
  if (typeof(opts.cols) === 'undefined') {
    opts.cols = 0;
  }

  opts.init = self.getTableSelection();
  table = self.generateTMLTable(opts);

  self.remove();
  self.insert(table);
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

  self.shell.log("insertImage opts=",opts);

  markup = '%IMAGE{"'+opts.file+'"';
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

  markup += '}%';

  self.remove();
  self.insert(markup);
};

/*****************************************************************************
 * get the coordinates of the cursor
 */
BaseEngine.prototype.getCursorCoords = function(include) {
 /*var self = this;*/

  throw("not implemented: getCursorCoords()");
};

/*****************************************************************************
 * get text from line start to cursor; include -> character at cursor pos 
 */
BaseEngine.prototype.getBeforeCursor = function(include) {
 /*var self = this;*/

  throw("not implemented: getBeforeCursor()");
};

/*****************************************************************************
 * get text from cursor to line end; include -> character at cursor pos
 */
BaseEngine.prototype.getAfterCursor = function(include) {
 /*var self = this;*/

  throw("not implemented: getAfterCursor()");
};


/*****************************************************************************
 * parse the current selection into a two-dimensional array
 * to be used initializing a table. rows are separated by \n, columns by whitespace
 */
BaseEngine.prototype.getTableSelection = function() {
  var self = this,
      selection = self.getSelection().replace(/^\s+|\s+$/g, ""),
      result = [],
      rows = selection.split(/\n/),
      i;

  for (i = 0; i < rows.length; i++) {
    result.push(rows[i].split(/\s+/));
  }

  return result;
};

/*****************************************************************************
 * parse the currently selected image into a data hash
 */
BaseEngine.prototype.getImageData = function(data) {
  var self = this,
      data = $.extend({
        web: self.shell.opts.web,
        topic: self.shell.opts.topic,
      }, data),
      selection = self.getSelection(),
      elem, urlData;

  if (selection.match(/^\s*(<img.*>)\s*$/)) {
    elem = $(RegExp.$1);
    urlData = self.shell.parseUrl(elem.attr("src"));

    data.width = elem.attr("width") || data.width;
    data.height = elem.attr("height") || data.height;
    data.web = urlData.web || data.web || self.shell.opts.web;
    data.topic = urlData.topic || data.topic || self.shell.opts.topic;
    data.file = urlData.file;
  } else if (selection.match(/^\s*%IMAGE\{"(.*?)"(?:.*?topic="(?:([^\s\.]+)\.)?(.*?)")?.*?\}%\s*$/)) {
    // SMELL: nukes custom params
    //self.log("image link");
    data.web = RegExp.$2 || data.web;
    data.topic = RegExp.$3 || data.topic;
    data.file = RegExp.$1;
  }

  return data;
};

/*****************************************************************************
 * generate a tml table
 * opts: 
 * {
 *   heads: integer, // number of header rows
 *   rows: integer, // number of rows
 *   cols: integer, // number of columns
 *   init: two-dim array of initial content 
 * }
 */
BaseEngine.prototype.generateTMLTable = function(opts) {
  var result = "", i, j, cell;

  for (i = 0; i < opts.heads; i++) {
    result += '|';
    for (j = 0; j < opts.cols; j++) {
      result += ' *head* |';
    }
    result += "\n";
  }
  for (i = 0; i < opts.rows; i++) {
    result += '|';
    for (j = 0; j < opts.cols; j++) {
      if (typeof(opts.init) !== 'undefined' && typeof(opts.init[i]) !== 'undefined') {
        cell = opts.init[i][j];
      }
      cell = cell || 'data';
      result += ' '+cell+' |';
    }
    result += "\n";
  }

  return result;
};

/*****************************************************************************
 * generate an html table, see generateTMLTable 
 */
BaseEngine.prototype.generateHTMLTable = function(opts) {
  var result = "", i, j, cell;

  result += "<table>";

  if (opts.heads) {
    result += "<thead>";
    for (i = 0; i < opts.heads; i++) {
      result += "<tr>";
      for (j = 0; j < opts.cols; j++) {
        result += "<th>head</th>";
      }
      result += "</tr>";
    }
    result += "</thead>";
  }

  result += "<tbody>";
  for (i = 0; i < opts.rows; i++) {
    result += "<tr>";
    for (j = 0; j < opts.cols; j++) {
      if (typeof(opts.init) !== 'undefined' && typeof(opts.init[i]) !== 'undefined') {
        cell = opts.init[i][j];
      }
      cell = cell || 'data';
      result += '<td>'+cell+'</td>';
    }
    result += "</tr>";
  }

  result += "</table>";

  return result;
};

/*****************************************************************************
 * search & replace a term in the textarea
 */
BaseEngine.prototype.searchReplace = function(/*term, text, ignoreCase*/) {
  /*var self = this;*/

  throw("not implemented: searchReplace()");
};

})(jQuery);
