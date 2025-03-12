/*
 * FormManager: manages the edit interface and all of the engines inside
 *
 * Copyright (c) 2015-2025 Michael Daum http://michaeldaumconsulting.com
 *
 * Licensed under the GPL license http://www.gnu.org/licenses/gpl.html
 *
 */
"use strict";
(function($) {

/***************************************************************************
 * plugin defaults
 */
var defaults = {
  // toggle debug output
  debug: false,

  // set to false to prevent blocking actions other than save, cancel etc to leave the page
  blockUnload: true,
  purifyInput: false,
  purify: {
    ADD_ATTR: ['contenteditable'],
    ADD_TAGS: ['verbatim', 'literal', 'sticky', 'nop', 'noautolink', 'dirtyarea', 'label'],
    FORBID_ATTR: [],
    FORBID_TAGS: ['font'],
  }
};

/*****************************************************************************
 * class FormManager
 */
var FormManager = function(elem, opts) {
  var self = this;

  // init
  self.elem = $(elem);
  self.editCaptcha = $("#editcaptcha");
  self.origDocumentTitle = document.title;
  self.referrer = document.referrer;
  self.topicTitleCache = {};

  // options
  self.opts = $.extend({}, defaults, {
    web: foswiki.getPreference("WEB"),
    topic: foswiki.getPreference("TOPIC"),
    saveUrl: foswiki.getScriptUrl("rest", "NatEditPlugin", "save"),
    purifyInput: foswiki.getPreference("NatEditPlugin").purifyInput,
    purify: foswiki.getPreference("NatEditPlugin").purify,
    debug: foswiki.getPreference("NatEditPlugin").debug,
  }, opts, self.elem.data());

  // purify configs
  for (const key in self.opts.purify) {
    if (typeof(self.opts.purify[key]) === "string") {
      self.opts.purify[key] = self.opts.purify[key].split(/\s*,\s*/);
    }
  }

  if (foswiki.eventClient) {
    $("<input />").attr({
      type: "hidden",
      name: "clientId",
      value: foswiki.eventClient.id
    }).prependTo(self.elem);
  }

  // init unload blocker
  self.isBlockedUnload = false;
  if (self.opts.blockUnload) {
    self.isBlockedUnload = true; // flag must be set to false to block

    self.log("adding unload handler");

    $(window).on("beforeunload", function(e) {
      self.log("got beforeunload event. isBlockedUnload=",self.isBlockedUnload,"opts=",self.opts.blockUnload);

      if (self.isBlockedUnload && self.hasChanged()) {
        e.preventDefault();
        return "Are you sure?"; // dummy text
      }
      return;
    });
  }

  // clear input on reset event
  self.elem.on("reset", function() {
    self.editors().each(function() {
      this.setValue("");
    });
  });
  

  // restore document title
  self.elem.on("submit", function() {
    window.setTimeout(function() {
      self.documentTitle();
    }, 1000);
  });

  /* remove the second TopicTitle */
  self.elem.find("input[name='TopicTitle']:eq(1)").parents(".foswikiFormStep").remove();

  /* remove the second Summary */
  self.elem.find("input[name='Summary']:eq(1)").parents(".foswikiFormStep").remove();

  /* save handler */
  self.elem.find(".ui-natedit-save").on("click", function() {
    self.submit();
    return false;
  });

  /* save & continue handler */
  self.elem.find(".ui-natedit-checkpoint").on("click", function(ev) {
    var action = $(ev.currentTarget).attr("href").replace(/^#/, "");
    self.log("clicked checkpoint");
    self.isBlockedUnload = false;
    self.save(action);
    return false;
  });

  /* preview handler */
  self.elem.find(".ui-natedit-preview").on("click", function() {
    self.log("clicked preview");
    self.preview();
    return false;
  });

  self.elem.find(".ui-natedit-cancel").on("click", function() {
    self.log("clicked cancel");
    self.cancel();
    return false;
  });

  self.elem.find(".ui-natedit-replaceform").on("click", function() {
    self.log("clicked replaceform");
    self.beforeSubmit("replaceform").then(function() {
      self.isBlockedUnload = false;
      self.elem.trigger("submit");
    });
    return false;
  });

  self.elem.find(".ui-natedit-addform").on("click", function() {
    self.log("clicked addform");
    self.beforeSubmit("addform").then(function() {
      self.isBlockedUnload = false;
      self.elem.trigger("submit");
    });
    return false;
  });

  /* add clientside form validation */
  self.elem.validate({
    meta: "validate",
    ignore: "div, .foswikiIgnoreValidation",
    onsubmit: false,
    invalidHandler: function(e, validator) {
      var errors = validator.numberOfInvalids();

      if (errors) {
        self.documentTitle();
        $.unblockUI();
        self.showMessage("error", $.i18n('One or more fields have not been filled correctly'));
        $.each(validator.errorList, function() {
          var $errorElem = $(this.element),
              tabPane = $errorElem.parents(".jqTabPane:first").data("tabPane");

          $errorElem.parents(".jqTab").each(function() {
            var id = $(this).attr("id"),
                $tab = tabPane.getNaviOfTab('#'+id);
            $tab.addClass("error");
          });
        });
      } else {
        self.hideMessages();
      }
    },
    ignoreTitle: true,
    errorPlacement: function(error, element) {
      if (element.is("[type=checkbox],[type=radio]")) {
        // special placement if we are inside a table
        $("<td>").appendTo(element.parents("tr:first")).append(error);
      } else {
        // default
        error.insertAfter(element);
      }
    }
  });

  // add rules for DOMPurify
  if (self.opts.purifyInput) {
    $.validator.addMethod( "pure", function(value, element, params ) {
      self.log("checking if element is pure", element);
      DOMPurify.sanitize(value); 
      return DOMPurify.removed.length === 0;
    }, "Security warning: input contains dangerous content.");
    $.validator.addClassRules("pure", {
      pure: true
    });

    // additional rules for everything text-ish
    self.elem.find("input[type=text], input[type=password], input[type=search], input[type=email], input[type=url], textarea:not(.natedit)").addClass("pure");
  }
};
/*************************************************************************
 * returns the list of included nateditors
 */
FormManager.prototype.editors = function() {
  var self = this;

  return self.elem.find(".natedit").map(function() {
    return $(this).data("natedit");
  });
};

/*************************************************************************
 * debug logging 
 */
FormManager.prototype.log = function() {
  var self = this, args;

  if (console && self.opts.debug) {
    args = $.makeArray(arguments);
    args.unshift("NATEDIT-FM: ");
    console && console.log.apply(console, args); // eslint-disable-line no-console
  }
};

/*************************************************************************
 * block entering edit mode via back button as this might cause data loss
 */
FormManager.prototype.blockHistory = function() {
  var self = this;
  window.history.replaceState(null, "[blocked history entry]", self.referrer); 
};

/*************************************************************************
 * get the title of a topic
 */
FormManager.prototype.getTopicTitle = function(topic) {
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
    }).done(function(data) {
      self.topicTitleCache[topic] = data;
      dfd.resolve(data);
    }).fail(function() {
      dfd.reject("failed to get topic title for ",topic);
    });;
  }

  return dfd.promise();
};

/************************************************************************
 * check if any editor has got changes
 */
FormManager.prototype.hasChanged = function() {
  var self = this,
    hasChanged = false;

  self.editors().each(function() {
    var editor = this;

    if (hasChanged) {
      return false;
    }

    hasChanged = editor.hasChanged();
  });
  self.log("called hasChanged=",hasChanged);

  return hasChanged;
};

/*************************************************************************
 * sets/unsets the document title 
 */
FormManager.prototype.documentTitle = function(title) {
  var self = this;

  document.title  = title || self.origDocumentTitle;
};

/*************************************************************************
 * submit the form on exit
 */
FormManager.prototype.submit = function() {
  var self = this;

  return self.exit().then(function() {
    self.elem.trigger("submit");
  });
};

/*************************************************************************
 * submit the content to foswiki and leave the editor
 */
FormManager.prototype.exit = function() {
  var self = this,
      dfd = $.Deferred();

  self.log("called exit");
  self.checkCaptcha().then(function() {
    self.hideMessages();
    if (self.elem.validate().form()) {
      self.isBlockedUnload = false;
      self.beforeSubmit("save").then(function() {
        self.documentTitle($.i18n("Saving ..."));
        self.blockHistory();
        $.blockUI({
          message: '<h1> '+ $.i18n("Saving ...") + '</h1>'
        });
        dfd.resolve();
      }).fail(function(msg, title) {
        title = title || ""
        self.showMessage("error", $.i18n(msg), $.i18n(title));
        dfd.reject();
      });
    } else {
      dfd.reject();
    }
  }).fail(function() {
    dfd.reject();
  });

  return dfd.promise();
};

/*************************************************************************
 * submit the content to foswiki 
 * TODO: make it return a promise()
 */
FormManager.prototype.save = function(action) {
  var self = this;

  action = action || 'checkpoint';

  self.log("called save action=",action);
  self.checkCaptcha().then(function() {
    var topicName = self.opts.topic;

    self.hideMessages();
    if (self.elem.validate().form()) {
      self.beforeSubmit(action).then(function() {
        if (topicName.match(/AUTOINC|XXXXXXXXXX/)) {
          // don't ajax when we don't know the resultant URL (can change this if the server tells it to us..)
          $.blockUI({
            message: '<h1>'+ $.i18n("Saving ...") + '</h1>'
          });
          self.elem.trigger("submit");
        } else {
          self.elem.ajaxSubmit({
            url: self.opts.saveUrl,
            beforeSubmit: function() {
              self.hideMessages();
              self.documentTitle($.i18n("Saving ..."));
              $.blockUI({
                message: '<h1>'+ $.i18n("Saving ...") + '</h1>'
              });
            },
            error: function(xhr, textStatus) {
              var message = self.extractErrorMessage(xhr.responseText || textStatus);
              self.showMessage("error", message);
            },
            complete: function(xhr) {
              var nonce = xhr.getResponseHeader('X-Foswiki-Validation');
              if (nonce) {
                // patch in new nonce
                $("input[name='validation_key']").each(function() {
                  $(this).val("?" + nonce);
                });
              }
              $(".natEditTitleStatus").fadeOut();
              self.documentTitle();
              $.unblockUI();
            }
          });
        }
      }).fail(function(msg, title) {
        title = title || "";
        self.showMessage("error", $.i18n(msg), $.i18n(title));
      });
    }
  });
};

/*************************************************************************
  * hack to extract an error message from a foswiki non-json aware response :(
  */
FormManager.prototype.extractErrorMessage = function(text) {
  /*var self = this;*/

  if (text && text.match(/^<!DOCTYPE/)) {
    text = $(text).find(".natErrorMessage").text().replace(/\s+/g, ' ').replace(/^\s+/, '') || '';
  }

  if (text === "error") {
    text = "Error: save failed. Please save your content locally and reload this page.";
  }

  return text;
};


/*************************************************************************
 * leave the editor, discarding all changes
 */
FormManager.prototype.cancel = function() {
  var self = this;

  self.hideMessages();
  self.beforeSubmit("cancel").then(function() {
    self.isBlockedUnload = false;
    self.documentTitle($.i18n("Quitting ..."));
    self.blockHistory();
    $.blockUI({
      message: '<h1> '+ $.i18n("Quitting ...") + '</h1>'
    });
    self.elem.trigger("submit");
  });
};


/*************************************************************************
 * display a preview of current changes in a modal dialog
 */
FormManager.prototype.preview = function() {
  var self = this;

  if (!self.elem.validate().form()) {
    return;
  }

  self.beforeSubmit("preview").then(function() {
    self.elem.ajaxSubmit({
      url: self.opts.saveUrl,
      beforeSerialize:function() {
        self.elem.find("input[name=redirectto]").prop('disabled',true);
      },
      beforeSubmit: function() {
        self.hideMessages();
        $.blockUI({
          message: '<h1>'+$.i18n("Loading preview ...")+'</h1>'
        });
      },
      error: function(xhr, textStatus) {
        var message = self.extractErrorMessage(xhr.responseText || textStatus);
        self.documentTitle();
        $.unblockUI();
        self.showMessage("error", message);
      },
      success: function(data) {
        var $window = $(window),
          height = Math.round(parseInt($window.height() * 0.6, 10)),
          width = Math.round(parseInt($window.width() * 0.6, 10));

        self.documentTitle();
        $.unblockUI();

        if (width < 640) {
          width = 640;
        }

        data = data.replace(/%width%/g, width).replace(/%height%/g, height);
        $("body").append(data);
      },
      complete: function() {
        self.elem.find("input[name=redirectto]").prop('disabled',false);
      }
    });
  }).fail(function(msg, title) {
    title = title || ""
    self.showMessage("error", $.i18n(msg), $.i18n(title));
  });
};

/*************************************************************************
 * checks a captcha, if enabled. 
 * returns a deferred obj and resolves it as needed.
 */
FormManager.prototype.checkCaptcha = function() {
  var self = this,
      dfd = $.Deferred(),
      buttons;

  self.log("called checkCaptcha");
  if (self.editCaptcha.length) {
    buttons = self.editCaptcha.dialog("option", "buttons");
    buttons[0].click = function() {
      if (self.editCaptcha.find(".jqCaptcha").data("captcha").validate()) {
        self.editCaptcha.dialog("close");
        dfd.resolve();
      } else {
        dfd.reject();
      }
    };
    self.editCaptcha.dialog("option", "buttons", buttons).dialog("open");
  } else {
    dfd.resolve();
  }

  return dfd.promise();
};

/*************************************************************************
  * things to be done before the submit goes out
  */
FormManager.prototype.beforeSubmit = function(action) {
  var self = this, 
    actionValue = 'foobar',
    dfd = $.Deferred(),
    dfds = [];

  function doIt() {
    self.elem.find("input[name=topicparent]").each(function() {
      var $this = $(this);
      if ($this.val() === "") {
        $this.val("none"); // trick in unsetting the topic parent
      }
    });

    // the action_... field must be set to a specific value in newer foswikis
    if (action === 'save') {
      actionValue = 'Save';
    } else if (action === 'cancel') {
      actionValue = 'Cancel';
    }

    if (action === 'addform') {
      self.elem.find("input[name='submitChangeForm']").val(action);
    }

    self.elem.find("input[name='action_preview']").val('');
    self.elem.find("input[name='action_save']").val('');
    self.elem.find("input[name='action_checkpoint']").val('');
    self.elem.find("input[name='action_addform']").val('');
    self.elem.find("input[name='action_replaceform']").val('');
    self.elem.find("input[name='action_cancel']").val('');
    self.elem.find("input[name='action_" + action + "']").val(actionValue);


    if (typeof(StrikeOne) !== 'undefined') {
      StrikeOne.submit(self.elem[0]);
    }

    // WARNING: handlers are not guaranteed to be called or have finished before the content has been submitted
    self.elem.trigger("beforeSubmit.natedit", {
      editor: self, 
      action: action
    });

    self.editors().each(function() {
      dfds.push(this.beforeSubmit(action));
    });
  
    return $.when.apply($, dfds);
  }

  if(self.opts.purifyInput && (typeof(action) === 'undefined' || action === 'save' || action === 'checkpoint' || action === 'preview')) {
    return self.isPure().then(function() {
      return doIt();
    }, function(report) {
      self.log("not pure");
      return dfd.reject("Input contains dangerous content:<ul class='foswikiNoIndent'><li>" + report.join("</li><li>")+"</li></ul>", "Security warning");
    });
  } else {
    return doIt();
  }
};

/*****************************************************************************
 */
FormManager.prototype.sanitize = function(text) {
  var self = this,
    map = [],
    outText;

  if (text === "") {
    return "";
  }

  // take out verbatims
  outText = text.replace(/<verbatim[^>]*>.*?<\/verbatim>/gms, function(match, offset) {
    map.push({
      text: match,
      offset: offset
    });
    return "";
  });

  outText = DOMPurify.sanitize(outText, self.opts.purify);

  map.forEach(function(entry) {
    outText = [
      outText.slice(0, entry.offset), 
      entry.text, 
      outText.slice(entry.offset)
    ].join('');
  });

  return outText;
};

/*****************************************************************************
 * checks if the current transaction is pure
 */
FormManager.prototype.isPure = function() {
  var self = this, 
        dfds = [];

  self.log("called isPure");

  self.editors().each(function() {
    var editor = this;

    dfds.push(editor.getContent().then(function(content) {
      var dfd = $.Deferred();

      self.sanitize("x" + content); // work around error in purify not testing from first char on :(((
      isPure = DOMPurify.removed.length === 0;
      if (isPure) {
        dfd.resolve();
      } else {
        self.logInsecureTags();
        dfd.reject(self.getSecurityReport());
      }

      return dfd;
    }));
  });

  return $.when.apply($, dfds);
};

/*****************************************************************************
 * purify the edit value
 * returns true if the editor value needed purification
 */
FormManager.prototype.purify = function() {
  var self = this,
    dfds = [];

  self.log("called purify");

  self.editors().each(function() {
    var editor = this;

    dfds.push(editor.getContent().then(function(dirty) {
      var clean = self.sanitize(dirty);
      self.logInsecureTags();
      return editor.setContent(clean);
    }));
  });

  return $.when.apply($, dfds);
};

/*****************************************************************************
 */
FormManager.prototype.logInsecureTags = function() {
  var self = this,
      report = self.getSecurityReport();
    
  if (report.length) {
    console.error("NATEDIT:" + report.join("\n"));
  }
};

/*****************************************************************************
 */
FormManager.prototype.getSecurityReport = function() {
  var self = this,
      removed = DOMPurify.removed,
      report = [];

  if (removed && removed.length) {
    removed.forEach(function(item, i) {
      //console.log("item=",item);
      if (typeof(item.element) !== 'undefined') {
       	report.push("Invalid element " + item.element.nodeName.toLowerCase());
      } else {
	report.push("Invalid attribute " + item.attribute.name + " in " + item.from.nodeName.toLowerCase());
      } 
    });
  }

  return report;
};

/*************************************************************************
  * calls a notification systems, defaults to pnotify
  */
FormManager.prototype.showMessage = function(type, msg, title) {
  /*var self = this;*/

  $.pnotify({
    title: title,
    text:msg,
    hide:(type === "error"?false:true),
    type:type,
    sticker:false,
    closer_hover:false,
    delay: (type === "error"?8000:1000)
  });
};

/*************************************************************************
  * hide all open error messages in the notification system
  */
FormManager.prototype.hideMessages = function() {
  var self = this;

  self.elem.find(".jqTabGroup a.error, input.error").removeClass("error");
  self.elem.find("label.error").hide();
  $.pnotify_remove_all();
};

/*****************************************************************************
 * register to jQuery 
 */
$.fn.formManager = function(opts) {
  return this.each(function() {
    if (!$.data(this, "formManager")) {
      $.data(this, "formManager", new FormManager(this, opts));
    }
  });
};

/*****************************************************************************
 * initializer called on dom ready
 */
$(function() {
  $(".EditForm").livequery(function() {
    $(this).formManager();
  });
});

})(jQuery);
