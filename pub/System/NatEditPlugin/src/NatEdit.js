/*
 * NatEdit Shell
 *
 * Copyright (c) 2008-2025 Michael Daum http://michaeldaumconsulting.com
 *
 * Licensed under the GPL license http://www.gnu.org/licenses/gpl.html
 *
 */

/*global StrikeOne:false DropDownMenu:false _debounce:false _escapeRegExp:false Emojis:false */

"use strict";
(function($) {

var initedDefaults = false;

/*****************************************************************************
 * class NatEditor
 */
$.NatEditor = function(txtarea, opts) {
  var self = this;

  // build element specific options. 
  self.txtarea = $(txtarea);
  self.form = $(txtarea.form);
  self.formManager = self.form.formManager().data("formManager");

  self.opts = $.extend({
    name: self.txtarea.attr("name")
  }, opts, self.txtarea.data());

  self.id = foswiki.getUniqueID();
  self.isBlockedUnload = false;
  self.referrer = document.referrer;
  self.topicTitleCache = {};
  self.engines = {};

  self.log("creating new natedit",self.opts);

  self.container = self.txtarea.wrap('<div class="ui-natedit"></div>').parent();
  self.container.attr("id", self.id);
  self.container.data("natedit", self);
  self.textFormat = $(`<input type='hidden' name='_text_format_${self.opts.name}' />`).prependTo(self.form);

  if (self.opts.hidden || self.txtarea.is(".foswikiHidden")) {
    self.log("not creating engine for hidden editor");
    // just init the shell, not any engine
    self.container.addClass("foswikiHidden");
    self.createEngine().then(function(engine) {
      return self.attachEngine(engine);
    }).then(function() {
      self.txtarea.trigger("inited");
      self.isInited = true;
      self.initGui();
      self.container.css("opacity", 1);
    });
  } else {
    // init shell and engine
    self.txtarea.addClass("ui-widget");
    self.container.css("opacity", 0);
    $.when(
      self.preloadTemplate(self.opts.toolbarTemplate, self.opts.toolbar),
      self.createEngine()
    ).then(function(tmpl, engine) {
      return self.attachEngine(engine);
    }).then(function() {
      self.txtarea.trigger("inited");
      self.isInited = true;
      self.initGui();
      self.container.css("opacity", 1);
    });
  }

  // clear input on reset event
  self.txtarea.on("reset", function() {
    self.setValue("");
  });
};

$.NatEditor.version = ""; // updated below

/*************************************************************************
 * debug logging 
 */
$.NatEditor.prototype.log = function() {
  var self = this, args, id = self.id;

  id = id.substring(id.length - 4, id.length);

  if (console && self.opts.debug) {
    args = $.makeArray(arguments);
    args.unshift("NATEDIT ("+id+"): ");
    console && console.log.apply(console, args); // eslint-disable-line no-console
  }
};

/*************************************************************************
 * init the helper to auto-expand the textarea on content change
 */
$.NatEditor.prototype.initAutoExpand = function() {
  var self = this,
      style;

  self.helper = $('<textarea tabindex="-1" class="ui-natedit-auto-expand-helper" />').appendTo(self.container);

  // get text styles and apply them to the helper
  style = {
    fontFamily: self.txtarea.css('fontFamily') || '',
    fontSize: self.txtarea.css('fontSize') || '',
    fontWeight: self.txtarea.css('fontWeight') || '',
    fontStyle: self.txtarea.css('fontStyle') || '',
    fontStretch: self.txtarea.css('fontStretch') || '',
    fontVariant: self.txtarea.css('fontVariant') || '',
    letterSpacing: self.txtarea.css('letterSpacing') || '',
    textTransform: self.txtarea.css('textTransform') || '',
    textIndent: self.txtarea.css('textIndent') || '',
    wordSpacing: self.txtarea.css('wordSpacing') || '',
    lineHeight: self.txtarea.css('lineHeight') || '',
    padding: self.txtarea.css('padding') || '',
    textWrap: 'unrestricted'
  };
  self.helper.css(style);

  // add event handler
   self.engine.on('keyup', function() {
     self.autoResize();
   });

  // listen to window resize
  $(window).on("resize.natedit", function() {
    self.autoResize();
  });
};

/*************************************************************************
 * create an engine
 */
$.NatEditor.prototype.createEngine = function(id) {
  var self = this, 
    url, 
    dfd = $.Deferred();

  id = id || self.opts.engine || 'CodemirrorEngine';
  self.log("creating engine ",id);

  if (self.engines[id]) {
    dfd.resolve(self.engines[id]);
  } else {

    if ($.NatEditor.factory[id]) {
      self.engines[id] = $.NatEditor.factory[id].createEngine(self);
      dfd.resolve(self.engines[id]);
    } else {
      url = self.opts.pubUrl+"/"+self.opts.systemWeb+"/NatEditPlugin/build/"+id+".js";
      self.getScript(url).then(function() {
        if ($.NatEditor.factory[id]) {
          self.engines[id] = $.NatEditor.factory[id].createEngine(self);
          dfd.resolve(self.engines[id]);
        } else {
          console && console.error("failed to create edit engine '"+id+"'"); // eslint-disable-line no-console  
          dfd.reject("failed to create engine",id);
        }
      });
    }
  }

  return dfd.promise();
};

/*************************************************************************
 * attach the given engine, detaches any previous one
 */
$.NatEditor.prototype.attachEngine = function(engine) {
  var self = this;

  self.log("called attachEngine", engine.id);
  self.engine = engine;
  return engine.init().then(function() {
    engine.initGui();
  });
};

/*************************************************************************
 * get the title of a topic
 */
$.NatEditor.prototype.getTopicTitle = function(topic) {
  var self = this, 
      topicTitle,
      dfd = $.Deferred();

  topic = foswiki.normalizeWebTopicName(self.opts.web, topic).join(".");

  topicTitle = self.topicTitleCache[topic];

  if (topicTitle) {
    //self.log("found topicTitle in cache",topicTitle);
    dfd.resolve(topicTitle);
  } else {
    //self.log("fetching topicTitle for", topic);

    $.get(foswiki.getScriptUrl("rest", "NatEditPlugin", "topicTitle"), {
      topic: self.opts.web + "." + self.opts.topic,
      location : topic
    }).then(function(data) {
      self.topicTitleCache[topic] = data;
      dfd.resolve(data);
    }).fail(function() {
      dfd.reject("failed to get topic title for ",topic);
    });;
  }

  return dfd.promise();
};


/*************************************************************************
 * get a script from the backend 
 */
$.NatEditor.prototype.getScript = function(url) {
  var /*self = this,*/
      dfd = $.Deferred(),
      script;

  script = document.createElement('script');
  script.async = true;
  script.src = url + `?version=${$.NatEditor.version}`;

  script.addEventListener('load', function() { 
    //self.log("loaded",url);
    dfd.resolve();
  }); 

  script.addEventListener('error', function() {
    dfd.reject('Error loading script '+url);
  });

  script.addEventListener('abort', function() { 
    dfd.reject('Script loading aborted.');
  });

  document.head.appendChild(script);

  return dfd.promise();
};

/*************************************************************************
 * init the gui
 */
$.NatEditor.prototype.initGui = function() {
  var self = this;

  self.log("called initGui");
  self.origValue = self.getValue();

  /* init the toolbar if it is there */
  self.initToolbar();

  /* flag enabled plugins */
  if (foswiki.getPreference("NatEditPlugin").FarbtasticEnabled) {
    self.container.addClass("ui-natedit-colorpicker-enabled");
  }

  self.dropdown = new DropDownMenu();

  /* disable autoMaxExpand and resizable if we are auto-resizing */
  if (self.opts.autoResize) {
    self.opts.autoMaxExpand = false;
    self.opts.resizable = false;
  }

  /* establish auto max expand */
  if (self.opts.autoMaxExpand) {
    self.txtarea.addClass("ui-natedit-autoexpand");
    self.autoMaxExpand();

    // disabled height property in parent container
    self.txtarea.parents(".jqTabContents:first").addClass("jqTabDisableMaxExpand").height("auto");
  }

  /* establish auto expand */
  if (self.opts.autoResize) {
    self.initAutoExpand();
    self.autoResize();
  }

};

/*************************************************************************
 * init the toolbar
 */
$.NatEditor.prototype.initToolbar = function() {
  var self = this;

  if (typeof(self.toolbar) !== 'undefined' || typeof($.templates[self.opts.toolbar]) === 'undefined') {
    return;
  }

  // init it
  self.toolbar = $($.templates[self.opts.toolbar].render({
    web: self.opts.web,
    topic: self.opts.topic
  }));

  if (self.opts.showFullscreen) {
    self.toolbar.find(".ui-natedit-fullscreen-button").show();
  } else {
    self.toolbar.find(".ui-natedit-fullscreen-button").hide();
  }

  if (!self.opts.showToolbar) {
    self.toolbar.hide();
  } 

  self.container.prepend(self.toolbar);

  // buttonsets
  self.toolbar.find(".ui-natedit-buttons").buttonset({onlyVisible:false}).on("click", function(ev) {
    self.handleToolbarAction(ev, $(ev.target).closest("a:not(.ui-natedit-menu-button)"));
    return false;
  });

  // a simple button
  self.toolbar.find(".ui-natedit-button").button({onlyVisible:false}).on("click", function(ev) {
    self.handleToolbarAction(ev, $(this));
    return false;
  });

  // a button with a menu next to it
  self.toolbar.find(".ui-natedit-menu-button").not(".ui-button").button().end()
    .button("option", {
      icon: 'ui-icon-triangle-1-s',
      iconPosition: 'end'
    })
    .on("mousedown", function() {

      var $this = $(this),
        $menu = (typeof($this.data("menu")) === 'undefined') ? $this.next() : $(self.container.find($this.data("menu"))),
        state = $menu.data("state") || false;

      $menu.data("menu-button", this);
      self.hideMenus();

      if (!state) {
        $this.addClass("ui-state-highlight");
        $menu.show().position({
          my: "left top",
          at: "left bottom+10",
          of: $this
        });
        $menu.data("state", true);
      } else {
        $this.removeClass("ui-state-highlight");
      }

      return false;
    }).on("click", function() {
      return false;
    });

  // markup menus
  self.toolbar.find(".ui-natedit-menu").each(function() {
    var $menu =
      $(this),
      enableSelect = false;

    $menu.menu().on("menuselect", function(ev, ui) {
      ev.target = $menu.data("menu-button"); // SMELL: patch in menu button that triggered this event
      if (enableSelect) {
        self.hideMenus();
        self.handleToolbarAction(ev, ui.item.children("a:first"));
      }
    }).children().on("mouseup", function(ev) {
      enableSelect = true;
      $menu.menu("select", ev);
      enableSelect = false;
    }).on("click", function() {
      return false;
    });
  });

  // close menus clicking the container 
  $(self.container).on("click", function() {
    self.hideMenus();
  });

  // close menus clicking into the engine 
  self.engine.on("click", function() {
    self.hideMenus();
  });

  if (self.opts.autoHideToolbar) {
    //self.log("toggling toolbar on hover event");
    self.toolbar.hide();

    self.engine.on("focus",
      function() {
        window.setTimeout(function() {
          self.showToolbar();
        });
      }
    ).on("blur",
      function() {
        window.setTimeout(function() {
          self.hideToolbar();
        });
      }
    );
  }

  // set trigger resize again as the toolbar changed its height
  $(window).trigger("resize");
};

/*************************************************************************
  * show the toolbar, constructs it if it hasn't been initialized yet
  */
$.NatEditor.prototype.showToolbar = function() {
  var self = this;

  if (!self.toolbar) {
    return;
  }

  self.toolbar.slideDown({
    duration: 200,
    easing: "easeInQuad",
    complete: function() {
      if (self.opts.autoMaxExpand) {
        $(window).trigger("resize");
      }
    }
  });

};

/*************************************************************************
  * hide the toolbar
  */
$.NatEditor.prototype.hideToolbar = function() {
  var self = this;

  if (!self.toolbar) {
    return;
  }

  self.toolbar.slideUp({
    duration: 200,
    easing: "easeOutQuad",
    complete: function() {
      if (self.opts.autoMaxExpand) {
        $(window).trigger("resize");
      }
    }
  });

};

/*************************************************************************
  * compatibility
  */
$.NatEditor.prototype.submit = function() {
  var self = this;

  self.formManager.submit();
}

/*************************************************************************
  * things to be done before the submit goes out
  */
$.NatEditor.prototype.beforeSubmit = function(action) {
  var self = this, 
    dfd = $.Deferred();

  self.log("called beforeSubmit("+action+")");
  self.origValue = self.getValue();
  return self.engine.beforeSubmit(action) || dfd.resolve().promise();
};

/*************************************************************************
 * handles selection of menu item or click of a button in the toolbar
 */
$.NatEditor.prototype.handleToolbarAction = function(ev, ui) {
  var self = this, 
      itemData, 
      dialogData,
      okayHandler = function() {},
      cancelHandler = function() {},
      openHandler = function() {},
      optsHandler = function() {
        return {
          web: self.opts.web,
          topic: self.opts.topic,
          selection: self.engine.getSelection()
        };
      };

  if (typeof(ui) === 'undefined' || ui.length === 0) {
    return;
  }

  // call engine on toolbar action
  itemData = self.engine.handleToolbarAction(ui);

  if (typeof(itemData) === 'undefined') {
    return;
  }

  //self.log("handleToolbarAction data=",itemData)

  // insert markup mode
  if (typeof(itemData.markup) !== 'undefined') {
    itemData.value = self.opts[itemData.markup];
  }

  // insert markup by value 
  if (typeof(itemData.value) !== 'undefined') {
    if (itemData.type === 'line') {
      self.engine.insertLineTag(itemData.value);
    } else {
      self.engine.insertTag(itemData.value);
    }
  }

  // dialog mode
  if (typeof(itemData.dialog) !== 'undefined') {

    if (typeof(itemData.okayHandler) !== 'undefined' && typeof(self[itemData.okayHandler]) === 'function') {
      okayHandler = self[itemData.okayHandler];
    }

    if (typeof(itemData.cancelHandler) !== 'undefined' && typeof(self[itemData.cancelHandler]) === 'function') {
      cancelHandler = self[itemData.cancelHandler];
    }

    if (typeof(itemData.openHandler) !== 'undefined' && typeof(self[itemData.openHandler]) === 'function') {
      openHandler = self[itemData.openHandler];
    }

    if (typeof(itemData.optsHandler) !== 'undefined' && typeof(self[itemData.optsHandler]) === 'function') {
      optsHandler = self[itemData.optsHandler];
    }

    dialogData = optsHandler.call(self);
    //console.log("dialogData=",dialogData);

    self.dialog({
      name: itemData.dialog,
      open: function(elem) {
        openHandler.call(self, elem);
      },
      data: dialogData,
      modal: itemData.modal,
      okayText: itemData.okayText,
      cancelText: itemData.cancelText
    }).then(function(dialog) {
        okayHandler.call(self, dialog, dialogData);
      }, function(dialog) {
        cancelHandler.call(self, dialog);
      }
    );
  }

  // method mode 
  if (typeof(itemData.handler) !== 'undefined') {
    if (typeof(self.engine[itemData.handler]) === 'function') {
      //self.log("found handler in engine for toolbar action",itemData.handler);
      self.engine[itemData.handler].call(self.engine, ev, ui);
      return;
    }

    if (typeof(self[itemData.handler]) === 'function') {
      //self.log("found handler in shell for toolbar action",itemData.handler);
      self[itemData.handler].call(self, ev, ui);
      return;
    }
  }

  //self.log("no action for ",ui);
};

/*************************************************************************
 * close all open menus
*/
$.NatEditor.prototype.hideMenus = function() {
  var self = this;

  self.container.find(".ui-natedit-menu").each(function() {
    var $this = $(this),
        $button = $($this.data("menu-button"));

    $button.removeClass("ui-state-highlight");
    $this.hide().data("state", false);
  });
};

/*************************************************************************
 * set the value of the editor
 */
$.NatEditor.prototype.setValue = function(val) {
  var self = this;

  if (self.engine) {
    self.origValue = val;
    if (self.isInited) {
      self.engine.setValue(val);
    } else {
      self.txtarea.one("inited", function() {
        self.engine.setValue(val);
      });
    }
  }
};

/*************************************************************************
 * get the value of the editor
 */
$.NatEditor.prototype.getValue = function() {
  var self = this;

  self.log("called getValue()");
  if (self.engine) {
    return self.engine.getValue();
  } 

  self.log("no engine, using txtarea");
  return self.txtarea.val();
};

/*************************************************************************
 * get the tml content of the editor
 */
$.NatEditor.prototype.getContent = function() {
  var self = this,
    dfd = $.Deferred();

  self.log("called getContent()");
  if (self.engine) {
    return self.engine.getContent();
  } 

  self.log("no engine, using txtarea");
  return dfd.resolve(self.txtarea.val()).promise();
};

/*************************************************************************
 * set the content of the editor
 */
$.NatEditor.prototype.setContent = function(val) {
  var self = this;

  self.log("called setContent()");
  if (self.engine) {
    return self.engine.setContent(val);
  } 

  self.log("no engine, using txtarea");
  return dfd.resolve(self.txtarea.val(val)).promise();
};

/*************************************************************************
  * update engines from textarea
  */
$.NatEditor.prototype.updateContent = function() {
  var self = this;

  return self.engine.updateContent();
};

/*****************************************************************************
 */
$.NatEditor.prototype.setTextFormat = function(val) {
  var self = this;

  return self.textFormat.val(val);
};

/*****************************************************************************
 */
$.NatEditor.prototype.getTextFormat = function() {
  var self = this;

  return self.textFormat.val();
};

/*****************************************************************************
 * handler insert color
 */
$.NatEditor.prototype.handleApplyColor = function(ev, elem) {
  var self = this;

  self.engine.applyColor(elem.data("color"));
};

/*****************************************************************************
 * handler to clear all formatting in the selection
 */
$.NatEditor.prototype.handleRemoveFormat = function(/*ev, elem*/) {
  var self = this;

  self.engine.removeFormat();
};


/*****************************************************************************
 * handler for escape tml 
 */
$.NatEditor.prototype.handleEscapeTML = function(/*ev, elem*/) {
  var self = this, 
      selection = self.engine.getSelection() || '';

  selection = self.escapeTML(selection);

  self.engine.remove();
  self.engine.insert(selection);
};

/*****************************************************************************
 * handler for unescape tml 
 */
$.NatEditor.prototype.handleUnescapeTML = function(/*ev, elem*/) {
  var self = this, 
      selection = self.engine.getSelection() || '';

  selection = self.unescapeTML(selection);

  self.engine.remove();
  self.engine.insert(selection);
};

/*****************************************************************************
 * handler to switch fullscreen mode
 */
$.NatEditor.prototype.handleFullscreen = function(/*ev, elem*/) {
  var self = this;

  self.container.toggleClass("ui-natedit-fullscreen");
  self.engine.toggleFullscreen();

  self.engine.focus();
};

/*************************************************************************
 * Replaces all foswiki TML special characters with their escaped counterparts.
 * See Foswiki:System.FormatTokens
 * @param inValue: (String) the text to escape
 * @return escaped text.
 */
$.NatEditor.prototype.escapeTML = function(inValue) {
  var text = inValue;

  text = text.replace(/\$/g, '$dollar');
  text = text.replace(/%/g, '$percnt');
  text = text.replace(/"/g, '\\"');

// SMELL: below aren't supported by all plugins; they don't play a role in TML parsing anyway

//  text = text.replace(/&/g, '$amp');
//  text = text.replace(/>/g, '$gt');
//  text = text.replace(/</g, '$lt');
//  text = text.replace(/,/g, '$comma');

  return text;
};

/*************************************************************************
 * The inverse of the escapeTML function.
 * See Foswiki:System.FormatTokens
 * @param inValue: (String) the text to unescape.
 * @return unescaped text.
 */
$.NatEditor.prototype.unescapeTML = function(inValue) {
  var text = inValue;

  text = text.replace(/\$nop/g, '');
  text = text.replace(/\\"/g, '"');
  text = text.replace(/\$perce?nt/g, '%');
  text = text.replace(/\$quot/g, '"');
  text = text.replace(/\$comma/g, ',');
  text = text.replace(/\$lt/g, '<');
  text = text.replace(/\$gt/g, '>');
  text = text.replace(/\$amp/g, '&');
  text = text.replace(/\$dollar/g, '$');

  return text;
};

/*************************************************************************
 * event handler for window.resize event 
 */
$.NatEditor.prototype.autoMaxExpand = function() {
  var self = this;

  self.log("called autoMaxExpand");
  self.fixHeight();
  $(window).on("resize.natedit", function() {
    self.fixHeight();
  });
};

/*************************************************************************
 * adjust height of textarea to window height
 */
$.NatEditor.prototype.fixHeight = function() {
  var self = this,
    elem = self.engine.getWrapperElement(),
    bottomBar = self.form.find(".natEditBottomBar"),
    newHeight;

  if (!elem || !elem.length) {
    return;
  }

  newHeight = 
    (bottomBar.length ? bottomBar.position().top : $(window).height() || window.innerHeight) // bottom offset: if there is a bottomBar, take this, otherwise use the window's geometry
    - elem.position().top // editor's top offset
    - (elem.outerHeight(true) - elem.height()) // elem's padding
    - ((self.container.is(".ui-natedit-fullscreen"))?0:(self.container.outerHeight(true) - self.container.height())) // container's padding
    - 2;

  if (self.opts.minHeight && newHeight < self.opts.minHeight) {
    newHeight = self.opts.minHeight;
  }

  if (newHeight < 0) {
    return;
  }

  if (elem.is(":visible")) {
    //self.log("fixHeight height=",newHeight,"container.height=",self.container.height());
    self.setSize(undefined, newHeight);
  } else {
    //self.log("not fixHeight elem not yet visible");
  }
};

/*************************************************************************
 * set the size of the editor, basically forwarding it to the engine if present
 */
$.NatEditor.prototype.setSize = function(width, height) {
  var self = this;

  if (self.engine) {
    self.engine.setSize(width, height);
  }
};

/*************************************************************************
 * get the size of the editor
 */
$.NatEditor.prototype.getSize = function() {
  var self = this;

  return self.engine.getSize();
};

/*************************************************************************
 * adjust height of textarea according to content
 */
$.NatEditor.prototype.autoResize = function() {
  var self = this, 
      now, text, height;

  //self.log("called autoResize()");
  now = new Date();
  
  // don't do it too often
  if (self._time && now.getTime() - self._time.getTime() < 100) {
    //self.log("suppressing events within 100ms");
    return;
  }
  self._time = now;

  window.setTimeout(function() {
    var size = self.getSize(),
        oldHeight = Math.round(size.height);
    text = self.getValue();

    self.log("oldHeight=",oldHeight);

    if (text === self._lastText) {
      //self.log("suppressing events");
      return;
    }

    self._lastText = text;
    text = self.htmlEntities(text);

    //self.log("helper text="+text);
    self.helper.width(size.width).val(text);

    self.helper.scrollTop(9e4);
    height = self.helper.scrollTop() + 25; // SMELL: plus magic value

    if (self.opts.minHeight && height < self.opts.minHeight) {
      height = self.opts.minHeight;
    } 

    if (self.opts.maxHeight && height > self.opts.maxHeight) {
      height = self.opts.maxHeight;
      self.txtarea.css('overflow-y', 'scroll'); // SMELL
    } else {
      self.txtarea.css('overflow-y', 'hidden'); // SMELL
    }

    height = Math.round(height);

    if (oldHeight !== height) {
      self.log("setting height=",height);

      self.setSize(undefined, height);
    }
  });
};

/*************************************************************************
 * replace entities with real html
 */
$.NatEditor.prototype.htmlEntities = function(text) { 
  var entities = {
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;'
  };

  for(const i in entities) {
    text = text.replace(new RegExp(i,'g'),entities[i]);
  }
  return text;
};

/*****************************************************************************
 * pre-load template, so that actually calling it later is fastr
 */
$.NatEditor.prototype.preloadTemplate = function(template, name) {
  var self = this,
      url;

  name = name || template;

  url = foswiki.getScriptUrl("rest", "JQueryPlugin", "tmpl", {
    topic: self.opts.web+"."+self.opts.topic,
    load: template,
    name: name
  });
 
  return $.loadTemplate({
    url:url,
    name:name
  });
};

/*****************************************************************************
 * opens a dialog based on a jquery template
 */
$.NatEditor.prototype.dialog = function(opts) {
  var self = this,
    defaults = {
      url: undefined,
      title: $.i18n("Confirmation required"),
      okayText: $.i18n("OK"),
      okayIcon: "ui-icon-check",
      cancelText: $.i18n("Cancel"),
      cancelIcon: "ui-icon-cancel",
      width: 'auto',
      modal: true,
      position: {
        my:'center', 
        at:'center',
        of: window
      },
      open: function() {},
      data: {
        web: self.opts.web,
        topic: self.opts.topic,
        selection: self.engine.getSelection()
      }
    };

  if (typeof(opts) === 'string') {
    opts = {
      data: {
        text: opts
      }
    };
  }

  if (typeof(opts.url) === 'undefined' && typeof(opts.name) !== 'undefined') {
    opts.url = foswiki.getScriptUrl("rest", "JQueryPlugin", "tmpl", {
      topic: self.opts.web+"."+self.opts.topic,
      load: "editdialog",
      name: opts.name
    });
  }

  opts = $.extend({}, defaults, opts);
  
  if (typeof(opts.event) !== 'undefined') {
    opts.position = {
      my: 'center top',
      at: 'left bottom+30',
      of: opts.event.target
    };
  }

  self.formManager.hideMessages();
  $.blockUI({ message: '' });
  return $.Deferred(function(dfd) {
    $.loadTemplate({
      url:opts.url,
      name:opts.name
    }).then(function(tmpl) {
      $.unblockUI()
      $(tmpl.render(opts.data)).dialog({
        buttons: [{
          text: opts.okayText,
          icon: opts.okayIcon,
          click: function() {
            dfd.resolve(this);
            $(this).dialog("close");
            return true;
          }
        }, {
          text: opts.cancelText,
          icon: opts.cancelIcon,
          click: function() {
            dfd.reject();
            $(this).dialog("close");
            return false;
          }
        }],
        open: function() {
          var $this = $(this), 
              title = $this.data("title");

          if (typeof(title) !== 'undefined') {
            $this.dialog("option", "title", title);
          }

          $this.find("input").on("keydown", function(ev) {
            var $input = $(this);
            if (!$input.is(".ui-autocomplete-input") || !$input.data("ui-autocomplete").menu.element.is(":visible")) {
              if (ev.key === "Enter") {
                ev.preventDefault();
                dfd.resolve($this);
                $this.dialog("close");
              }
            }
          });

          opts.open.call(self, this, opts.data);
        },
        close: function() {
          if (dfd.state() === 'pending') {
            dfd.reject(); // resolve any pending dfd, such as is the case when ESC-aping a dialog
          }
          //self.log("destroying dialog");
          $(this).dialog("destroy");
        },
        show: 'fade',
        modal: opts.modal,
        draggable: true,
        resizable: false,
        title: opts.title,
        width: opts.width,
        position: opts.position
      });
    }, function(xhr) {
      $.unblockUI()
      self.formManager.showMessage("error", xhr.responseText);
    });
  }).promise();
};

/*****************************************************************************
 * handler for the search&replace dialog
 */
$.NatEditor.prototype.handleSearchReplace = function(elem) {
  var self = this,
      $dialog = $(elem),
      search = $dialog.find("input[name='search']").val(),
      replace = $dialog.find("input[name='replace']").val(),
      ignoreCase = $dialog.find("input[name='ignorecase']:checked").length?true:false,
      count;

  self.log("handleSearchReplace, search='"+search+" 'replace='"+replace+"' ignoreCase=",ignoreCase);

  if (search.length) {
    count = self.engine.searchReplace(search, replace, ignoreCase);
    if (count) {
      self.formManager.showMessage("info", $.i18n("replaced '%count%' time(s)", {count: count}));
    } else {
      self.formManager.showMessage("warning", $.i18n("search string '%search%' not found", {search: search}));
    }
  }
};

/*****************************************************************************
 * handler for the insert table dialog
 */
$.NatEditor.prototype.handleInsertTable = function(elem) {
  var self = this,
    $dialog = $(elem),
    rows = $dialog.find("input[name='rows']").val(),
    cols = $dialog.find("input[name='cols']").val(),
    heads = $dialog.find("input[name='heads']").val();

  return self.engine.insertTable({
    heads: heads,
    rows: rows,
    cols: cols,
  });
};

/*****************************************************************************
  * handler for the insert link dialog
  */
$.NatEditor.prototype.handleInsertLink = function(elem) {
  var self = this,
    $dialog = $(elem),
    opts = {},
    $currentTab = $dialog.find(".jqTab.current");
 
  //self.log("called openInsertTable()", $currentTab);

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
  } else {
    return;
  }

  //self.log("opts=",opts);
  return self.engine.insertLink(opts);
};

/*****************************************************************************
  * handler for the insert image dialog
  */
$.NatEditor.prototype.handleInsertImage = function(elem, opts) {
  var self = this, 
      $dialog = $(elem);

  opts = opts || {};

  opts.web = $dialog.find("[name=web]").val();
  opts.topic = $dialog.find("[name=topic]").val();
  opts.caption = $dialog.find("[name=caption]").val();
  opts.classList = $dialog.find("[name=classList]").val();
  opts.file = $dialog.find("[name=file]").val();
  opts.width = $dialog.find("[name=width]").val();
  opts.height = $dialog.find("[name=height]").val();
  opts.align = $dialog.find("[name=align]:checked").val();
  opts.type = $dialog.find("[name=type]:checked").val();

  return self.engine.insertImage(opts);
};

/*****************************************************************************
  * handler for the insert attachment dialog
  */
$.NatEditor.prototype.handleInsertAttachment = function(elem) {
  var self = this, $dialog = $(elem);
 
  return self.engine.insertLink({
    web: $dialog.find("input[name='web']").val(),
    topic: $dialog.find("input[name='topic']").val(),
    file: $dialog.find("select[name='file']").val(),
    text: $dialog.find("input[name='linktext_attachment']").val()
  });
};

/*****************************************************************************
 * init the color dialog
 */
$.NatEditor.prototype.initColorDialog = function(elem/*, data*/) {
  var self = this,
      $dialog = $(elem),
      /*color = self.engine.getSelection(),*/
      inputField = $dialog.find("input[name='color']")[0];

  self.fb = $.farbtastic($dialog.find(".ui-natedit-colorpicker")).setColor("#fafafa").linkTo(inputField);

  return false;
};

/*****************************************************************************
 * parse selection for color code
 */
$.NatEditor.prototype.parseColorCode = function() {
  var self = this,
      selection = self.engine.getSelection() || '#ff0000';

  return {
    web: self.opts.web,
    topic: self.opts.topic,
    selection: selection
  };
};

/*****************************************************************************
 * init the date dialog
 */
$.NatEditor.prototype.openDatePicker = function(/*ev, ui*/) {
  var self = this,
      elem,
      date,
      selection = self.engine.getSelection();

  if (selection === '') {
    date = new Date();
  } else {
    try {
      date = new Date(selection);
    } catch (e) {
      self.formManager.showMessage("error", $.i18n("invalid date '%date%'", {date:selection}));
    }
  }

  if (typeof(self.datePicker) === 'undefined') {
      elem = $('<div class="ui-natedit-datepicker"/>').css("position", "absolute").appendTo(self.container).hide();

    self.overlay = $("<div>")
      .addClass("ui-widget-overlay ui-front")
      .hide()
      .appendTo(self.container)
      .on("click", function() {
        self.datePicker.hide();
        self.overlay.hide();
      });

    self.datePicker = elem.datepicker({
        onSelect: function() {
         var date = self.datePicker.datepicker("getDate");
          self.datePicker.hide();
          self.overlay.hide();
          self.engine.remove();
          self.engine.insert(self.formatDate(date));
        }
    }).draggable({handle:'.ui-widget-header'}).zIndex(self.overlay.zIndex()+1);

  }

  self.overlay.show();
  self.datePicker.datepicker("setDate", date);
    
  self.datePicker.show().focus().position({my:'center', at:'center', of:window});

  return false;
};

/*****************************************************************************
 * format a date the foswiki way
 */
$.NatEditor.prototype.formatDate = function(date) {
  /*var self = this;*/

  // TODO: make it smarter
  date = date.toDateString().split(/ /);
  return date[2]+' '+date[1]+' '+date[3];
};

/*************************************************************************/
$.NatEditor.prototype.hasChanged = function() {
  var self = this;

  self.log("called hasChanged");//, origValue=",self.origValue,"currentValue=",self.getValue());
  return (self.origValue !== self.getValue());
 
  // SMELL: does not cover edit and delete to orig value
  //return self.engine.hasChanged();
};

/*****************************************************************************
 * wrap text
 */
$.NatEditor.prototype.handleWrapText = function() {
  var self = this,
    lines = _wrapText(self.engine.getSelection() || "");

  self.engine.remove();
  self.engine.insert(lines);
};

$.NatEditor.prototype.handleInsertRow = function() {
  this.engine.insertTableRow();
};

$.NatEditor.prototype.handleDeleteRow = function() {
  this.engine.deleteTableRow();
};

$.NatEditor.prototype.handleInsertColumn = function() {
  this.engine.insertTableColumn();
};

$.NatEditor.prototype.handleDeleteColumn = function() {
  this.engine.deleteTableColumn();
};

$.NatEditor.prototype.handleMoveRowUp = function() {
  this.engine.moveTableRowUp();
};

$.NatEditor.prototype.handleMoveRowDown = function() {
  this.engine.moveTableRowDown();
};

$.NatEditor.prototype.handleMoveColumnLeft = function() {
  this.engine.moveTableColumnLeft();
};

$.NatEditor.prototype.handleMoveColumnRight = function() {
  this.engine.moveTableColumnRight();
};

/*****************************************************************************
 * inserts the color code
 */
$.NatEditor.prototype.handleInsertColorCode = function(/*elem*/) {
  var self = this, 
      color = self.fb.color;

  self.engine.remove();
  self.engine.insert(color);
};

/*************************************************************************/
$.NatEditor.prototype.handleUndo = function(/*elem*/) {
  var self = this;

  self.engine.undo();
};

/*************************************************************************/
$.NatEditor.prototype.handleRedo = function(/*elem*/) {
  var self = this;

  self.engine.redo();
};

/*************************************************************************/
$.NatEditor.prototype.handleSwitchEditor = function(/*elem*/) {
  var self = this,
    otherEngine = self.engine.id === "CodemirrorEngine" ? "TinyMCEEngine" : "CodemirrorEngine",
    dfd = $.Deferred();

  self.log("called handleSwitchEditor");
  self.log("current engine=",self.engine.id, "otherEngine=", otherEngine);

  dfd.promise().then(function(result) {

    self.createEngine(otherEngine).then(function(engine) {
      /* SMELL: the concept of a caret position is not available in tinymce
      var pos = self.engine.getCaretPosition();
      self.log("pos=",pos);
      */

      self.engine.getWrapperElement().hide();

      self.attachEngine(engine).then(function() {
        self.engine.getWrapperElement().show();
        if (self.opts.autoMaxExpand) {
          self.fixHeight();
        }
        self.engine.setValue(result);
        self.engine.focus();

        //self.engine.setCaretPosition(pos);
      });
    });
  });

  if (self.engine.type === "wysiwyg") {
    const html = self.engine.getValue();
    self.html2tml(html).then(function(result) {
      dfd.resolve(result);
    });
  } else {
    const tml = self.engine.getValue();
    self.tml2html(tml).then(function(result) {
      dfd.resolve(result);
    });
  }
};


/*************************************************************************
 * convert tml to html using WysiwygPlugin, returns a Deferred
 */
$.NatEditor.prototype.tml2html = function(tml) {
  var self = this,
      url = foswiki.getScriptUrl("rest", "NatEditPlugin", "tml2html");

  //self.shell.log("called tml2html", tml);

  return $.post(url, {
    topic: foswiki.getPreference("WEB")+"."+foswiki.getPreference("TOPIC"),
    t: (new Date()).getTime(),
    text: tml
  });
};

/*************************************************************************
 * convert html back to tml using WysiwygPlugin, returns a Deferred
 */
$.NatEditor.prototype.html2tml = function(html) {
  var self = this,
      url = foswiki.getScriptUrl("rest", "NatEditPlugin", "html2tml");

  //self.shell.log("called html2tml", tml);

  return $.post(url, {
    topic: foswiki.getPreference("WEB")+"."+foswiki.getPreference("TOPIC"),
    t: (new Date()).getTime(),
    text: html
  });
};

/*****************************************************************************
 * sort selection 
 */
$.NatEditor.prototype.handleSortAscending = function(/*ev, elem*/) {
  var self = this;
  self.sortSelection("asc");
};

$.NatEditor.prototype.handleSortDescending = function(/*ev, elem*/) {
  var self = this;
  self.sortSelection("desc");
};

$.NatEditor.prototype.sortSelection = function(dir) {
  var self = this,
    selection, lines, ignored, isNumeric = true, value,
    line, prefix, i;

  //self.log("sortSelection ", dir);

  selection = self.engine.getSelectionLines().split(/\r?\n/);

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

  //self.log("isNumeric=",isNumeric);
  //self.log("sorting lines",lines);

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

  //self.log("result=\n'"+selection+"'");

  self.engine.remove();
  self.engine.insert(selection);
};

/*****************************************************************************
  * init the link dialog 
  */
$.NatEditor.prototype.initLinkDialog = function(dialogElem) {
  var self = this,
      $dialog = $(dialogElem),
      xhr, requestIndex = 0,
      $container = $dialog.find(".jqTab.current"),
      $fileSelect = $dialog.find(".natEditAttachmentSelector");

  if ($container.length === 0) {
    $container = $dialog;
  }

  function loadAttachments(web, topic) {
    var selection = $fileSelect.data("selection") || '',
        filter = $fileSelect.data("filter") || ".*",
        filterRegEx = new RegExp(filter, "i");

    web = web || $container.find("input[name='web']").val();
    topic = topic || $container.find("input[name='topic']").val();
    $.ajax({
      url: self.opts.attachmentsUrl,
      data: {
        topic: web+"."+topic,
        _t: Date.now()
      },
      dataType: "json"
    }).done(function(json) {
      var options = [];
      options.push("<option></option>");
      $(json).each(function(i, item) {
        if (filterRegEx.test(item.name)) {
          options.push("<option"+(selection === item.name?" selected":"")+">"+item.name+"</option>");
        }
      });
      $fileSelect.html(options.join(""));
    });
  }

  $dialog.find("input[name='web']").each(function() {
    $(this).autocomplete({
      source: self.opts.webUrl
    });
  }).on("change", function() {
    loadAttachments();
  });

  $dialog.find("input[name='topic']").each(function() {
      $(this).autocomplete({
      source: function(request, response) {
        var baseWeb = $container.find("input[name='web']").val();
        if (xhr) {
          xhr.abort();
        }
        xhr = $.ajax({
          url: self.opts.topicUrl,
          data: $.extend(request, {
            baseweb: baseWeb
          }),
          dataType: "json",
          autocompleteRequest: ++requestIndex,
          success: function(data) {
            if (this.autocompleteRequest === requestIndex) {
              $.each(data, function(index, item) {
                item.value = item.value.replace(baseWeb+".", "");
              });
              response(data);
            }
          },
          error: function() {
            if (this.autocompleteRequest === requestIndex) {
              response([]);
            }
          }
        });
      }
    });
  }).on("change", function() {
    loadAttachments();
  });

  loadAttachments();
};

/*****************************************************************************
  * create the link dialog 
  */
$.NatEditor.prototype.linkDialog = function(dialogData) {
  var self = this;

  if (typeof(dialogData) === "string") {
    dialogData = self.parseLink(dialogData);
  }

  self.dialog({
    name: "insertlink",
    open: function(elem) {
      self.initLinkDialog(elem);
    },
    data: dialogData
  }).done(function(dialog) {
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
      self.engine.insertLink(opts);
    }, function(dialog) {
      //cancelHandler.call(self, dialog);
    }
  );
};

/*****************************************************************************
  * create the image dialog 
  */
$.NatEditor.prototype.imageDialog = function(ev) {
  var self = this,
      opts = self.parseImageSelection();

  self.dialog({
    name: "insertimage",
    open: function(elem) {
      self.initImageDialog(elem);
    },
    data: opts,
    event: ev
  }).done(function(dialog) {
    self.handleInsertImage(dialog, opts);
  });
};

/*****************************************************************************
  * init the image dialog 
  */
$.NatEditor.prototype.initImageDialog = function(dialogElem) {
  var self = this;

  self.log("initImageDialog on dialog=",dialogElem);

  self.initLinkDialog(dialogElem);
};

/*****************************************************************************
  * cancel the attachments dialog; abords any upload in progress
  */
$.NatEditor.prototype.cancelAttachmentsDialog = function(dialogElem/*, data*/) {
  var self = this;

  self.log("cancelAttachmentsDialog on dialogElem=",dialogElem);

  if (typeof(self.uploader) !== 'undefined') {
    self.log("stopping uploader");
    //self.uploader.trigger("Stop");
  } else {
    self.log("no uploader found");
  }
};

/*****************************************************************************
 * parse an url into its components, returns a hash
 * {
 *    web: "...,
 *    topic: "...,
 *    file: "...,
 *    type: "...,
 * }
 */
$.NatEditor.prototype.parseUrl = function(text) {
  var self = this, 
      data = {
        web: self.opts.web,
        topic: self.opts.topic,
      };

  //console.log("called parseUrl()",text);

  if (text.match(/^(?:%ATTACHURL(?:PATH)?%\/)(.*?)$/)) {
    //console.log("here1");
    data.file = RegExp.$1;
    data.type = "attachment";
  } else if (text.match(/(?:(?:%PUBURL(?:PATH)?%|\/pub)\/)(.*)\/(.*?)\/(.*?)$/)) {
    //console.log("here2");
    data.web = RegExp.$1;
    data.topic = RegExp.$2;
    data.file = RegExp.$3;
    data.type = "pub";
  } else {
    //console.log("here4");
    data.type = "unknown";
  }

  //console.log("parsed url=",data);

  return data;
};

/*****************************************************************************
 * parse the selected image
 */
$.NatEditor.prototype.parseImageSelection = function() {
  var self = this;

  return self.engine.getImageData();
};

/*****************************************************************************
 * parse the current selection and return the data to be used generating the tmpl
 */
$.NatEditor.prototype.parseLink = function(text) {
  var self = this, data,
      urlRegExp = "(?:file|ftp|gopher|https?|irc|mailto|news|nntp|telnet|webdav|tel|sip|edit)://[^\\s]+?";

  data = {
    selection: text,
    web: self.opts.web,
    topic: self.opts.topic,
    file: '',
    url: '',
    type: 'topic',
  };

  if (typeof(text) === 'undefined') {
    text = self.engine.getSelection();
  }

  // initialize from text
  if (text.match(/\s*\[\[(.*?)\]\]\s*/)) {
    text = RegExp.$1;
    //self.log("brackets link, text=",text);
    if (text.match("^("+urlRegExp+")(?:\\]\\[(.*))?$")) {
      //self.log("external link");
      data.url = RegExp.$1;
      data.selection = RegExp.$2 || '';
      data.type = 'external';
    } else if (text.match(/^(?:%ATTACHURL(?:PATH)?%\/)(.*?)(?:\]\[(.*))?$/)) {
      //self.log("this attachment link");     
      data.file = RegExp.$1;
      data.selection = RegExp.$2;
      data.type = "attachment";
    } else if (text.match(/^(?:%PUBURL(?:PATH)?%\/)(.*)\/(.*?)\/(.*?)(?:\]\[(.*))?$/)) {
      //self.log("other topic attachment link");     
      data.web = RegExp.$1;
      data.topic = RegExp.$2;
      data.file = RegExp.$3;
      data.selection = RegExp.$4;
      data.type = "attachment";
    } else if (text.match(/^(?:(.*)\.)?(.*?)(?:\]\[(.*))?$/)) {
      //self.log("topic link");
      data.web = RegExp.$1 || data.web;
      data.topic = RegExp.$2;
      data.selection = RegExp.$3 || '';
    } else {
      //self.log("some link");
      data.topic = text;
      data.selection = '';
    }
  } else if (text.match("^ *"+urlRegExp)) {
    //self.log("no brackets external link");
    data.url = text;
    data.selection = '';
    data.type = "external";
  } else if (text.match(/^\s*%IMAGE\{(.*?)\}%\s*$/)) {
    let params = new foswiki.Attrs(RegExp.$1);
    //self.log("image link");
    params.keys().filter(key => key[0] !== '_').forEach(function(key) {
      data[key] = params.get(key);
    });
    data[file] = params.get("_default");
    data.selection = '';
    data.type = "attachment";
  } else {
    if (text.match(/^\s*([A-Z][^\s.]*)\.(A-Z.*?)\s*$/)) {
      //self.log("topic link");
      data.web = RegExp.$1 || data.web;
      data.topic = RegExp.$2;
      data.selection = '';
      data.type = "topic";
    } else {
      //self.log("some text, not a link");
    }
  }

  return data;
};

/*************************************************************************
 * handler for keydown events
 */
$.NatEditor.prototype.handleKeyDown = function(ev) {
  var self = this;

  self.preventDefault = false;

  if (self.dropdown.isVisible()) {

    if (ev.key === "ArrowUp") {
      self.dropdown.selectPrev();
      self.preventDefault = true;
    } else if (ev.key === "ArrowDown") {
      self.dropdown.selectNext();
      self.preventDefault = true;
    } else if (ev.key === "Enter") {
      self.dropdown.hide();
      self.preventDefault = true;
      self.dropdown.callback();
    } else if (ev.key === "Escape") {
      self.dropdown.hide();
      self.preventDefault = true;
    } 

    if (self.preventDefault) {
      ev.preventDefault();
      return false;
    }
  }
};

/*************************************************************************
 * handler for keyup events
 */
$.NatEditor.prototype.handleKeyUp = function(ev) {
  var self = this;

  if (self.preventDefault) {
    return;
  }

  var lineStart = self.engine.getBeforeCursor(),
      lineEnd = self.engine.getAfterCursor(1),
      found = false,
      prefix;

  for (const completion of self.opts.completions) {
    if (lineEnd.match(/^(\s|$)/) && completion.match.test(lineStart)) {
      found = true;
      prefix = RegExp.$1;
      _debounce(function() {
        self.execCompletion(completion, prefix);
      }, 250)();
      break;
    }
  }

  if (!found) {
    self.dropdown.hide();
  }

  //console.log("no match for '"+lineStart+"'");
};

/*************************************************************************
 * process completion for a given string
 */
$.NatEditor.prototype.execCompletion = function(completion, string) {
  var self = this,
      coords = self.engine.getCursorCoords(-string.length),
      pos = self.engine.getCaretPosition();

  //console.log("execCompletion",completion.id,"for",string,"pos=",pos,"coords=",coords);
  completion.search.call(self, string).then(function(data) {
      var list = [];

      $.each(data, function(i, hit) {
        list.push(
          $("<li>"+completion.template.call(self, hit)+"</li>")
            .data("callback", function() {
              var result = completion.result.call(self, hit),
                  line = pos.line,
                  ch = pos.ch - string.length;

              //console.log("string=",string,",result='"+result+"', ch=",ch,"length=",string.length);
              self.engine.replace(result, {
                  line: line,
                  ch: ch
                }, {
                  line: pos.line, 
                  ch: pos.ch}
                );
            })
            .on("click", function() {
              self.dropdown.hide();
              self.dropdown.callback($(this));
              self.engine.focus();
            })
        );
      });

      if (list.length) {
        self.dropdown.set(list).show({
          top: coords.bottom,
          left: coords.left
        });
      } else {
        self.dropdown.hide();
      }
  });
};

/*************************************************************************
 * cached version of getJSON
 */
$.NatEditor.prototype.getJSON = function(url) {
  var self = this,
      dfd = $.Deferred(),
      data;

  if (typeof(self.cache) === 'undefined') {
    self.cache = new Map();
  }

  data = self.cache.get(url);
  if (data) {
    //console.log("found in cache",url);
    dfd.resolve(data);
    return dfd;
  }  

  if (self._prevXHR) {
    //console.log("aborting prev xhr",self._prevXHR);
    self._prevXHR.abort();
  }

  //console.log("fetching",url);
  self._prevXHR = $.getJSON(url);
  self._prevXHR.then(function(data) {
    self.cache.set(url, data);
    self._prevXHR = null;
    dfd.resolve(data);
  });

  return dfd;
};

/***************************************************************************
 * plugin defaults
 */
$.NatEditor.defaults = {

  // toggle debug output
  debug: false,

  // toolbar template
  toolbarTemplate: "edittoolbar",
  toolbar: "edittoolbar",

  // Elements 0 and 2 are (respectively) prepended and appended.  Element 1 is the default text to use,
  // if no text is currently selected.

  h1Markup: ['---+!! ','%TOPIC%',''],
  h2Markup: ['---++ ','Headline text',''],
  h3Markup: ['---+++ ','Headline text',''],
  h4Markup: ['---++++ ','Headline text',''],
  h5Markup: ['---+++++ ','Headline text',''],
  h6Markup: ['---++++++ ','Headline text',''],
  verbatimMarkup: ['<verbatim>\n','Insert non-formatted text here','\n</verbatim>'],
  quoteMarkup: ['<blockquote>\n','Insert quote here','\n</blockquote>'],
  boldMarkup: ['*', 'Bold text', '*'],
  italicMarkup: ['_', 'Italic text', '_'],
  monoMarkup: ['=', 'Monospace text', '='],
  underlineMarkup: ['<u>', 'Underlined text', '</u>'],
  strikeMarkup: ['<del>', 'Strike through text', '</del>'],
  superscriptMarkup: ['<sup>', 'superscript text', '</sup>'],
  subscriptMarkup: ['<sub>', 'subscript text', '</sub>'],
  colorMarkup: ['%COLOR%','colored text','%ENDCOLOR%'],
  leftMarkup: ['<p align="left">\n','Align left','\n</p>'],
  centerMarkup: ['<p align="center">\n','Center text','\n</p>'],
  rightMarkup: ['<p align="right">\n','Align right','\n</p>'],
  justifyMarkup: ['<p align="justify">\n','Justify text','\n</p>'],
  numberedListMarkup: ['   1 ','enumerated item',''],
  bulletListMarkup: ['   * ','bullet item',''],
  indentMarkup: ['   ','',''],
  outdentMarkup: ['','',''],
  mathMarkup: ['<latex title="Example">\n','\\sum_{x=1}^{n}\\frac{1}{x}','\n</latex>'],
  signatureMarkup: ['-- ', '[[%WIKINAME%]], ' - '%DATE%'],
  horizRulerMarkup: ['', '---', '\n'],
  clearMarkup: ['', '%CLEAR%', '\n'],
  autoHideToolbar: false,
  autoMaxExpand:false,
  minHeight:0,
  maxHeight:0,
  autoResize:false,
  resizable:false,
  engine: 'raw',
  showToolbar: true,
  showFullscreen: true,
  completions: [{
    "id": "emoji",
    "match": /(?:(?<=[\s<>|])|^):(\*?[a-z0-9_+-]+)$/, 
    "search": function(term) {
      var dfd = $.Deferred(), 
          entries,
          star = false;

      if (term.match(/^\*(.*)$/)) {
        star = true;
        term = RegExp.$1;
      }

      term = "^" + (star?".*":"") + _escapeRegExp(term) + ".*";

      entries = Emojis.search(term, {
        limit:20 
      });

      dfd.resolve(entries);

      return dfd.promise();
    },
    "template": function(hit) {
      var url = Emojis.getUrl(hit.id);
      return `<img src="${url}"/>&nbsp;${hit.id}`;
    },
    "result": function(hit) {
      return `${hit.id}:`;
    }
  }, {
    "id": "mention",
    "match": /(?:(?<=[\s<>|])|^)(@\*?\w+)$/,
    "search": function(string) {
      var url = foswiki.getScriptUrl("rest", "NatEditPlugin", "complete", {
        "mode": "mention",
        "term": encodeURIComponent(string)
      });
      return this.getJSON(url);
    },
    "template": function(hit) {
      return hit.title;
    },
    "result": function(hit /*, coords*/) {
      return `@${hit.topic}`;
    }
  }, {
    "id": "topic", 
    "match": new RegExp(`\\B(\\[\\[[\\*${foswiki.RE.upper}][${foswiki.RE.alnum}\\.]*)$`), 
    "search": function(string) {
      var url = foswiki.getScriptUrl("rest", "NatEditPlugin", "complete", {
        "mode": "topic",
        "limit": 5,
        "web": this.opts.web,
        "term": encodeURIComponent(string)
      });
      return this.getJSON(url);
    },
    "template": function(hit) {
      return hit.title;
    },
    "result": function(hit) {
      if (hit.web === this.opts.web) {
        return `[[${hit.topic}]]`;
      } else {
        return `[[${hit.web}.${hit.topic}]]`;
      }
    },
  }]
};

/*****************************************************************************
 * register to jQuery 
 */
$.fn.natedit = function(opts) {
  //self.log("called natedit()");

  // defaults that need to be computed
  if (!initedDefaults) {
    const natEditPlugin = foswiki.getPreference("NatEditPlugin");
    initedDefaults = true;
    $.NatEditor.version = natEditPlugin.version;
    $.NatEditor.defaults.debug = natEditPlugin.debug;
    $.NatEditor.defaults.web = foswiki.getPreference("WEB");
    $.NatEditor.defaults.topic = foswiki.getPreference("TOPIC");
    $.NatEditor.defaults.systemWeb = foswiki.getPreference("SYSTEMWEB");
    $.NatEditor.defaults.pubUrl = foswiki.getPreference("PUBURL");
    $.NatEditor.defaults.signatureMarkup = ['-- ', '[['+foswiki.getPreference("WIKIUSERNAME")+']]', ' - '+foswiki.getPreference("SERVERTIME")];
    $.NatEditor.defaults.engine = natEditPlugin.Engine;
    $.NatEditor.defaults.attachmentsUrl = foswiki.getScriptUrl("rest", "NatEditPlugin", "attachments");
    $.NatEditor.defaults.webUrl = foswiki.getScriptUrl("view", $.NatEditor.defaults.systemWeb, "JQueryAjaxHelper", {
      section: "web",
      skin: "text",
      contenttype: "application/json"
    });
    $.NatEditor.defaults.topicUrl = foswiki.getScriptUrl("view", $.NatEditor.defaults.systemWeb, "JQueryAjaxHelper", {
      section: 'topic',
      skin: 'text',
      contenttype: 'application/json',
    });
  }

  // build main options before element iteration
  var thisOpts = $.extend({}, $.NatEditor.defaults, opts);

  return this.each(function() {
    if (!$.data(this, "natedit")) {
      $.data(this, "natedit", new $.NatEditor(this, thisOpts));
    }
  });
};

/***************************************************************************
 * definitions for editor engines
 */
$.NatEditor.factory = {

/* 
  "engine id": {
    ...
  }
*/

};

/*****************************************************************************
 * initializer called on dom ready
 */
$(function() {
  $(".natedit").livequery(function() {
    $(this).natedit();
  });
});

})(jQuery);
