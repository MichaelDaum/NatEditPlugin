/*
 * NatEdit: tinymce engine
 *
 * Copyright (c) 2015-2025 Michael Daum http://michaeldaumconsulting.com
 *
 * Licensed under the GPL license http://www.gnu.org/licenses/gpl.html
 *
 */

/*global BaseEngine:false tinymce:false*/

"use strict";
(function($) {

/*****************************************************************************
 * constructor
 */

TinyMCEEngine.prototype = Object.create(BaseEngine.prototype);
TinyMCEEngine.prototype.constructor = TinyMCEEngine;
TinyMCEEngine.prototype.parent = BaseEngine.prototype;

function TinyMCEEngine(shell, opts) {
  var self = this,
      wikiName = foswiki.getPreference("WIKINAME"),
      wikiUserName = foswiki.getPreference("USERSWEB") + "." + wikiName,
      wikiUserNameUrl = foswiki.getScriptUrlPath("view", foswiki.getPreference("USERSWEB"), wikiName),
      serverTime = foswiki.getPreference("SERVERTIME"),
      pubUrlPath = foswiki.getPreference("PUBURLPATH");

  self.shell = shell;
  self.id = "TinyMCEEngine";
  self.type = "wysiwyg";
  self.opts = $.extend({}, TinyMCEEngine.defaults, self.shell.opts.tinymce, opts);
  self.opts.tinymce.selector = "#"+self.shell.id+" textarea";
  self.opts.tinymce.content_css = foswiki.getPreference("NatEditPlugin").ContentCSS;
  self.opts.tinymce.document_base_url = foswiki.getPreference("URLHOST");
  self.opts.tinymce.urlconverter_callback = function(url, node, onSave) {
    return self.convertURI(url, node, onSave);
  };

  self.opts.clearMarkup = ['', `<img src="${pubUrlPath}/System/NatEditPlugin/images/clear-float.svg" class="WYSIWYG_CLEAR" data-mce-resize="false" data-mce-placeholder="1" />`, ''];
  self.opts.signatureMarkup = ['-- ', `<a class='TMLlink' href="${wikiUserNameUrl}" data-topic="${wikiUserName}">${wikiName}</a>`, ` - ${serverTime}`];
  self.opts.horizRulerMarkup = ['', '<hr>', ''];

  $.extend(self.shell.opts, self.opts.natedit);
}

/*************************************************************************
 * init tinymce instance 
 */
TinyMCEEngine.prototype.init = function() {
  var self = this,
      pubUrlPath = foswiki.getPreference("PUBURLPATH"),
      editorPath = pubUrlPath+'/System/NatEditPlugin/lib/tinymce',
      dfd = $.Deferred();

  if (self.isInited) {
    self.shell.log("... engine already inited");
    return dfd.resolve();
  }
  self.isInited = true;

  $.when(
    self.parent.init(),
    self.shell.getScript(editorPath+'/tinymce.min.js')
  ).done(function() {

    /* natedit-image plugin */
    tinymce.PluginManager.add("natedit-image", function(editor) {
      editor.ui.registry.addMenuItem('image', {
        icon: 'image',
        text: 'Image ...',
        onAction: function (ev) {
          self.shell.imageDialog();
        }
      });

      editor.addCommand('mceImage', function() {
        self.shell.imageDialog();
      });

      editor.ui.registry.addContextMenu('image', {
        update: function (elem) {
          return elem.nodeName === 'IMG' ? 'image': '';
        }
      });
    });

    /* natedit-link */
    tinymce.PluginManager.add("natedit-link", function(editor) {
      editor.ui.registry.addMenuItem('link', {
        icon: 'link',
        text: 'Link ...',
        onAction: function (api) {
          self.shell.linkDialog(self.parseLink());
        }
      });
      editor.ui.registry.addMenuItem("unlink", {
        icon: 'unlink',
        text: 'Remove link',
        onAction: function (api) {
          editor.execCommand('unlink');
        }
      });
      editor.addCommand('mceLink', function() {
        //TODO: parseNode
        self.shell.linkDialog(self.getSelection());
      });

      editor.ui.registry.addContextMenu('link', {
        update: function (elem) {
          return elem.nodeName === 'A' ? 'link unlink': '';
        }
      });
    });

    self.opts.tinymce.init_instance_callback = function(editor) {
      var cols = parseInt(self.shell.txtarea.attr("cols"), 10),
          rows = parseInt(self.shell.txtarea.attr("rows"), 10),
          lineHeight = parseInt(self.shell.txtarea.css("line-height"), 10);

      if (window.darkMode && window.darkMode.isActive) {
        //console.log("propagating darkmode to iframe");
        $(self.editor.contentAreaContainer)
          .children("iframe")
          .contents()
          .find("html:first")
          .attr("data-theme", "dark");
      }

      // only set the width if specified by a cols attribute and not any css styled width
      if (typeof(cols) !== 'undefined' && cols > 0) {
        self.setSize(`${cols}ch`);
      }
      if (typeof(rows) !== 'undefined' && rows > 0) {
        self.setSize(null, rows*lineHeight + 20); // magic 20 to spare the scrollbar
      }

      self.updateContent().then(function() {
        dfd.resolve();
      }, function() {
        dfd.reject();
      });
    };

    self.opts.tinymce.setup = function(editor) {
      self.shell.log("setup instance");
      self.editor = editor;

      if (self.opts.debug) {
        window.editor = editor; // playground
      }

      self.on("keyup", function(ev) {
        return self.shell.handleKeyUp(ev);
      });
      self.on("keydown", function(ev) {
        return self.shell.handleKeyDown(ev);
      });
    };

    // finally
    tinymce.init(self.opts.tinymce);

  }).fail(function() {
    dfd.reject();
    alert("failed to load tinymce.js");
  });

  return dfd.promise();
};

/*************************************************************************
*/
TinyMCEEngine.prototype.convertURI = function(url, node, onSave) {
  var self = this;

  return url.replace(/%[A-Za-z0-9_]+%/g, function(m) {
    var r = foswiki.getPreference(m);
    return (r && r !== '') ? r : m;
  });
};

/*************************************************************************
 * intercept save process
 */
TinyMCEEngine.prototype.beforeSubmit = function(action) {
  var self = this, 
    dfd = $.Deferred(),
    val = self.getValue();

  if (action !== 'cancel') {
    self.shell.txtarea.val(val);
  }

  self.shell.setTextFormat("html");
  return dfd.resolve().promise();
};

/*************************************************************************
 * update content from textarea
 */
TinyMCEEngine.prototype.updateContent = function() {
  var self = this,
    val = self.shell.txtarea.val();

  return self.setContent(val);
};

/*************************************************************************
 * set value and convert it to html
 */
TinyMCEEngine.prototype.setContent = function(val) {
  var self = this,
    dfd = $.Deferred();

  /*
  return self.shell.tml2html(tml).then(function(html) {
    self.setValue(html);
  });
  */

  if (val === "") {
    self.editor.setContent("");
    self.editor.undoManager.clear(); 
    $(window).trigger("resize");
    dfd.resolve(self);
  } else {
    self.shell.tml2html(val)
      .then(function(data) {
        self.editor.setContent(data);
        self.editor.undoManager.clear(); // don't go beyond this level
        $(window).trigger("resize");
        dfd.resolve(self);
      }, function() {
        dfd.reject();
        self.shell.formManager.showMessage("error", "Error calling tml2html"); 
      });
  }

  return dfd.promise();
};

/*************************************************************************
 * get value and convert it to tml
 */
TinyMCEEngine.prototype.getContent = function() {
  var self = this;

  return self.shell.html2tml(self.getValue());
};

/*************************************************************************
 * init gui
 */
TinyMCEEngine.prototype.initGui = function() {
  var self = this;

  self.parent.initGui.call(self);

  // flag to container ... smell: is this really needed?
  self.shell.container.addClass("ui-natedit-wysiwyg-enabled");

  // highlight buttons on toolbar when the cursor moves into a format
  $.each(self.opts.tinymce.formats, function(formatName) {
    self.editor.formatter.formatChanged(formatName, function(state, args) {

      $.each(self.editor.formatter.get(formatName), function(i, format) {
        if (state) {
          self.shell.toolbar.find(format.toolbar).addClass("ui-natedit-active");
        } else {
          self.shell.toolbar.find(format.toolbar).removeClass("ui-natedit-active");
        }
      });

      // lists
      self.shell.toolbar.find(".ui-natedit-numbered").removeClass("ui-natedit-active");
      self.shell.toolbar.find(".ui-natedit-bullet").removeClass("ui-natedit-active");

      $.each(args.parents, function(i, prt) {
        var node = $(prt), parentNode = $(args.parents[i+1]);

        if (node.is('li')) {
          if (parentNode.is("ol")) {
            self.shell.toolbar.find(".ui-natedit-numbered").addClass("ui-natedit-active");
          } else {
            self.shell.toolbar.find(".ui-natedit-bullet").addClass("ui-natedit-active");
          }
        }
      });

    });
  });

  // listen to change events and update stuff
  self.editor.on("change", function() {
    self.updateUndoButtons();
  });

  /*
  self.editor.on("click", function() {
    self.editor.getBody().focus();
  });
  */

  self.updateUndoButtons();
};

/*************************************************************************
 * register events to editor engine
 */
TinyMCEEngine.prototype.updateUndoButtons = function() {
  var self = this,
    undoButton = self.shell.container.find(".ui-natedit-undo"),
    redoButton = self.shell.container.find(".ui-natedit-redo"),
    undoManager = self.editor.undoManager;

  if (undoManager.hasUndo()) {
    undoButton.button("enable");
  } else {
    undoButton.button("disable");
  }

  if (undoManager.hasRedo()) {
    redoButton.button("enable");
  } else {
    redoButton.button("disable");
  }
};

/*************************************************************************
 * register events to editor engine
 */
TinyMCEEngine.prototype.on = function(eventName, func) {
  var self = this;

  self.editor.on(eventName, func);  
  return self.editor;
};

/*************************************************************************
 * handle toolbar actions
 */
TinyMCEEngine.prototype.handleToolbarAction = function(ui) {
  var self = this,
      data = $.extend({}, ui.data()),
      markup = data.markup;

  if (typeof(markup) !== 'undefined') {
    if (markup === 'numberedListMarkup') {
      self.shell.toolbar.find(".ui-natedit-numbered").addClass("ui-natedit-active");
      self.shell.toolbar.find(".ui-natedit-bullet").removeClass("ui-natedit-active");
      self.editor.execCommand("InsertOrderedList");
      return;
    } 

    if (markup === 'bulletListMarkup') {
      self.shell.toolbar.find(".ui-natedit-numbered").removeClass("ui-natedit-active");
      self.shell.toolbar.find(".ui-natedit-bullet").addClass("ui-natedit-active");
      self.editor.execCommand("InsertUnorderedList");
      return;
    } 

    if (markup === 'indentMarkup') {
      self.editor.execCommand("indent");
      return;
    }

    if (markup === 'outdentMarkup') {
      self.editor.execCommand("outdent");
      return;
    }

    if (typeof(self.opts[markup]) !== 'undefined') {
      delete data.markup;
      data.value = self.opts[markup];
    } else if (self.editor.formatter.get(markup)) {
      delete data.markup;
      self.editor.formatter.toggle(markup);
    }
  }

  return data;
};

/*************************************************************************
 * insert stuff at the given cursor position
 */
TinyMCEEngine.prototype.insert = function(text) {
  var self = this;

  self.editor.insertContent(text);
};

/*************************************************************************
 * append content to the end
 */
TinyMCEEngine.prototype.append = function(text) {
  var self = this,
    editor = self.editor;

  editor.selection.setCursorLocation(editor.getBody(), editor.getBody().children.length);
  self.insert(text);
};

/*****************************************************************************
 * parse the currently selected image into a data hash
 */
TinyMCEEngine.prototype.getImageData = function(data) {
  var self = this,
      imgElem = self.editor.selection.getNode(),
      imgData = $(imgElem).data(),
      urlData,
      excludePattern = new RegExp("image(Simple|Float|Thumb|Frame|Plain)(_left|_right|_none|_center)?");


  //console.log("called getImageData()",data);
  data = data || {};

  if (imgElem && imgElem.nodeName === 'IMG') {
    urlData = imgData.file || imgElem.src;
    urlData = self.shell.parseUrl(urlData);

    data.web = imgData.web || urlData.web || data.web;
    data.topic = imgData.topic || urlData.topic || data.topic;
    const webTopic = foswiki.normalizeWebTopicName(data.web, data.topic);
    data.web = webTopic[0];
    data.topic = webTopic[1];
    data.file = urlData.file || data.file;

    //data.src = imgElem.src;
    data.width = imgElem.width || data.width; 
    data.height = imgElem.height || data.height; 
    data.align = imgElem.align || data.align; 
    data.type = imgData.type;
    data.href = imgData.href;
    data.caption = imgData.caption;
    data.id = imgElem.id;
    data.align = imgElem.align;
    data.type = imgData.type;
    data.caption = imgData.caption || '';

    data.classList = Array.from(imgElem.classList).filter(function(item) {
      return !excludePattern.test(item);
    });

  }
  //console.log("... data=",data);

  return data;
};


/*************************************************************************
 * parse the current selection and return the data to be used generating the tmpl
 */
TinyMCEEngine.prototype.parseLink = function(text) {
  var self = this, 
    node = self.editor.selection.getNode(),
    webTopic = node.getAttribute("data-topic"),
    currWebTopic = self.shell.formManager.getWebTopic(),
    data;


  if (typeof(text) === 'undefined') {
    text = self.getSelection();
  }
  //console.log("called parseLink()",text);

  data = {
    selection: text,
    web: currWebTopic[0],
    topic: currWebTopic[1],
    type: 'topic',
  };

  if (webTopic) {
    webTopic = foswiki.normalizeWebTopicName(data.web, webTopic);
    data.web = webTopic[0];
    data.topic = webTopic[1];
    data.type = "topic";
  } else if (node.nodeName === 'A') {
    data.url = node.getAttribute("href");
    data.type = "external";
    if (data.url.match(/^(?:%ATTACHURL(?:PATH)?%\/)(.*)$/)) {
      data.file = RegExp.$1;
      data.type = "attachment";
    } else if (data.url.match(/^(?:%PUBURL(?:PATH)?%\/)(.*)\/(.*?)\/(.*?)$/)) {
      data.web = RegExp.$1;
      data.topic = RegExp.$2;
      data.file = RegExp.$3;
      data.type = "attachment";
    }
  }

  if (data.selection === data.topic) {
    data.selection = ""
  }

  return data;
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
TinyMCEEngine.prototype.insertImage = function(opts) {
  var self = this,
      elem,
      imgRegex = /\.(avif|jpe?g|gif|png|bmp|webp|svg|ico|tiff?|xcf|psd|heic|heif)$/i,
      webTopic = self.shell.formManager.getWebTopic();

  opts.web = opts.web || webTopic[0];
  opts.topic = opts.topic || webTopic[1];

  // get uri for image
  if (!opts.src) {
    if (imgRegex.test(opts.file)) {
      // regular image
      opts.src = foswiki.getPubUrlPath(opts.web, opts.topic, opts.file);
    } else {
      // using rest handler to process image
      opts.src = foswiki.getScriptUrlPath("rest", "ImagePlugin", "process", {
        topic: opts.web + "." + opts.topic,
        file: opts.file
      })
    }
  }

  elem = $("<img />").attr("src", opts.src);

  if (opts.width) {
    elem.attr("width", opts.width);
  }
  if (opts.height) {
    elem.attr("height", opts.height);
  }
  if (opts.align) {
    elem.attr("align", opts.align);
    opts.classList = (opts.classList || "") + " imageSimple_"+opts.align;
  }
  if (opts.classList) {
    elem.attr("class", opts.classList);
  }
  if (opts.id) {
    elem.attr("id", opts.id);
  }
  if (opts.caption) {
    elem.attr("data-caption", opts.caption);
  }
  if (opts.type) {
    elem.attr("data-type", opts.type);
  }
  if (opts.href) {
    elem.attr("data-href", opts.href);
  }
  if (opts.topic !== webTopic[1] || opts.web !== webTopic[0]) {
    elem.attr("data-topic", opts.web+"."+opts.topic);
  }

  elem.attr("data-file", opts.file);

  opts.prefix = opts.prefix === undefined ? "": opts.prefix;
  opts.suffix = opts.suffix === undefined ? "": opts.suffix;

  elem = opts.prefix + elem.get(0).outerHTML + opts.suffix;

  self.insert(elem);
};

/*************************************************************************
 * registered blobs can be used in editor
 */
TinyMCEEngine.prototype.registerBlob = function(info) {
  var self = this;

  return $.Deferred(function(dfd) {
    var reader = new FileReader();

    reader.addEventListener("load", function() {
      var blobCache =  self.editor.editorUpload.blobCache,
        base64 = reader.result.split(',')[1],
        blobInfo = blobCache.create(info.id, info.file, base64);

      blobCache.add( blobInfo );
      dfd.resolve(blobInfo.blobUri());
    });

    reader.readAsDataURL(info.file);
  }).promise();
};

/*************************************************************************
 * remove the selected substring
 */
TinyMCEEngine.prototype.remove = function() {
  var self = this;

  //console.log("remove selected node",self.editor.selection.getContent());
  return self.editor.selection.setContent("");
};

/*************************************************************************
 * returns the current selection
 */
TinyMCEEngine.prototype.getSelection = function() {
  var self = this,
    selection = self.editor.selection,
    node = selection.getNode();

  if (selection.isCollapsed()) {
    if (node.nodeName == 'BODY' || node.nodeName == 'IMG') {
      return "";
    } else {
      return node.textContent;
    }
  } else {
    return selection.getContent();
  }
};

/*************************************************************************
 * replace the selection with the given text.
 * if the selection is collapsed append the text
 */
TinyMCEEngine.prototype.setSelection = function(text) {
  var self = this,
    selection = self.editor.selection,
    node = self.editor.selection.getNode();

  if (selection.isCollapsed()) {
    if (node.nodeName == 'BODY') {
      self.append(text);
    } else {
      $(self.editor.selection.getNode()).html(text);
    }
  } else {
    self.editor.selection.setContent(text);
  }
};

/*************************************************************************
  * returns the currently selected lines
  */
TinyMCEEngine.prototype.getSelectionLines = function() {
  var self = this, 
      rng = self.editor.selection.getRng(),
      start = rng.startOffset,
      end = rng.endOffset,
      node = self.editor.selection.getNode(),
      text = self.getSelection();

  while (start > 0 && text.charCodeAt(start-1) !== 13 && text.charCodeAt(start-1) !== 10) {
    start--;
  }

  while (end < text.length && text.charCodeAt(end) !== 13 && text.charCodeAt(end) !== 10) {
    end++;
  }

  if (end >= text.length) {
    end = text.length - 1;
  }

  //self.shell.log("start=",start,"end=",end,"rng=",rng,"text=",text,"len=",text.length);

  rng.setStart(node, start);
  //rng.setEnd(node, end);

  self.editor.selection.setRng(rng);

  return text;
};

/*************************************************************************
 * sort the current selection
 */
TinyMCEEngine.prototype.sortSelection = function(dir) {
  var self = this,
    node = self.editor.selection.getNode(),
    sortedNode;

  if (self.editor.selection.isCollapsed()) {
    return;
  }
  
  sortedNode = $(node).children().sort(function(a, b) {
    var vA, vB;

    if (dir == 'asc') {
      vA = $(a).text(),
      vB = $(b).text();
    } else {
      vA = $(b).text(),
      vB = $(a).text();
    }

    return (vA < vB) ? -1 : (vA > vB) ? 1 : 0;
  });

  self.editor.undoManager.add();
  self.editor.selection.select(node);
  self.editor.selection.setNode(sortedNode);
};

/*************************************************************************
 * set the caret position to a specific position. thats done by setting
 * the selection range to a single char at the given position
 */
TinyMCEEngine.prototype.setCaretPosition = function(caretPos) {
  var self = this;

  return self.editor.selection.setCursorLocation(undefined, caretPos);
};

/*************************************************************************
 * get the caret position 
 */
TinyMCEEngine.prototype.getCaretPosition = function() {
  var self = this;

  return self.editor.selection.getEnd();
};

/*****************************************************************************
 * get the coordinates of the cursor
 */
TinyMCEEngine.prototype.getCursorCoords = function(chOffset) {
  var self = this,
      rng = self.editor.selection.getRng(),
      rect = rng.getBoundingClientRect(),
      editorRect = self.editor.getContainer().getBoundingClientRect(),
      editorTop = window.scrollY + editorRect.top,
      editorLeft = window.scrollX + editorRect.left;

  return {
    top: editorTop + rect.top,
    left: editorLeft + rect.left,
    bottom: editorTop + rect.bottom,
    right: editorLeft + rect.right
  };
};

/*************************************************************************
 * returns true if changes have beem made
 */
TinyMCEEngine.prototype.hasChanged = function() {
  var self = this;

  return self.editor.isDirty();
};

/*************************************************************************
 * undo recent change
 */
TinyMCEEngine.prototype.undo = function() {
  var self = this;

  self.editor.undoManager.undo();
  self.updateUndoButtons();
};

/*************************************************************************
 * redo recent change
 */
TinyMCEEngine.prototype.redo = function() {
  var self = this;

  self.editor.undoManager.redo();
  self.updateUndoButtons();
};

/*************************************************************************
 * used for line oriented tags - like bulleted lists
 * if you have a multiline selection, the tagOpen/tagClose is added to each line
 * if there is no selection, select the entire current line
 * if there is a selection, select the entire line for each line selected
 */
TinyMCEEngine.prototype.insertLineTag = function(markup) {
  var self = this,
      tagOpen = markup[0],
      selection = self.getSelectionLines() || markup[1],
      tagClose = markup[2];

  self.shell.log("selection=",selection);

  self.editor.selection.setContent(tagOpen+selection+tagClose);
};

/*************************************************************************
 * insert a topic markup tag 
 */
TinyMCEEngine.prototype.insertTag = function(markup) {
  var self = this,
      tagOpen = markup[0],
      selection = self.getSelection() || markup[1],
      tagClose = markup[2];

  self.editor.selection.setContent(tagOpen+selection+tagClose);
};

/*************************************************************************
 * remove all formats in the selection
 */
TinyMCEEngine.prototype.removeFormat = function() {
  var self = this;

  self.editor.execCommand("RemoveFormat");
};

/*************************************************************************
 * apply foreground color
 */
TinyMCEEngine.prototype.applyColor = function(color) {
  var self = this;

  self.editor.execCommand('mceApplyTextcolor', 'forecolor', color);
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
TinyMCEEngine.prototype.insertTable = function(opts) {
  var self = this;

  opts.init = new foswiki.Table(self.getSelection());
  self.insert(foswiki.Table.create(opts).toHtml());
};

/***************************************************************************
 * insert a link
 * opts is a hash of params that can have either of the following forms:
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
TinyMCEEngine.prototype.insertLink = function(opts) {
  var self = this, markup, link,
    web = foswiki.getPreference("WEB"),
    natEditOpts = foswiki.getPreference("NatEditPlugin"),
    webTopic = self.shell.formManager.getWebTopic();

  return $.Deferred(function(dfd) {

    if (typeof(opts.url) !== 'undefined') {
      if (opts.url === '') {
        dfd.reject();
        return;
      }

      if (typeof(opts.text) !== 'undefined' && opts.text !== '') {
        markup = `<a href='${opts.url}'>${opts.text}</a>`;
      } else {
        markup = `<a href='${opts.url}'>${opts.url}</a>`;
      }
    } else if (typeof(opts.file) !== 'undefined') {
      // attachment link

      if (typeof(opts.web) === 'undefined' || opts.web === '' || 
          typeof(opts.topic) === 'undefined' || opts.topic === '') {
        dfd.reject();
        return;
      }

      if (!opts.text && natEditOpts.TopicInteractionPluginEnabled) {
        $.post(foswiki.getScriptUrlPath("rest", "TopicInteractionPlugin", "getlink"), {
          id: foswiki.getUniqueID(),
          topic: opts.web+"."+opts.topic,
          filename: opts.file,
          expand: true
        }).then(function(data) {
          var response = JSON.parse(data);

          //var html = $(response.result.html);
          //html.attr("data-tml", response.result.tml);

          self.remove();
          self.insert(response.result.tml);
          dfd.resolve();
        });
        return;
      } 

      if (webTopic[0] === opts.web && webTopic[1] === opts.topic) {
        link = `%ATTACHURLPATH%/${opts.file}`;
      } else {
        link = `%PUBURLPATH%/${opts.web}/${opts.topic}/${opts.file}`;
        //link = foswiki.getPubUrlPath(opts.web, opts.topic, opts.file);
      }
      opts.text = opts.text || opts.file;
      markup = `<a href='${link}'>${opts.text}</a>`;

    } else {
      // wiki link
      
      if (typeof(opts.topic) === 'undefined' || opts.topic === '') {
        dfd.reject();
        return; // nop
      }

      link = foswiki.getScriptUrlPath("view", opts.web, opts.topic);

      opts.text = opts.text || opts.topic;
      markup = `<a class='TMLlink' href='${link}' data-topic='${opts.web}.${opts.topic}'>${opts.text}</a>`;
    }

    self.setSelection(markup);

    dfd.resolve();

  }).promise();
};

/*************************************************************************
 * set the value of the editor
 */
TinyMCEEngine.prototype.setValue = function(val) {
  var self = this;

  self.editor.setContent(val);
};

/*************************************************************************
 * get the value of the editor
 */
TinyMCEEngine.prototype.getValue = function() {
  var self = this;

  self.shell.log("TinyMCEEngine::getValue editor=",self.editor);
  return self.editor ? self.editor.getContent() : "";
};


/*************************************************************************
 * get the DOM element that holds the editor engine
 */
TinyMCEEngine.prototype.getWrapperElement = function() {
  var self = this;

  return self.editor ? $(self.editor.getContainer()) : null;
};

/*************************************************************************
 * set focus
 */
TinyMCEEngine.prototype.focus = function() {
  var self = this;

  self.editor.focus();
};

/*************************************************************************
 * set the size of editor
 */
TinyMCEEngine.prototype.setSize = function(width, height) {
  var self = this,
      elem = $(self.editor.getContainer());

  if (elem) {
    if (width) {
      //console.log("width=",width);
      elem.css("width", width);
    }
    if (height) {
      //console.log("height=",height);
      elem.css("height", height);
    }
  }
};

/*************************************************************************
 * toggles fullscreen mode
 */
TinyMCEEngine.prototype.toggleFullscreen = function() {
  var self = this;

  self.editor.execCommand('mceFullScreen');
};

/*****************************************************************************
 * get word at current cursor position
 */
TinyMCEEngine.prototype.getCurrentWord = function() {
  var self = this;

  return self.editor.selection.getSel().focusNode.nodeValue;
};

/*****************************************************************************
 * get text from line start to cursor
 */
TinyMCEEngine.prototype.getBeforeCursor = function(include) {
  var self = this,
      selection = self.editor.selection,
      rng = selection.getRng(),
      data = rng.startContainer.data,
      end = rng.startOffset + (include?1:0);

  return data?data.slice(0, end):"";
};

/*****************************************************************************
 * get text from cursor to line end
 */
TinyMCEEngine.prototype.getAfterCursor = function(include) {
  var self = this,
      selection = self.editor.selection,
      rng = selection.getRng(),
      data = rng.startContainer.data,
      start = rng.startOffset + (include?0:1);

  return data?data.slice(start):"";
};

/*************************************************************************
 * process completion for a given string
 */
TinyMCEEngine.prototype.execCompletion = function(completion, string) {
  var self = this,
      coords = self.getCursorCoords(),
      dropdown = self.shell.dropdown,
      editorRect = self.editor.getContainer().getBoundingClientRect();

  completion.search.call(self.shell, string).then(function(data) {
      var list = [];

      $.each(data, function(i, hit) {
        list.push(
          $("<li>"+completion.template.call(self.shell, hit)+"</li>")
            .data("callback", function() {
              var result = completion.result.call(self.shell, hit),
                rng = self.editor.selection.getRng(),
                offset = rng.startOffset - string.length;

              rng.setStart(rng.startContainer, offset);
              self.editor.selection.setRng(rng);
              self.editor.selection.setContent(result); 
            })
            .on("click", function() {
              dropdown.hide();
              dropdown.callback($(this));
              self.focus();
            })
        );
      });

      if (list.length) {
        var rng = self.editor.selection.getRng().cloneRange(),
          offset = rng.endOffset - string.length + 1,
          rect;

        if (offset >=0 ) {
          rng.setEnd(rng.endContainer, offset);
          rect = rng.getBoundingClientRect();
          dropdown.set(list).show({
            top: coords.bottom,
            left: window.scrollX + editorRect.left + rect.x,
          });
        }
      } else {
        dropdown.hide();
      }
  });
};

/*************************************************************************
 * replace text between two positions
 */
TinyMCEEngine.prototype.replace = function(text, from, to) {
  var self = this,
      content = self.editor.getContent(),
      updatedContent = content.substring(0, from) + text + content.substring(to);

  self.editor.setContent(updatedContent);
};

/***************************************************************************
 * editor defaults
 */
TinyMCEEngine.defaults = {
  debug: false,
  natedit: {
    purifyInput: false
  },
  tinymce: {
    deprecation_warnings: false, // need to fix them at some time in the future 
    selector: 'textarea#topic',
    indentation:'35px',
    min_height: 300,
    menubar: false,
    toolbar: false,
    statusbar: false,
    relative_urls: false,
    remove_script_host: false,
    convert_urls: true,
    submit_patch: false,
    browser_spellcheck: false,
    //contextmenu: false,
    /*document_base_url: ... set later */
    plugins: 'autolink fullscreen hr lists -natedit-image -natedit-link paste searchreplace table textpattern', 
    /*
    spellchecker_language: 'en_US',
    spellchecker_active: true,
    */
    //table_toolbar : "tabledelete | tableinsertrowbefore tableinsertrowafter tabledeleterow | tableinsertcolbefore tableinsertcolafter tabledeletecol",
    table_toolbar: "",
    table_appearance_options: false,
    table_advtab: false,
    table_cell_advtab: false,
    table_row_advtab: false,
    object_resizing: "img",

    paste_data_images: true,
    paste_tab_spaces: 3,
    keep_styles: false,
    paste_preprocess: function(plugin, args) {
      //console.log("paste_preprocess args=",args);
      args.content = _clearClipboardContent(args.content);
    },

    image_title: true,
    image_class_list: [
	{ title: 'Left', value: '' },
	{ title: 'Right', value: 'foswikiRight' },
	{ title: 'Center', value: 'foswikiCenter' }
    ],
/*
    image_caption: true,
    image_advtab: true,
*/
    /* TODO 
    image_list: function(callback) {
      callback([
	{title: 'Dog', value: 'mydog.jpg'},
	{title: 'Cat', value: 'mycat.gif'}
      ]);
    }, 
    */ 
    content_css: [],
    style_formats_autohide: true,
    removeformat: [{ 
      selector: 'div,p,pre', 
      remove: 'all' 
    }],
    formats: {
      h1Markup: { block: "h1", toolbar: ".ui-natedit-h1" },
      h2Markup: { block: "h2", toolbar: ".ui-natedit-h2" },
      h3Markup: { block: "h3", toolbar: ".ui-natedit-h3" },
      h4Markup: { block: "h4", toolbar: ".ui-natedit-h4" },
      h5Markup: { block: "h5", toolbar: ".ui-natedit-h5" },
      h6Markup: { block: "h6", toolbar: ".ui-natedit-h6" },
      normalMarkup: { block: "p", toolbar: ".ui-natedit-normal"},
      quoteMarkup: { block: "blockquote", toolbar: ".ui-natedit-quoted"},
      boldMarkup: { inline: "b", toolbar: ".ui-natedit-bold" },
      italicMarkup: { inline: "i", toolbar: ".ui-natedit-italic" },
      monoMarkup: { inline: "code", toolbar: ".ui-natedit-mono" },
      underlineMarkup: { inline: "u", toolbar: ".ui-natedit-underline"  },
      strikeMarkup: { inline: "s", toolbar: ".ui-natedit-strike"  },
      superscriptMarkup: { inline: "sup", toolbar: ".ui-natedit-super" },
      subscriptMarkup: { inline: "sub", toolbar: ".ui-natedit-sub" },
      leftMarkup: { block: "p", attributes: { "align": "left" }, toolbar: ".ui-natedit-left" },
      rightMarkup: { block: "p", attributes: { "align": "right" }, toolbar: ".ui-natedit-right" },
      centerMarkup: { block: "p", attributes: { "align": "center" }, toolbar: ".ui-natedit-center" },
      justifyMarkup: { block: "p", attributes: { "align": "justify" }, toolbar: ".ui-natedit-justify" },
      verbatimMarkup: { block: "pre", classes: "TMLverbatim", toolbar: ".ui-natedit-verbatim" }
    },
    textpattern_patterns: [
      {start: '==', end: '==', format: ['boldMarkup','monoMarkup'] },
      {start: '_', end: '_', format: 'italicMarkup'},
      {start: '__', end: '__', format: ['italicMarkup', 'boldMarkup'] }, 
      {start: '=', end: '=', format: 'monoMarkup'},
      {start: '*', end: '*', format: 'boldMarkup'},
      {start: '---', replacement: '<hr />' },
      {start: '---+ ', format: 'h1Markup'},
      {start: '---++ ', format: 'h2Markup'},
      {start: '---+++ ', format: 'h3Markup'},
      {start: '---++++ ', format: 'h4Markup'},
      {start: '---+++++ ', format: 'h5Markup'},
      {start: '---++++++ ', format: 'h6Markup'},
      {start: '1 ', cmd: 'InsertOrderedList'}, // SMELL: does not work with leading whitespaces
      {start: '* ', cmd: 'InsertUnorderedList'} 
    ]
  }
};

/*************************************************************************
 * register engine to NatEditor shell
 */
$.NatEditor.factory.TinyMCEEngine = {
  createEngine: function(shell) {
    return new TinyMCEEngine(shell);
  }
};

})(jQuery);
