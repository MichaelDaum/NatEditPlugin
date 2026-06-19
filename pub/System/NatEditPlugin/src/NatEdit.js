/*
 * NatEdit Shell
 *
 * Copyright (c) 2008-2026 Michael Daum http://michaeldaumconsulting.com
 *
 * Licensed under the GPL license http://www.gnu.org/licenses/gpl.html
 *
 */

/*global StrikeOne:false DropDownMenu:false _escapeRegExp:false Emojis:false */

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

  self.opts = $.extend(true, {
    name: self.txtarea.attr("name")
  }, opts, self.txtarea.data());

  self.id = foswiki.getUniqueID();
  self.isBlockedUnload = false;
  self.referrer = document.referrer;
  self.topicTitleCache = {};
  self.engines = {};

  self.log("creating new natedit");

  self.container = self.txtarea.wrap('<div class="ui-natedit"></div>').parent();
  self.container.attr("id", self.id);
  self.txtarea.attr("id", "txtarea_"+self.id);
  self.container.data("natedit", self);
  self.textFormat = $(`<input type='hidden' name='_text_format_${self.opts.name}' />`).prependTo(self.form);

  if (self.opts.hidden || self.txtarea.is(".foswikiHidden")) {
    self.log("not creating engine for hidden editor");
    // just init the shell, not any engine
    self.container.addClass("foswikiHidden");
    self.createEngine().done(function(engine) {
      return self.attachEngine(engine);
    }).done(function() {
      self.txtarea.trigger("inited");
      self.isInited = true;
      self.container.css("opacity", 1);
    }).fail(function() {
      console.error("failed to create engine");
    });
  } else {
    // init shell and engine
    self.txtarea.addClass("ui-widget");
    self.container.css("opacity", 0);
    self.preloadTemplate(self.opts.toolbarTemplate, self.opts.toolbar)
    .then(function() {
      return self.createEngine();
    }).then(function(engine) {
      return self.attachEngine(engine);
    }).then(function() {
      self.txtarea.trigger("inited");
      self.isInited = true;
      self.initGui();
      self.container.css("opacity", 1);
    }).fail(function() {
      console.error("failed to create engine");
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
      //console.log("loading engine source");
      self.loadScript(url).then(function() {
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

/**
 * load the given script resource into the page by injecting a <script> element into the head
 * @param url: src parameter of the script element
 *
 * Note that multiple calls to loadScript() with the same url will result in only one script
 * element being created. The function returns a promis that will be resolved when the script
 * has been loaded, or rejected when the script couldn't be loaded.
 */
$.NatEditor.prototype.loadScript = function(url) {
  var dfd, script;

  url = url + `?version=${$.NatEditor.version}`;

  $(`script[src="${url}"]`).each(function() {
    dfd = this._dfd;
    return false;
  });

  if (dfd) {
    //console.warn("url already loaded",url);
    return dfd.promise();
  }

  dfd = $.Deferred();

  script = document.createElement('script');
  script.async = true;
  script.src = url;
  script._dfd = dfd;

  script.addEventListener('load', function() { 
    //console.warn("finished loading",url);
    dfd.resolve();
  }); 

  script.addEventListener('error', function() {
    console.warn("rejected loading",url);
    dfd.reject('Error loading script '+url);
  });

  script.addEventListener('abort', function() { 
    console.warn("abort loading",url);
    dfd.reject('Script loading aborted.');
  });

  document.head.appendChild(script);

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
      dfd = $.Deferred(),
      webTopic = self.formManager.getWebTopic();

  topic = foswiki.normalizeWebTopicName(webTopic[0], topic).join(".");

  topicTitle = self.topicTitleCache[topic];

  if (topicTitle) {
    //self.log("found topicTitle in cache",topicTitle);
    dfd.resolve(topicTitle);
  } else {
    //self.log("fetching topicTitle for", topic);

    $.get(foswiki.getScriptUrl("rest", "NatEditPlugin", "topicTitle"), {
      topic: webTopic.join("."),
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
  } else {
    // remember height to fix toggling back from fullscreen
    const size = self.getSize();
    if (size) {
      self.setSize(undefined, size.height);
    }
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
  var self = this,
      webTopic = self.formManager.getWebTopic();

  if (self.toolbar !== undefined || $.templates[self.opts.toolbar] === undefined) {
    return;
  }

  // init it
  self.toolbar = $($.templates[self.opts.toolbar].render({
    web: webTopic[0],
    topic: webTopic[1],
  }));
  self._origParagraphLabel = self.toolbar.find(".ui-natedit-paragraph-label").text();

  if (self.opts.showFullscreen) {
    self.toolbar.find(".ui-natedit-fullscreen-button").show();
  } else {
    self.toolbar.find(".ui-natedit-fullscreen-button").hide();
  }

  if (!self.opts.showToolbar) {
    self.toolbar.hide();
  } 

  self.container.prepend(self.toolbar);

  // control groups
  self.toolbar.find(".ui-natedit-buttons").controlgroup({onlyVisible:false}).on("click", function(ev) {
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
        $menu = ($this.data("menu") === undefined) ? $this.next() : $(self.container.find($this.data("menu"))),
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
      webTopic = self.formManager.getWebTopic(),
      okayHandler = function() {},
      cancelHandler = function() {},
      openHandler = function() {},
      optsHandler = function() {
        return {
          web: webTopic[0],
          topic: webTopic[1],
          selection: self.engine.getSelection()
        };
      };

  if (ui === undefined || ui.length === 0) {
    return;
  }

  // call engine on toolbar action
  itemData = self.engine.handleToolbarAction(ui);

  if (itemData === undefined) {
    return;
  }

  //self.log("handleToolbarAction data=",itemData)

  // insert markup mode
  if (itemData.markup !== undefined) {
    itemData.value = self.opts[itemData.markup];
  }

  // insert markup by value 
  if (itemData.value !== undefined) {
    if (itemData.type === 'line') {
      self.engine.insertLineTag(itemData.value);
    } else {
      if (typeof(itemData.value) === 'string') {
        self.engine.insert(itemData.value);
      } else {
        self.engine.insertTag(itemData.value);
      }
    }
  }

  // dialog mode
  if (itemData.dialog !== undefined) {

    if (itemData.okayHandler !== undefined && typeof(self[itemData.okayHandler]) === 'function') {
      okayHandler = self[itemData.okayHandler];
    }

    if (itemData.cancelHandler !== undefined && typeof(self[itemData.cancelHandler]) === 'function') {
      cancelHandler = self[itemData.cancelHandler];
    }

    if (itemData.openHandler !== undefined && typeof(self[itemData.openHandler]) === 'function') {
      openHandler = self[itemData.openHandler];
    }

    if (itemData.optsHandler !== undefined && typeof(self[itemData.optsHandler]) === 'function') {
      optsHandler = self[itemData.optsHandler];
    }

    dialogData = optsHandler.call(self);

    self.dialog({
      name: itemData.dialog,
      open: function(elem) {
        openHandler.call(self, elem);
      },
      data: dialogData,
      modal: itemData.modal,
      okayText: itemData.okayText,
      cancelText: itemData.cancelText,
      width: itemData.dialogWidth,
      height: itemData.dialogHeight,
    }).then(function(dialog) {
        okayHandler.call(self, dialog, dialogData);
      }, function(dialog) {
        cancelHandler.call(self, dialog);
      }
    );
  }

  // method mode 
  if (itemData.handler !== undefined) {
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
    $this.menu("collapseAll", null, true);
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
    self.log("engine=",self.engine);
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
    return self.engine.setSize(width, height);
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
      url,
      webTopic = self.formManager.getWebTopic();

  name = name || template;

  url = foswiki.getScriptUrl("rest", "JQueryPlugin", "tmpl", {
    topic: webTopic.join("."),
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
    webTopic = self.formManager.getWebTopic(),
    defaults = {
      url: undefined,
      title: $.i18n("Confirmation required"),
      okayText: $.i18n("OK"),
      okayIcon: "ui-icon-check",
      cancelText: $.i18n("Cancel"),
      cancelIcon: "ui-icon-cancel",
      width: 'auto',
      height: 'auto',
      modal: true,
      position: {
        my:'center', 
        at:'center',
        of: window
      },
      open: function() {},
      data: {
        web: webTopic[0],
        topic: webTopic[1],
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

  if (opts.url === undefined && opts.name !== undefined) {
    opts.url = foswiki.getScriptUrl("rest", "JQueryPlugin", "tmpl", {
      topic: webTopic.join("."),
      load: "editdialog",
      name: opts.name
    });
  }

  opts = $.extend(true, {}, defaults, opts);
  if(/AUTOINC\d+$/.test(opts.data.topic)) {
    opts.data.topic = "";
  }
 
  if (opts.event !== undefined) {
    opts.position = {
      my: 'center top',
      at: 'left bottom+30',
      of: opts.event.target
    };
  }

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

          if (title !== undefined) {
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
        height: opts.height,
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
 
  //self.log("called called handleInsertLink()", $currentTab);

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
    const $select = $currentTab.find("select[name='file']");
    opts = {
      web: $currentTab.find("input[name='web']").val(),
      topic: $currentTab.find("input[name='topic']").val(),
      file: $select.data("select2") ? $select.select2("data").id : $select.val(),
      text: $currentTab.find("input[name='linktext_attachment']").val()
    };
  } else {
    return;
  }

  return self.engine.insertLink(opts);
};

/*****************************************************************************
  * handler for the insert image dialog
  */
$.NatEditor.prototype.handleInsertImage = function(elem, opts) {
  var self = this, 
      $dialog = $(elem);

  opts = opts || {};

  $dialog.find("[name]").each(function() {
    var $this = $(this), 
        name = $this.attr("name");

    if ($this.is(":radio") || $this.is(":checkbox")) {
      if ($this.is(":checked") || $this.is(":selected")) {
        opts[name] = $this.val();
      }
    } else {
      opts[name] = $this.data("select2") ? $this.select2("data").id : $this.val();
    }

    if (name === "file") {
      self.form.find('.newFile').filter(function(i, elem) {
        return $(elem).data("file") === opts[name];
      }).each(function() {
        opts.src = URL.createObjectURL(this.files[0]);
      });
    }
  });

  if (opts.type === 'simple') {
    delete opts.type;
  }

  return self.engine.insertImage(opts);
};

/*****************************************************************************
  * handler for the insert attachment dialog
  */
$.NatEditor.prototype.handleInsertAttachment = function(elem) {
  var self = this, $dialog = $(elem),
      $select = $dialog.find("select[name='file']");
 
  //console.log("called handleInsertAttachment");

  return self.engine.insertLink({
    web: $dialog.find("input[name='web']").val(),
    topic: $dialog.find("input[name='topic']").val(),
    file: $select.data("select2") ? $select.select2("data").id : select.val(),
    text: $dialog.find("input[name='linktext_attachment']").val()
  });
};

/*****************************************************************************
 * init the color dialog
 */
$.NatEditor.prototype.initColorDialog = function(elem) {
  var self = this,
      $dialog = $(elem),
      /*color = self.engine.getSelection(),*/
      inputField = $dialog.find("input[name='color']")[0];

  self.fb = $.farbtastic($dialog.find(".ui-natedit-colorpicker")).linkTo(inputField);

  return false;
};

/*****************************************************************************
 * parse selection for color code
 */
$.NatEditor.prototype.parseColorCode = function() {
  var self = this,
      selection = self.engine.getSelection() || '#ff0000',
      webTopic = self.formManager.getWebTopic();

  return {
    web: webTopic[0],
    topic: webTopic[1],
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

  if (self.datePicker === undefined) {
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
    otherEngine = (self.engine.id === "CodemirrorEngine" ? "TinyMCEEngine" : "CodemirrorEngine"),
    dfd = $.Deferred();

  self.log("called handleSwitchEditor");
  self.log("current engine=",self.engine.id, "otherEngine=", otherEngine);
  self.toolbar.find(".ui-natedit-paragraph-label").text(self._origParagraphLabel);

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
        self.txtarea.val(result)
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
    topic: self.formManager.getWebTopic().join("."),
    attach: "off",
    t: (new Date()).getTime(),
    text: html
  });
};

/*****************************************************************************
 * sort selection 
 */
$.NatEditor.prototype.handleSortAscending = function(/*ev, elem*/) {
  var self = this;
  self.engine.sortSelection("asc");
};

$.NatEditor.prototype.handleSortDescending = function(/*ev, elem*/) {
  var self = this;
  self.engine.sortSelection("desc");
};

/*****************************************************************************
  * init a dialog 
  */
$.NatEditor.prototype.initDialog = function(dialogElem, opts) {
  var self = this,
      $dialog = $(dialogElem),
      xhr, requestIndex = 0,
      $fileSelect = $dialog.find(".natEditAttachmentSelector"),
      $fileUpload = $dialog.find(".natEditFileUpload"),
      webTopic = self.formManager.getWebTopic(),
      geometryOfFile = {};

  // get the container of the current part of the dialog
  function getContainer() {
    var $container = $dialog.find(".jqTab.current");
    return $container.length ? $container : $dialog;
  }

  // load attachments for the given or selected web.topic
  function loadAttachments(web, topic) {
    var selection = $fileSelect.data("selection") || '',
        filter = $fileSelect.data("filter") || ".*",
        filterRegEx = new RegExp(filter, "i"),
        $container = getContainer();

    web = web || $container.find("input[name='web']").val() || webTopic[0];
    topic = topic || $container.find("input[name='topic']").val() || webTopic[1];

    self.log("loading attachments from",web,topic);
    return $.ajax({
      url: self.opts.attachmentsUrl,
      data: {
        topic: web+"."+topic,
        _t: Date.now()
      },
      dataType: "json"
    }).done(function(json) {
      var options = [];
      var files = new Set();

      json.forEach(function(elem) {
        files.add(elem.name);
        geometryOfFile[elem.name] = {
          width: elem.width,
          height: elem.height,
        };
      });

      // gather newFiles
      self.form.find(".newFile").each(function() {
        files.add(this.files[0].name);
      });

      if (!files.has(selection) && selection !== '') {
        files.add(selection);
      }

      files = Array.from(files).sort();

      options.push("<option></option>");
      files.forEach(function(file) {
        if (filterRegEx.test(file) || /^(blob|data):/.test(file)) {
          options.push(`<option ${selection === file?" selected='selected'":""}>${file}</option>`);
        }
      });
      $fileSelect.html(options.join("")).trigger("reset");
      $fileSelect[0].selectedIndex = -1;
    });
  }

  // init web selector
  $dialog.find("input[name='web']").each(function() {
    $(this).autocomplete({
      source: self.opts.webUrl,
      change: function() {
        loadAttachments();
      },
      select: function(ev, ui) {
        loadAttachments(ui.item.value);
      }
    });
  });

  // init topic selector
  $dialog.find("input[name='topic']").each(function() {
      $(this).autocomplete({
      source: function(request, response) {
        var $container = getContainer(),
          baseWeb = $container.find("input[name='web']").val();

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
      },
      change: function() {
        loadAttachments();
      },
      select: function(ev, ui) {
        loadAttachments(undefined, ui.item.value);
      }
    });
  });

  // init file upload
  $fileUpload.on("change", function() {
    var id = foswiki.getUniqueID(),
      clone = $fileUpload
        .clone(1)
        .removeClass("natEditFileUpload")
        .addClass("newFile")
        .removeAttr("id")
        .attr("name", id)
        .prependTo(self.form),
        file = clone[0].files[0],
        fileName = file.name;

      clone.attr("data-file", fileName);

      self.engine.registerBlob({
        id: id,
        elem: clone,
        file: file,
        fileName: fileName,
      }).done(function(fileName) {
        $fileSelect.data("selection",fileName);
        $fileSelect.select2("val", fileName);
      });

      msg = $("<div>")
        .append(fileName)
        .append("<div class='ui-natedit-discard'><i class='ui-icon ui-icon-cancel'></i> <a href='#'>"+$.i18n("Discard Upload")+"</a></div>")
        .on("click", function() {
          self.form.find(`[name=${id}]`).remove();
          $(this).trigger("close.pnotify");
          $(".natEditAttachmentSelector").trigger("refresh");
          return false;
        });

    $fileSelect.data("selection",fileName);
    loadAttachments().then(function() {
      $fileSelect.select2("val", fileName);
    });
    
    var pnotify = self.formManager.showMessage(
      "info", 
      msg[0], $.i18n("New File"), 
      {
        hide: false,
        text_escape: false,
        insert_brs: false
      }
    ).on("close.pnotify", function() {
      pnotify.remove();
    });
  });

  // add event handler
  $fileSelect.on("refresh", function() {
    $fileUpload.val("");
    loadAttachments();
  });

  $fileSelect.on("change", function(data) {
    var geom = geometryOfFile[data.val];
    if (geom) {
      $dialog.find("[name=width]").val(geom.width);
      $dialog.find("[name=height]").val(geom.height);
    }
  });

  $dialog.find(".ui-natedit-get-document-title").on("click", function() {
    var $button = $(this),
      $icon = $button.find(".foswikiIcon"),
      $container = getContainer(),
      url = $container.find("input[name=url]").val();
    if (url) {
      $icon.addClass("fa-spin");
      $.get(foswiki.getScriptUrl("rest", "NatEditPlugin", "documentTitle", {
        topic: webTopic.join("."),
        url: url
      })).done(function(data) {
        if (data) {
          $container.find("input[name=linktext_external]").val(data);
        }
      }).always(function() {
        $icon.removeClass("fa-spin");
      });
    }
    return false;
  });

  // init attachments
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

  return self.dialog({
    name: "insertlink",
    open: function(elem) {
      self.initLinkDialog(elem, dialogData);
    },
    data: dialogData,
    width: 800,
  }).then(function(dialog) {
      var $currentTab = $(dialog).find(".jqTab.current"),
          opts,
          $select = $currentTab.find("select[name='file']");

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
          file: $select.data("select2") ? $select.select2("data").id : $select.val(),
          text: $currentTab.find("input[name='linktext_attachment']").val()
        };
      }
      return self.engine.insertLink(opts);
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
      self.initImageDialog(elem, opts);
    },
    width: 550,
    height: 450,
    data: opts,
    event: ev
  }).done(function(dialog) {
    self.handleInsertImage(dialog, opts);
  });
};

/*****************************************************************************
  * init the image dialog 
  */
$.NatEditor.prototype.initImageDialog = function(dialogElem, opts) {
  var self = this,
      $dialog = $(dialogElem),
      origWidth = parseInt($dialog.find("[name=origWidth]").val(), 10),
      origHeight = parseInt($dialog.find("[name=origHeight]").val(), 10);

  self.log("initImageDialog opts=",opts);
  self.initDialog(dialogElem, opts);

  // move cursor to end of input field
  function cursorToEnd(elem) {
    var length = elem.val().length,
      input = elem[0];
    input.focus();
    input.setSelectionRange(length, length);
  }


  // calc aspect ration of width and height elements
  function calcRatio(elem) {
    var otherElem, 
      otherVal,
      val = elem.val(),
      doRation = $dialog.find("[name=ratio]").is(":checked"),
      ratio;

    if (doRation) {
      if (elem.attr("name") === "width") {
        otherElem = $dialog.find("[name=height]");
        ratio = origHeight / origWidth;
      } else {
        otherElem = $dialog.find("[name=width]");
        ratio = origWidth / origHeight;
      }
      otherVal = Math.floor(val * ratio + 0.5);
      if (otherVal > 0) {
        otherElem.val(otherVal);
      }
    }
  }

  // listen to width and height elements
  $dialog.find("[name=width], [name=height]").on("keydown", function(ev) {
    var elem = $(this),
      val = parseInt(elem.val() || 0, 10);

    if (ev.key === "ArrowUp") {
      val++;

      elem.val(val);
      cursorToEnd(elem);

      ev.preventDefault();
      return false;
    } 

    if (ev.key === "ArrowDown") {
      val--;
      if (val < 0) {
        val = 0;
      }

      elem.val(val);
      cursorToEnd(elem);

      ev.preventDefault();
      return false;
    } 

    if (ev.key === "PageUp") {
      val += 10;

      elem.val(val);
      cursorToEnd(elem);

      ev.preventDefault();
      return false;
    } 

    if (ev.key === "PageDown") {
      val -= 10;
      if (val < 0) {
        val = 0;
      }

      elem.val(val);
      cursorToEnd(elem);
      
      ev.preventDefault();
      return false;
    } 

    if (!/[0-9]/.test(ev.key) && 
        ev.key !== "Tab" && 
        ev.key !== "Enter" &&
        ev.key !== "ArrowLeft" && 
        ev.key !== "ArrowRight" &&
        ev.key !== "End" &&
        ev.key !== "Backspace" &&
        ev.key !== "Delete" &&
        ev.key !== "Home") {

      //console.log("blocking key",ev.key);
      ev.preventDefault();
      return false;
    }

  }).on("keyup", function(ev) {
    var elem = $(this);
    if (ev.key !== "Tab") {
      calcRatio(elem);
    }
  }).on("wheel", function(ev) {
    var elem = $(this),
      val = parseInt(elem.val(), 10);

    if (ev.originalEvent.deltaY < 0) {
      if (ev.shiftKey) {
        val += 10;
      } else {
        val++;
      }
    } else {
      if (ev.shiftKey) {
        val -= 10;
      } else {
        val--
      }
    }

    elem.val(val);
    calcRatio(elem);
  });
};

/*****************************************************************************
  * init the image dialog 
  */
$.NatEditor.prototype.initLinkDialog = function(elem, opts) {
  var self = this;

  self.log("initLinkDialog on dialog=",elem);
  self.initDialog(elem, opts);
};

/*****************************************************************************
  * cancel the attachments dialog; abords any upload in progress
  */
$.NatEditor.prototype.cancelAttachmentsDialog = function(dialogElem/*, data*/) {
  var self = this;

  self.log("cancelAttachmentsDialog on dialogElem=",dialogElem);

  if (self.uploader !== undefined) {
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
      webTopic = self.formManager.getWebTopic(),
      data = {
        web: webTopic[0],
        topic: webTopic[1],
      };

   //console.log("called parseUrl()",text);

  if (text.indexOf("blob:") === 0 || text.indexOf("data:") === 0) {
    data.file = text;
    data.type = "attachment";
  } else {
    text = decodeURIComponent(text);

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
      data.file = text;
      data.type = "unknown";
    }
  }

  //console.log("parsed url=",data);

  return data;
};

/*****************************************************************************
 * parse the selected image
 */
$.NatEditor.prototype.parseImageSelection = function() {
  var self = this;

  return $.extend(true, {}, self.opts.imageDialogDefaults, self.engine.getImageData());
};

/*****************************************************************************
 * forward to engine's impl
 */
$.NatEditor.prototype.parseLink = function(text) {
  var self = this;

  return self.engine.parseLink(text);
};

/*************************************************************************
 * handler for keydown events
 */
$.NatEditor.prototype.handleKeyDown = function(ev) {
  var self = this;

  if (ev.ctrlKey && ev.key === "r") {
    window.location.reload();
    ev.preventDefault();
    return true;
  }

  self.keyPressPrevented = false;

  if (self.dropdown.isVisible()) {

    if (ev.key === "ArrowUp") {
      self.dropdown.selectPrev();
      self.keyPressPrevented = true;
    } else if (ev.key === "ArrowDown") {
      self.dropdown.selectNext();
      self.keyPressPrevented = true;
    } else if (ev.key === "Enter" || ev.key == 'Tab') {
      self.dropdown.hide();
      self.dropdown.callback();
      self.keyPressPrevented = true;
    } else if (ev.key === "Escape") {
      self.dropdown.hide();
      self.keyPressPrevented = true;
    } 

    if (self.keyPressPrevented) {
      ev.preventDefault();
      return false;
    }
  }
};

/*************************************************************************
 * handler for keyup events
 */
$.NatEditor.prototype.handleKeyUp = function(ev) {
  var self = this,
      lineStart = self.engine.getBeforeCursor(),
      lineEnd = self.engine.getAfterCursor(1),
      found = false,
      prefix,
      prefs = foswiki.getPreference("NatEditPlugin");

  if (self.keyPressPrevented) {
    self.keyPressPrevented = false; // only once
    return false;
  }

  for (const completion of self.opts.completions) {
    if (!completion.context || prefs[completion.context]) {
      if (lineEnd.match(/^(\s|$)/) && completion.match.test(lineStart)) {
        found = true;
        prefix = RegExp.$1;
        foswiki.debounce(function() {
          self.engine.execCompletion(completion, prefix);
        }, "NatEdit.complete", 300)();
        break;
      }
    }
  }

  if (!found) {
    self.dropdown.hide();
  }

  //console.log("no match for '"+lineStart+"'");

  return true;
};

/*************************************************************************
 * cached version of getJSON
 */
$.NatEditor.prototype.getJSON = function(url) {
  var self = this,
      dfd = $.Deferred(),
      data;

  data = self.getCache().get(url);
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
    self.getCache().set(url, data);
    self._prevXHR = null;
    dfd.resolve(data);
  });

  return dfd;
};

/***************************************************************************
 * creates a local cache
 */
$.NatEditor.prototype.getCache = function() {
  var self = this;
  if (self.cache === undefined) {
    self.cache = new Map();
  }

  return self.cache;
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
  messageMarkup: ['<div class="foswikiMessage">\n', "Insert message here", "\n</div>"],
  successMessageMarkup: ['<div class="foswikiSuccessMessage">\n', "Insert success message here", "\n</div>"],
  infoMessageMarkup: ['<div class="foswikiInfoMessage">\n', "Insert info message here", "\n</div>"],
  warningMessageMarkup: ['<div class="foswikiWarningMessage">\n', "Insert warning message here", "\n</div>"],
  errorMessageMarkup: ['<div class="foswikiErrorMessage">\n', "Insert error message here", "\n</div>"],
  verbatimMarkup: ['<verbatim>\n','Insert non-formatted text here','\n</verbatim>'],
  stickyMarkup: ['<sticky>\n','Insert protected text here','\n</sticky>'],
  literalMarkup: ['<literal>\n','Insert literal text here','\n</literal>'],
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
  imageDialogDefaults: {
    classList: "",
    type: "linked",
    align: "none",
  },
  completions: [{
    "id": "emoji",
    "context": "EmojiPluginEnabled",
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
    "context": "MentionsPluginEnabled",
    "match": new RegExp(`(?:(?<=[\\s<>|])|^)(@\\*?[${foswiki.RE.alnum}]+)$`),
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
      // TODO: distinguish self.engine.type true/false
      if (this.engine.type === 'wysiwyg') {
        return `<a href="${hit.web}.${hit.topic}">${hit.title}</a>`;
      } else {
        if (hit.web === this.opts.web) {
          return `[[${hit.topic}]]`;
        } else {
          return `[[${hit.web}.${hit.topic}]]`;
        }
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
    const prefs = foswiki.getPreference("NatEditPlugin");
    initedDefaults = true;
    $.NatEditor.version = prefs.version;
    $.NatEditor.defaults.debug = prefs.debug;
    $.NatEditor.defaults.web = foswiki.getPreference("WEB");
    $.NatEditor.defaults.topic = foswiki.getPreference("TOPIC");
    $.NatEditor.defaults.systemWeb = foswiki.getPreference("SYSTEMWEB");
    $.NatEditor.defaults.pubUrl = foswiki.getPreference("PUBURL");
    $.NatEditor.defaults.signatureMarkup = ['-- ', '[['+foswiki.getPreference("WIKIUSERNAME")+']]', ' - '+foswiki.getPreference("SERVERTIME")];
    $.NatEditor.defaults.engine = prefs.Engine;
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
  var thisOpts = $.extend(true, {}, $.NatEditor.defaults, opts);

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
