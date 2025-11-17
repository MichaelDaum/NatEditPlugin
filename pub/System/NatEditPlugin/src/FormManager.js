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
  ajaxSubmitEnabled: true,

  // set to false to prevent blocking actions other than save, cancel etc to leave the page
  blockUnload: true,
  purifyInput: false,
  purify: {
    ADD_ATTR: ['contenteditable', 'target'],
    ADD_TAGS: ['verbatim', 'literal', 'sticky', 'nop', 'noautolink', 'dirtyarea', 'graphviz', 'dot', 'mermaid', 'latex', 'math'],
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
  self.formAction = self.elem.attr("action") || "";
  self.editCaptcha = $("#editcaptcha");
  self.origDocumentTitle = document.title;
  self.referrer = document.referrer;
  self.topicTitleCache = {};

  // options

  self.opts = $.extend({}, defaults, {
    web: foswiki.getPreference("WEB"),
    topic: foswiki.getPreference("TOPIC"),
    purifyInput: foswiki.getPreference("NatEditPlugin").purifyInput,
    purify: foswiki.getPreference("NatEditPlugin").purify,
    debug: foswiki.getPreference("NatEditPlugin").debug,
    ajaxSubmitEnabled: /save/.test(self.formAction) ? true : false
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
    self.elem.find(".newFile").remove();
    self.editors().each(function() {
      this.setValue("");
    });
  });

  /* remove the second TopicTitle */
  self.elem.find("input[name='TopicTitle']:eq(1)").parents(".foswikiFormStep").remove();

  /* remove the second Summary */
  self.elem.find("input[name='Summary']:eq(1)").parents(".foswikiFormStep").remove();

  // handling submit event
  self.elem.on("submit", function(ev) {
    ev.preventDefault();

    if (self._submitInProgress) {
      console.warn("submit already in progress");
      return false;
    }
    self.log("got submit event");
    if (!/save/.test(self.formAction) && !self.opts.ajaxSubmitEnabled) {
      self.log("not a save action, performing normal submit");
      self.beforeSubmit(self.formAction).then(function() {
        self.isBlockedUnload = false;
        self.elem[0].submit();
        self._submitInProgress = false;
      });
    } else {
      self.save().then(function() {
        self._submitInProgress = false;
      });
    }

    return false;
  });

  /* save handler */
  self.elem.find(".ui-natedit-save").on("click", function() {
    self.save();
    return false;
  });

  /* save & continue handler */
  self.elem.find(".ui-natedit-checkpoint").on("click", function(ev) {
    var action = $(ev.currentTarget).attr("href").replace(/^#/, "");
    self.log("clicked checkpoint");
    self.checkPoint();
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
      self.elem[0].submit();
    });
    return false;
  });

  self.elem.find(".ui-natedit-addform").on("click", function() {
    self.log("clicked addform");
    self.beforeSubmit("addform").then(function() {
      self.isBlockedUnload = false;
      self.elem[0].submit();
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
    // additional rules for everything text-ish
    self.elem.find("input[type=text], input[type=password], input[type=search], input[type=email], input[type=url], textarea:not(.natedit)").addClass("pure");

    $.validator.addMethod("pure", function(value, element, params ) {
      value = "x" + value; 
      //self.log("checking if element is pure", value);
      DOMPurify.sanitize(value, self.opts.purify);
      self.logInsecureTags();
      return DOMPurify.removed.length === 0;
    }, "Security warning: input contains dangerous content.");

    $.validator.addClassRules("pure", {
      pure: true
    });
  }

  /* remove some access keys interfering with the table editor */
  $("[accesskey=n],[accesskey=f]").each(function() {
    $(this).removeAttr("accesskey"); 
  });

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
 * block browser history.
 */
FormManager.prototype.blockBrowserHistory = function() {
  var self = this;

  window.history.replaceState(null, "[blocked history entry]", self.referrer); 
};

/*************************************************************************
 * get the title of a topic
 */
FormManager.prototype.getTopicTitle = function(topic) {
  var self = this;

  return $.Deferred(function(dfd) {
    var topicTitle = self.topicTitleCache[topic];

    if (topicTitle) {
      //self.log("found topicTitle in cache",topicTitle);
      dfd.resolve(topicTitle);
    } else {
      topic = foswiki.normalizeWebTopicName(self.opts.web, topic).join(".");
      //self.log("fetching topicTitle for", topic);

      $.get(foswiki.getScriptUrl("rest", "NatEditPlugin", "topicTitle"), {
        topic: self.getWebTopic().join("."),
        location: topic
      }).done(function(data) {
        self.topicTitleCache[topic] = data;
        dfd.resolve(data);
      }).fail(function() {
        dfd.reject("failed to get topic title for ",topic);
      });;
    }
  }).promise();
};

/************************************************************************
 * get the topic this form is supposed to address.
 * this is taken from an input element named topic and defailts to the 
 * one in the opts
 */
FormManager.prototype.getWebTopic = function() {
  var self = this,
    web, topic;

  web = self.elem.find("[name=web]").val() || self.opts.web;
  topic = self.elem.find("[name=topic]").val() || self.opts.topic;

  return foswiki.normalizeWebTopicName(web, topic);
};

FormManager.prototype.getWeb = function() {
  return this.getWebTopic()[0];
};

FormManager.prototype.getTopic = function() {
  return this.getWebTopic()[1];
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
FormManager.prototype.save = function() {
  var self = this,
    msg = self.elem.data("message") || $.i18n("Saving ...");

  self.log("called save()");

  $.blockUI({
    message: `<h1>${msg}</h1>`
  });

  return self.submit("save").then(function(redirect) {
    if (redirect) {
      self.blockBrowserHistory();
      window.location.href = redirect;
    } else {
      $.unblockUI();
      self.elem.trigger("success", "save");
    }
  }, function(msg) {
    $.unblockUI();
    self.elem.trigger("fail", "save", msg);
  });
};

/*************************************************************************
 * leave the editor, discarding all changes
 */
FormManager.prototype.cancel = function() {
  var self = this,
    msg = $.i18n("Quitting ...");

  $.blockUI({
    message: `<h1>${msg}</h1>`
  });

  return self.submit("cancel").then(function(redirect) {
    if (redirect) {
      self.blockBrowserHistory();
      window.location.href = redirect;
    } else {
      $.unblockUI();
      self.elem.trigger("success", "cancel");
    }
  }, function(msg) {
    $.unblockUI();
    self.elem.trigger("fail", "cancel", msg);
  });
};

/*************************************************************************
 * checkpoint save
 */
FormManager.prototype.checkPoint = function() {
  var self = this,
    msg = $.i18n("Saving ...");

  $.blockUI({
    message: `<h1>${msg}</h1>`
  });

  return self.submit("checkpoint").then(function(redirect) {
    if (redirect && self.getTopic().match(/AUTOINC|XXXXXXXXXX/)) {
      window.location.href = redirect;
    } else {
      $.unblockUI();
      self.elem.trigger("success", "checkpoint");
    }
  }, function(msg) {
    $.unblockUI();
    self.elem.trigger("fail", "checkpoint", msg);
  });
};

/*************************************************************************
 * submit the content to foswiki 
 */
FormManager.prototype.submit = function(action) {
  var self = this,
    msg;

  action = action || 'checkpoint';

  self.log("called submit action=",action);
  self.hideMessages();

  return $.Deferred(function(dfd) {

    if (action === 'cancel' || self.elem.validate().form()) {

      self.beforeSubmit(action).then(function() {
        if (self.opts.ajaxSubmitEnabled) {
          self.elem.ajaxSubmit({
            beforeSubmit: function() {
              self.hideMessages();
              self.documentTitle(msg);
            },
            error: function(xhr, textStatus) {
              var message = self.extractErrorMessage(xhr.responseText || textStatus);
              self.updateNonce(xhr.getResponseHeader('X-Foswiki-Validation'));
              if (xhr.status == 419) {
                self.confirmSave(message).then(function() {
                  self._submitInProgress = false;
                  self.submit(action).then(function(redirect) {
                    if (redirect) {
                      redirect = decodeURIComponent(redirect);
                    }
                    dfd.resolve(redirect);
                  }, function(msg) {
                    dfd.reject(msg);
                  });
                }, function() {
                  self.showMessage("error", message, "Error");
                });
              } else {
                self.showMessage("error", message, "Error");
                dfd.reject(message);
              }
            },
            success: function(data, textStatus, xhr) {
              var redirect = xhr.getResponseHeader("X-Location") || xhr.getResponseHeader("Location");
              self.updateNonce(xhr.getResponseHeader('X-Foswiki-Validation'));
              $(".natEditTitleStatus").fadeOut();
              if (redirect) {
                redirect = decodeURIComponent(redirect);
              }
              dfd.resolve(redirect);
            }
          });
        } else {
          self.elem[0].submit();
          dfd.resolve();
        }
      }).fail(function(msg, title) {
        title = title || "";
        self.showMessage("error", $.i18n(msg), $.i18n(title));
        dfd.reject(msg);
      });
    } else {
      dfd.reject("Form validation failed");
      $.unblockUI();
    }
  }).promise();
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
        if (xhr.status == 419) {
          self.confirmSave(message).then(function() {
            self.preview(); // try again
          }, function(msg) {
            self.showMessage("error", msg, "Error");
          });
        } else {
          self.showMessage("error", message, "Error");
        }
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
 * display a validation dialog
 */
FormManager.prototype.confirmSave = function(msg) {
  var self = this,
    html = `<div class="ui-natedit-dialog-content ui-natedit-confirm-dialog-content">${msg}</div>`,
    msg = $(".blockPage h1").text();

  $.unblockUI();
  return $.Deferred(function(dfd) {
    $(html).dialog({
      buttons: [{
        text: $.i18n("OK"),
        icon: "ui-icon-check",
        click: function() {
          $.blockUI({
            message: `<h1>${msg}</h1>`
          });
          dfd.resolve(this);
          $(this).dialog("close");
          return true;
        }
      }, {
        text: $.i18n("Cancel"),
        icon: "ui-icon-cancel",
        click: function() {
          dfd.reject();
          $(this).dialog("close");
          return false;
        }
      }],
      close: function() {
        if (dfd.state() === 'pending') {
          dfd.reject(); // resolve any pending dfd, such as is the case when ESC-aping a dialog
        }
        //self.log("destroying dialog");
        $(this).dialog("destroy");
      },
      show: 'fade',
      modal: true,
      draggable: true,
      resizable: false,
      title: $.i18n("Confirmation Required"),
      width: 600,
      position: {
        my:'center', 
        at:'center',
        of: window
      },
    });
  }).promise();
};

/*************************************************************************
 * update strike one nonce
 */
FormManager.prototype.updateNonce = function(val) {
  var self = this;

  if (val) {
    self.elem.find("input[name='validation_key']").each(function() {
      $(this).val("?" + val.split(/\s*,\s*/)[0]);
    });
  }
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
  * things to be done before the submit goes out
  */
FormManager.prototype.beforeSubmit = function(action) {
  var self = this, 
    actionValue = 'foobar',
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

    self.editors().each(function() {
      dfds.push(this.beforeSubmit(action));
    });
  
    return $.when.apply($, dfds);
  }

  if(self.opts.purifyInput && (typeof(action) === 'undefined' || action === 'save' || action === 'checkpoint' || action === 'preview')) {
    return self.isPure().then(function() {
      return doIt();
    }, function(report) {
      var dfd = $.Deferred();
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
FormManager.prototype.showMessage = function(type, msg, title, opts) {
  /*var self = this;*/

  opts = $.extend({}, {
    title: title,
    text:msg,
    hide:(type === "error"?false:true),
    type:type,
    sticker:false,
    closer_hover:false,
    delay: type === "error"?8000:1000
  }, opts);

  return $.pnotify(opts);
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
