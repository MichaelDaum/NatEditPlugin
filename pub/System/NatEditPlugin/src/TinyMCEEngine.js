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
      wikiName =foswiki.getPreference("WIKINAME"),
      serverTime = foswiki.getPreference("SERVERTIME"),
      wikiUserNameUrl = foswiki.getScriptUrlPath("view", foswiki.getPreference("USERSWEB"), foswiki.getPreference("WIKINAME")),
      pubUrlPath = foswiki.getPreference("PUBURLPATH");

  self.shell = shell;
  self.id = "TinyMCEEngine";
  self.type = "wysiwyg";
  self.opts = $.extend({}, TinyMCEEngine.defaults, self.shell.opts.tinymce, opts);
  self.opts.tinymce.selector = "#"+self.shell.id+" textarea";
  self.opts.natedit.signatureMarkup = ['-- ', `<a href="${wikiUserNameUrl}">${wikiName}</a>`, ` - ${serverTime}`];
  self.opts.natedit.clearMarkup = ['', `<img src="${pubUrlPath}/System/NatEditPlugin/images/clear-float.svg" class="WYSIWYG_CLEAR" data-mce-resize="false" data-mce-placeholder="1" />`, ''];
  self.opts.tinymce.content_css = foswiki.getPreference("NatEditPlugin").ContentCSS;
  self.opts.tinymce.document_base_url = foswiki.getPreference("URLHOST");
  self.opts.tinymce.urlconverter_callback = function(url, node, onSave) {
    return self.convertURI(url, node, onSave);
  };

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

    tinymce.PluginManager.add("natedit-link", function(editor) {
      editor.ui.registry.addMenuItem('link', {
        icon: 'link',
        text: 'Link ...',
        onAction: function (api) {
          var node = self.editor.selection.getNode();
          //TODO: parseNode
          self.shell.linkDialog({
            selection: node.textContent,
            url: node.getAttribute("href"),
            type: "external"
          });
        }
      });
      editor.addCommand('mceLink', function() {
        //TODO: parseNode
        self.shell.linkDialog(self.getSelection());
      });

      editor.ui.registry.addContextMenu('image', {
        update: function (elem) {
          return elem.nodeName === 'A' ? 'link': '';
        }
      });
    });

    self.opts.tinymce.init_instance_callback = function(editor) {
      var cols = parseInt(self.shell.txtarea.attr("cols"), 10) || 10000,
          rows = parseInt(self.shell.txtarea.attr("rows"), 10),
          lineHeight = parseInt(self.shell.txtarea.css("line-height"), 10);

      self.shell.log("initing instance");
      self.editor = editor;

      // only set the width if specified by a cols attribute and not any css styled width
      if (typeof(cols) !== 'undefined' && cols > 0) {
        self.setSize(`min(${cols}ch,100%)`);
      }
      if (typeof(rows) !== 'undefined' && rows > 0) {
        rows = (rows*lineHeight);
        self.setSize(null, rows);
      }

      if (self.opts.debug) {
        window.editor = editor; // playground
      }

      self.updateContent().then(function() {
        dfd.resolve();
      }, function() {
        dfd.reject();
      });


      if (window.darkMode && window.darkMode.isActive) {
        //console.log("propagating darkmode to iframe");
        $(self.editor.contentAreaContainer)
          .children("iframe")
          .contents()
          .find("html:first")
          .attr("data-theme", "dark");
      }


/*
      self.on("BeforeSetContent", function(ev) {
        if (foswiki.getPreference("NatEditPlugin").ImagePluginEnabled) {
          var paramsRegex = /(?:(\w+?)=)?&#34;(.*?)&#34;/g;
          ev.content = ev.content.replace(/%IMAGE{(.*?)}%/, function(string, params) {
            var args = [], match;
            while ((match = paramsRegex.exec(params)) !== null) {
              var key = match[1], val = match[2];
              if (key) {
                if (key === 'size') {
                  args.push('height="'+val+'"');
                } else {
                  args.push(key+'="'+val+'"');
                }
              } else {
                val = foswiki.getPubUrl(foswiki.getPreference("WEB"), foswiki.getPreference("TOPIC"), val);
                args.push('src="'+val+'"');
                args.push('data-mce-src="'+val+'"');
              }
            }
            if (args.length) {
              return "<img "+args.join(" ")+"/>";
            } else {
              return string;
            }
          });
        }
      });
      self.on("GetContent", function() { self.shell.log("got GetContent event"); });
*/
    };

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
    dfd = $.Deferred();

  if (action !== 'cancel') {
    self.shell.txtarea.val(self.getValue());
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

    if (self.editor.formatter.get(markup)) {
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

/*****************************************************************************
 * parse the currently selected image into a data hash
 */
TinyMCEEngine.prototype.getImageData = function(data) {
  var self = this,
      imgElem = self.editor.selection.getNode(),
      urlData,
      excludePattern = new RegExp("image(Simple|Float|Thumb|Frame|Plain)(_left|_right|_none|_center)?");

  data = $.extend({}, {
    web: foswiki.getPreference("WEB"),
    topic: foswiki.getPreference("TOPIC")
  }, data) || {};;

  if (imgElem && imgElem.nodeName === 'IMG') {
    urlData = self.shell.parseUrl(imgElem.src);

    data.width = imgElem.width || data.width; 
    data.height = imgElem.height || data.height; 
    data.align = imgElem.align || data.align; 
    data.type = imgElem.dataset.type;
    data.caption = imgElem.dataset.caption;
    data.web = urlData.web || data.web;
    data.topic = urlData.topic || data.topic;
    data.file = urlData.file || data.file;

    data.classList = Array.from(imgElem.classList).filter(function(item) {
      return !excludePattern.test(item);
    });
    data.id = imgElem.id;
    data.align = imgElem.align;
    data.type = imgElem.dataset.type;
    data.caption = imgElem.dataset.caption || '';
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
      elem, src;

  //console.log("insertImage, opts=",opts);

  src= foswiki.getPubUrlPath(opts.web, opts.topic, opts.file);
  elem = $("<img />").attr({
    "src": src,
    "data-mce-src": src
  });

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

  opts.prefix = opts.prefix === undefined ? "": opts.prefix;
  opts.suffix = opts.suffix === undefined ? "": opts.suffix;

  elem = opts.prefix + elem.get(0).outerHTML + opts.suffix;

  //console.log("IMG=",elem);
  if (!self.editor.selection.isCollapsed()) {
    self.editor.selection.getNode().remove();
  }
  self.insert(elem);
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
  var self = this;

  return self.editor.selection.getContent();
};

/*************************************************************************
  * returns the currently selected lines
  */
TinyMCEEngine.prototype.getSelectionLines = function() {
  var self = this, 
      range = self.editor.selection.getRng(),
      start = range.startOffset,
      end = range.endOffset,
      node = self.editor.selection.getNode(),
      text = $(node).text();


  while (start > 0 && text.charCodeAt(start-1) !== 13 && text.charCodeAt(start-1) !== 10) {
    start--;
  }

  while (end < text.length && text.charCodeAt(end) !== 13 && text.charCodeAt(end) !== 10) {
    end++;
  }

  if (end >= text.length) {
    end = text.length - 1;
  }

//self.shell.log("start=",start,"end=",end,"range=",range,"text=",text,"len=",text.length);

  range.setStart(node, start);
  //range.setEnd(node, end);

  self.editor.selection.setRng(range);

  return text;
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
TinyMCEEngine.prototype.insertLink = function(opts) {
  var self = this, markup, link,
      web = foswiki.getPreference("WEB");

  self.shell.log("called insertLink",opts);

  if (typeof(opts.url) !== 'undefined') {
    if (opts.url === '') {
      return; // nop
    }

    if (typeof(opts.text) !== 'undefined' && opts.text !== '') {
      markup = "<a href='"+opts.url+"'>"+opts.text+"</a>";
    } else {
      markup = "<a href='"+opts.url+"'>"+opts.url+"</a>";
    }
  } else if (typeof(opts.file) !== 'undefined') {
    // attachment link

    if (typeof(opts.web) === 'undefined' || opts.web === '' || 
        typeof(opts.topic) === 'undefined' || opts.topic === '') {
      return; // nop
    }

    link = '%PUBURLPATH%/'+opts.web+'/'+opts.topic+'/'+opts.file;

    markup = "<a href='"+link+"'>";

    if (typeof(opts.text) !== 'undefined' && opts.text !== '') {
      markup += opts.text;
    } else {
      markup += opts.file;
    }
    markup += "</a>";

  } else {
    // wiki link
    
    if (typeof(opts.topic) === 'undefined' || opts.topic === '') {
      return; // nop
    }

    if (typeof(opts.web) !== 'undefined' && opts.web !== web) {
      link = opts.web + '.';
    } else {
      link = "";
    }
    link += opts.topic; 

    markup = "<a href='"+link+"'>";

    if (typeof(opts.text) !== 'undefined' && opts.text !== '') {
      markup += opts.text;
    }  else {
      markup += opts.topic;
    }
    markup += "</a>";
  }

  //self.shell.log("markup=",markup);

  var selection = self.editor.selection.getContent();
  if (self.editor.selection.isCollapsed()) {
    var selRng = self.editor.selection.getRng();
    selRng.expand("word");
    self.editor.selection.setRng(selRng);
  } 

  self.remove();
  self.insert(markup);
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

  return self.editor.getContent();
};


/*****************************************************************************
 * search & replace a term in the textarea
 */
TinyMCEEngine.prototype.searchReplace = function(search, replace, ignoreCase) {
  /*var self = this;*/

  throw("not implemented: searchReplace(",search,replace,ignoreCase,")");
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


/***************************************************************************
 * editor defaults
 */
TinyMCEEngine.defaults = {
  debug: true,
  natedit: {
    purifyInput: false
  },
  tinymce: {
    deprecation_warnings: false, // need to fix them at some time in the future 
    selector: 'textarea#topic',
    min_height: 300,
    menubar: false,
    toolbar: false,
    statusbar: false,
    relative_urls: false,
    remove_script_host: false,
    convert_urls: true,
    submit_patch: false,
    /*document_base_url: ... set later */
    plugins: 'autolink fullscreen hr legacyoutput lists -natedit-image -natedit-link paste searchreplace table textpattern', 
    //table_toolbar : "tabledelete | tableinsertrowbefore tableinsertrowafter tabledeleterow | tableinsertcolbefore tableinsertcolafter tabledeletecol",
    table_toolbar: "",
    table_appearance_options: false,
    table_advtab: false,
    table_cell_advtab: false,
    table_row_advtab: false,
    object_resizing: "img",
    paste_data_images: true,
    keep_styles: false,
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
    }, */ 
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
      underlineMarkup: { inline: "span", styles: { "text-decoration": "underline" }, toolbar: ".ui-natedit-underline"  },
      strikeMarkup: { inline: "span", styles: { "text-decoration": "line-through" }, toolbar: ".ui-natedit-strike"  },
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
