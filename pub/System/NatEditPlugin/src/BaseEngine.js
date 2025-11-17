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
    formatMarkupRegExp = /<\/?(del|s|ins|ul|i|strong|b|font|sup|sub)[^>]*>/g,
    colorTagRegExp   = /%(AQUA|BLACK|BLUE|BROWN|GRAY|GREEN|LIME|MAROON|NAVY|OLIVE|ORANGE|PINK|PURPLE|RED|SILVER|TEAL|WHITE|YELLOW)%\s*|\s*%ENDCOLOR%/g,
    urlRegExp = "(?:file|ftp|gopher|https?|irc|mailto|news|nntp|telnet|webdav|tel|sip|edit)://[^\\s]+?";


/*****************************************************************************
 * constructor
 */
BaseEngine = function() {
  var self = this;

  self.id = "BaseEngine";
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
    let webTopic = self.shell.formManager.getWebTopic();

    data.files.forEach(function(file) {
      // SMELL: allow other files as well
      if (file.type && file.type.indexOf("image/") > -1) {
        self.insertImage({
          web: webTopic[0],
          topic: webTopic[1],
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
    //elem.css("width", width);
    elem.width(width);
  }

  if (height) {
    //elem.css("height", height);
    elem.height(width);
  }

  return self.getSize();
};

/*************************************************************************
 * toggles fullscreen mode
 */
BaseEngine.prototype.toggleFullscreen = function() {
  var self = this;

  if(self.shell.container.is(".ui-natedit-fullscreen")) {
    self._origSize = self.getSize();
    $(window).off("resize.natedit");
    self.shell.form.find(".natEditBottomBar").hide();
    $("html").css("overflow-y", "initial");
    self.setSize(undefined,"100%");
  } else {
    $("html").css("overflow-y", "scroll");
    self.shell.form.find(".natEditBottomBar").show();
    if (self.shell.opts.autoMaxExpand) {
      self.shell.autoMaxExpand();
    } else {
      self.setSize(undefined, self._origSize.height);
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
 * get content of editor
 */
BaseEngine.prototype.getContent = function() {
  var self = this,
      dfd = $.Deferred();

  return dfd.resolve(self.getValue()).promise();
};

/*************************************************************************
 * process completion for a given string
 */
BaseEngine.prototype.execCompletion = function(/*completion, string*/) {
  /*var self = this,*/

  throw("not implemented: execCompletion()");
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

  result = selection
    .replace(boldItalicRegExp, "$1")
    .replace(boldMonoRegExp, "$1")
    .replace(italicRegExp, "$1")
    .replace(boldRegExp, "$1")
    .replace(monoRegExp, "$1")
    .replace(colorTagRegExp, "")
    .replace(formatMarkupRegExp, "")
    .replace(/\xad/g, ""); // non printable such as &shy;

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

/*************************************************************************
 * parse the current selection and return the data to be used generating the tmpl
 */
BaseEngine.prototype.parseLink = function(text) {
  var self = this, data,
    webTopic = self.shell.formManager.getWebTopic();

  if (typeof(text) === 'undefined') {
    text = self.getSelection();
  }


  data = {
    selection: text,
    web: webTopic[0],
    topic: webTopic[1],
    file: '',
    url: '',
    type: 'topic',
  };

  // initialize from text
  if (text.match(/\s*\[\[(.*?)\]\]\s*/)) {
    text = RegExp.$1;
    //console.log("brackets link, text=",text);
    if (text.match("^("+urlRegExp+")(?:\\]\\[(.*))?$")) {
      //console.log("external link");
      data.url = RegExp.$1;
      data.selection = RegExp.$2 || '';
      data.type = 'external';
    } else if (text.match(/^(?:%ATTACHURL(?:PATH)?%\/)(.*?)(?:\]\[(.*))?$/)) {
      //console.log("this attachment link");     
      data.file = RegExp.$1;
      data.selection = RegExp.$2;
      data.type = "attachment";
    } else if (text.match(/^(?:%PUBURL(?:PATH)?%\/)(.*)\/(.*?)\/(.*?)(?:\]\[(.*))?$/)) {
      //console.log("other topic attachment link");     
      data.web = RegExp.$1;
      data.topic = RegExp.$2;
      data.file = RegExp.$3;
      data.selection = RegExp.$4;
      data.type = "attachment";
    } else if (text.match(/^(?:(.*)\.)?(.*?)(?:\]\[(.*))?$/)) {
      //console.log("topic link");
      data.web = RegExp.$1 || data.web;
      data.topic = RegExp.$2;
      data.selection = RegExp.$3 || '';
    } else {
      //console.log("some link");
      data.topic = text;
      data.selection = '';
    }
  } else if (text.match("^ *"+urlRegExp)) {
    //console.log("no brackets external link");
    data.url = text;
    data.selection = '';
    data.type = "external";
  } else if (text.match(/^\s*%IMAGE\{(.*?)\}%\s*$/)) {
    let params = new foswiki.Attrs(RegExp.$1);
    //console.log("image link",params);
    params.keys().filter(key => key[0] !== '_').forEach(function(key) {
      data[key] = params.get(key);
    });
    //data.file = params.get("_default");
    data.selection = '';
    data.type = "attachment";
  } else {
    if (text.match(/^\s*([A-Z][^\s.]*)\.(A-Z.*?)\s*$/)) {
      //console.log("topic link");
      data.web = RegExp.$1 || data.web;
      data.topic = RegExp.$2;
      data.selection = '';
      data.type = "topic";
    } else {
      //console.log("some text, not a link");
    }
  }

  return data;
};

/***************************************************************************
 * insert a link
 * opts is a hash of params that can have either the following forms:
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
  var self = this, markup,
    natEditOpts = foswiki.getPreference("NatEditPlugin"),
    webTopic = self.shell.formManager.getWebTopic();

  //self.shell.log("insertLink opts=",opts);

  return $.Deferred(function(dfd) {
    if (typeof(opts.url) !== 'undefined') {
      // external link
      if (typeof(opts.url) === 'undefined' || opts.url === '') {
        dfd.reject();
        return; // nop
      }

      if (typeof(opts.text) !== 'undefined' && opts.text !== '') {
        markup = "[["+opts.url+"]["+opts.text+"]]";
      } else {
        markup = "[["+opts.url+"]]";
      }
    } else if (typeof(opts.file) !== 'undefined') {
      // attachment link

      if (!opts.text && natEditOpts.TopicInteractionPluginEnabled) {
        $.post(foswiki.getScriptUrlPath("rest", "TopicInteractionPlugin", "getlink"), {
          id: foswiki.getUniqueID(),
          topic: opts.web+"."+opts.topic,
          filename: opts.file
        }).then(function(data) {
          var response = JSON.parse(data);
          self.remove();
          self.insert(response.result.tml);
          dfd.resolve();
        });
        return;
      } 
      
      if (typeof(opts.web) === 'undefined' || opts.web === '' || 
          typeof(opts.topic) === 'undefined' || opts.topic === '') {
        dfd.reject();
        return; // nop
      }

      if (opts.web === webTopic[0] && opts.topic === webTopic[1]) {
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
        dfd.reject();
        return; // nop
      }

      if (opts.web === webTopic[0]) {
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

    dfd.resolve();
  }).promise();
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
  var self = this, markup,
    webTopic = self.shell.formManager.getWebTopic();

  opts.prefix = opts.prefix === undefined ? "": opts.prefix;
  opts.suffix = opts.suffix === undefined ? "": opts.suffix;

  markup = opts.prefix + '%IMAGE{"'+opts.file+'"';
  if (opts.web !== webTopic[0] || opts.topic !== webTopic[1]) {
    markup += ' topic="';
    if (opts.web !== webTopic[0]) {
      markup += opts.web+'.';
    }
    markup += opts.topic+'"';
  }

  if (opts.width) {
    markup += ' width="'+opts.width+'"';
  }

  if (opts.height) {
    markup += ' height="'+opts.height+'"';
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

  if (opts.href) {
    markup += ' href="'+opts.href+'"';
  }

  markup += '}%' + opts.suffix;

  self.remove();
  self.insert(markup);
};

/*****************************************************************************
 * 
 */
BaseEngine.prototype.registerBlob = function(info) {
  var self = this;

  return $.Deferred().resolve(info.fileName).promise();
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
      excludePattern = new RegExp("image(Simple|Float|Thumb|Frame|Plain)(_left|_right|_none)?"),
      webTopic = self.shell.formManager.getWebTopic();

  data = $.extend({
    web: webTopic[0],
    topic: webTopic[1],
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
    data.web = urlData.web || data.web || webTopic[0];
    data.topic = urlData.topic || data.topic || webTopic[1];
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
 * sort the selected lines
 */
BaseEngine.prototype.sortSelection = function(dir) {
  var self = this,
    selection, lines, ignored, isNumeric = true, value,
    line, prefix, i;

  //self.shell.log("sortSelection ", dir);

  selection = self.getSelectionLines();
  //console.log("selection=",selection);
  selection = selection.split(/\r?\n/);

  lines = [];
  ignored = [];
  for (i = 0; i < selection.length; i++) {
    line = selection[i];
    // SMELL: sorting lists needs a real list parser
    if (line.match(/^((?: {3})+(?:[AaIi]\.|\d\.?|\*) | *\|)(.*)$/)) {
      prefix = RegExp.$1;
      line = RegExp.$2;
    } else {
      prefix = "";
    }

    value = parseFloat(line);
    if (isNaN(value)) {
      isNumeric = false;
      value = line;
    }

    if (line.match(/^\s*$/)) {
      ignored.push({
        pos: i,
        prefix: prefix,
        value: value,
        line: line
      });
    } else {
      lines.push({
        pos: i,
        prefix: prefix,
        line: line,
        value: value
      });
    }
  }

  //self.shell.log("isNumeric=",isNumeric);
  //self.shell.log("sorting lines",lines);

  lines = lines.sort(function(a, b) {
    var valA = a.value, valB = b.value;

    if (isNumeric) {
      return valA - valB;
    } else {
      return valA < valB ? -1 : valA > valB ? 1: 0;
    }
  });

  if (dir === "desc") {
    lines = lines.reverse();
  }

  $.map(ignored, function(item) {
    lines.splice(item.pos, 0, item);
  });

  selection = [];
  $.map(lines, function(item) {
    selection.push(item.prefix+item.line);
  });
  selection = selection.join("\n");

  //self.shell.log("result=\n'"+selection+"'");

  self.remove();
  self.insert(selection);
};

/*****************************************************************************
 * search & replace a term in the textarea
 */
BaseEngine.prototype.searchReplace = function(/*term, text, ignoreCase*/) {
  /*var self = this;*/

  throw("not implemented: searchReplace()");
};

})(jQuery);
