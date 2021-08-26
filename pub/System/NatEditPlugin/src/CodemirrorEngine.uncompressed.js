/*
 * jQuery NatEdit: codemirror engine
 *
 * Copyright (c) 2016-2021 Michael Daum http://michaeldaumconsulting.com
 *
 * Licensed under the GPL license http://www.gnu.org/licenses/gpl.html
 *
 */

/*global BaseEngine:false CodeMirror:false EmojiWidget:false LinkWidget:false _debounce:false _posEqual:false */

"use strict";
(function($) {

/* hepler class for searching */
function SearchState() {
  var self = this;

  self.cursor = null;
  self.overlay = null;
  self.annotate = null;
  self.query = null;
  self.found = false;
}

/*****************************************************************************
 * constructor
 */

CodemirrorEngine.prototype = Object.create(BaseEngine.prototype);
CodemirrorEngine.prototype.constructor = CodemirrorEngine;
CodemirrorEngine.prototype.parent = BaseEngine.prototype;

function CodemirrorEngine(shell, opts) {
  var self = this;

  self.shell = self.parent.shell = shell; // SMELL
  self.searchState = undefined;
  self.opts = $.extend({}, CodemirrorEngine.defaults, self.shell.opts.codemirror, opts);
}

/*************************************************************************
 * init this engine
 */
CodemirrorEngine.prototype.init = function() {
  var self = this,
      pubUrlPath = foswiki.getPreference("PUBURLPATH"),
      systemWeb = foswiki.getPreference('SYSTEMWEB'),
      editorPath = pubUrlPath+'/'+systemWeb+'/CodeMirrorContrib',
      dfd = $.Deferred();


  $('<link>')
    .appendTo('head')
    .attr({type : 'text/css', rel : 'stylesheet'})
    .attr('href', editorPath + '/lib/codemirror.css');

  $('<link>')
    .appendTo('head')
    .attr({type : 'text/css', rel : 'stylesheet'})
    .attr('href', editorPath + '/theme/foswiki.css');

  $('<link>')
    .appendTo('head')
    .attr({type : 'text/css', rel : 'stylesheet'})
    .attr('href', editorPath + '/addon/search/matchesonscrollbar.css');

  $('<link>')
    .appendTo('head')
    .attr({type : 'text/css', rel : 'stylesheet'})
    .attr('href', editorPath + '/addon/dialog/dialog.css');

  self.shell.getScript(editorPath+"/lib/codemirror.js").done(function() {
    CodeMirror.modeURL = editorPath+'/'+'/mode/%N/%N.js';

    $.when(
      self.parent.init(),
      self.shell.getScript(editorPath+"/addon/mode/loadmode.js"),
      self.shell.getScript(editorPath+"/addon/fold/foldcode.js"),
      self.shell.getScript(editorPath+"/addon/fold/foldgutter.js"),
      self.shell.getScript(editorPath+"/addon/search/searchcursor.js"),
      self.shell.getScript(editorPath+"/addon/scroll/annotatescrollbar.js"),
      self.shell.getScript(editorPath+"/addon/search/matchesonscrollbar.js"),
      self.shell.getScript(editorPath+"/addon/edit/matchbrackets.js"),
      self.shell.getScript(editorPath+"/addon/dialog/dialog.js"),
      self.shell.getScript(editorPath+"/keymap/vim.js"),
      self.shell.preloadTemplate("editdialog", "searchdialog")
    ).done(function() {

        // extend vim mode to make :w and :x work
        CodeMirror.commands.save = function() {
          self.shell.save();
        };

        CodeMirror.Vim.defineEx("x", undefined, function() {
          self.shell.exit();
        });

        CodeMirror.Vim.defineEx("xa", undefined, function() {
          self.shell.exit();
        });

        CodeMirror.Vim.defineEx("qa", undefined, function() {
          self.shell.cancel();
        });

        CodeMirror.Vim.defineEx("q", undefined, function() {
          self.shell.cancel();
        });

        CodeMirror.requireMode(self.opts.mode || 'foswiki', function() {
          var cols = self.shell.txtarea.attr("cols"),
              rows = self.shell.txtarea.attr("rows"),
              lineHeight = parseInt(self.shell.txtarea.css("line-height"), 10);

          self.cm = CodeMirror.fromTextArea(self.shell.txtarea[0], self.opts); 
          //window.cm = self.cm; //playground

          if (typeof(cols) !== 'undefined' && cols > 0) {
            self.cm.setSize(cols+"ch");
          }
          if (typeof(rows) !== 'undefined' && rows > 0) {
            rows = (rows*lineHeight)+"px";
            self.cm.setSize(null, rows);
          }

          // forward events to shell
          self.on("focus", function() {
            if (typeof(self.shell.onFocus) !== 'undefined') {
              self.shell.onFocus();
            }
          });

          // extend extra keys
          var extraKeys = $.extend(true, {}, 
            self.cm.getOption("extraKeys"), {
              "Ctrl-F": function() {
                self.openSearchDialog();
              },
              "Ctrl-G": function() {
                self.search();
              },
              "F3": function() {
                self.search();
              }
          });
          self.cm.setOption("extraKeys", extraKeys);

          self.cm.on("keyup", function(cm, ev) {
            self.shell.handleKeyUp(ev);
            if (ev.key === "Escape") {
              self.manageWidgets();
            }
          });
          self.cm.on("keydown", function(cm, ev) {
            self.shell.handleKeyDown(ev);
          });

          self.on("change", _debounce(function(cm) {
            self.manageWidgets();
          }, 500));

          self.manageWidgets();

/*
	  self.on("viewportChange", function(cm, from, to) {
	    console.log("viewportChange from=",from,"to=",to);
	  });
	  self.on("focus", function(cm, ev) {
	    console.log("focus ev=",ev);
	  });
	  self.on("scrollCursorIntoView", function() {
	    console.log("scrollCursorIntoView");
	  });
	  self.on("scroll", function() {
	    console.log("scroll");
	  });
	  self.on("update", function() {
	    console.log("update");
	  });
*/

          dfd.resolve(self);
        });
    });
  });

  // listen to window resize and refresh codemirror.  a resize event is also triggered by a jquery.tabpane.
  // a codemirror element must be refreshed when becoming visible then.
  // (see also https://github.com/codemirror/CodeMirror/issues/3527)
  $(window).on("resize", function() {
    if (typeof(self.cm) !== 'undefined') {
      self.cm.refresh();
    }
  });

  return dfd.promise();
};

/*************************************************************************
 * intercept save process
 */
CodemirrorEngine.prototype.beforeSubmit = function(/*action*/) {
  var self = this;

  self.cm.save(); // copy to textarea

  return $.Deferred().resolve().promise();
};

/*************************************************************************
 * register events to editor engine
 */
CodemirrorEngine.prototype.on = function(eventName, func) {
  var self = this;

  self.cm.on(eventName, func);  
  return self.cm;
};

/*************************************************************************
 * replace specific elements with widgets to display them 
 */
CodemirrorEngine.prototype.manageWidgets = function() {
  var self = this;

  EmojiWidget.createWidgets(self);
  LinkWidget.createWidgets(self);
};

/*************************************************************************
 * remove the selected substring
 */
CodemirrorEngine.prototype.remove = function() {
  var self = this;

  return self.cm.replaceSelection("");
};

/*************************************************************************
 * set the cursor to a line and char position
 */
CodemirrorEngine.prototype.setCursor = function(coords) {
  var self = this,
      doc = self.cm.getDoc();

  doc.setCursor(coords);
};

/*****************************************************************************
 * get the line and char of the cursor
 */
CodemirrorEngine.prototype.getCursor = function() {
  //var self = this,
  return this.cm.getCursor();
};

/*****************************************************************************
 * get the coordinates of the cursor
 */
CodemirrorEngine.prototype.getCursorCoords = function(chOffset) {
  var self = this,
      pos = self.cm.getCursor();

  return this.cm.charCoords({line: pos.line, ch: pos.ch + chOffset});
};

/*****************************************************************************
 * get text from line start to cursor
 */
CodemirrorEngine.prototype.getBeforeCursor = function(include) {
  var self = this,
      cursor = self.cm.getCursor(),
      line = self.cm.getLine(cursor.line),
      end = cursor.ch + (include?1:0);

  return line.slice(0, end);
};

/*****************************************************************************
 * get text from cursor to line end
 */
CodemirrorEngine.prototype.getAfterCursor = function(include) {
  var self = this,
      cursor = self.cm.getCursor(),
      line = self.cm.getLine(cursor.line),
      start = cursor.ch + (include?0:1);

  return line.slice(start);
};

/*************************************************************************
 * returns a Range object for the word at the cursor position 
 */
CodemirrorEngine.prototype.getWord = function() {
  var self = this,
      cursor = self.cm.getCursor(),
      range = self.cm.findWordAt(cursor),
      string = self.cm.getRange(range.anchor, range.head);

  /*
  console.log("range: ", range);
  console.log("word: ", string);
  */

  return string; //{start: range.anchor, end: range.head, text: string};
};

/*************************************************************************
  * returns the currently selected lines
  */
CodemirrorEngine.prototype.getSelectionLines = function() {
  var self = this,
      doc = self.cm.getDoc(),
      start = doc.getCursor("from"),
      end = doc.getCursor("to");

  start.ch = 0;
  start = doc.posFromIndex(doc.indexFromPos(start));

  end.line++;
  end.ch = 0;
  end = doc.posFromIndex(doc.indexFromPos(end)-1);

  //self.shell.log("start=",start,"end=",end);

  doc.setSelection(start, end);

  return doc.getSelection();
};

/*************************************************************************
 * returns the current selection
 */
CodemirrorEngine.prototype.getSelection = function() {
  var self = this;

  return self.cm.getSelection();
};

/*************************************************************************
  * returns the current selection
  */
CodemirrorEngine.prototype.getSelectionRange = function() {
  var self = this;

  return self.cm.getDoc().getSelection();
};

/*************************************************************************
 * returns true if changes have beem made
 */
CodemirrorEngine.prototype.hasChanged = function() {
  var self = this,
    hasChanged = !self.cm.getDoc().isClean();

  return hasChanged;
};


/*************************************************************************
 * undo recent change
 */
CodemirrorEngine.prototype.undo = function() {
  var self = this;

  return self.cm.undo();
};

/*************************************************************************
 * redo recent change
 */
CodemirrorEngine.prototype.redo = function() {
  var self = this;

  return self.cm.redo();
};

/*************************************************************************
 * replace text between two positions
 */
CodemirrorEngine.prototype.replace = function(text, from, to) {
  var self = this,
      doc = self.cm.getDoc();

  doc.replaceRange(text, from, to);
};

/*************************************************************************
 * insert stuff at the given cursor position
 */
CodemirrorEngine.prototype.insert = function(text) {
  var self = this,
      doc = self.cm.getDoc(),
      start = doc.getCursor();

  doc.replaceRange(text, start);
};

/*************************************************************************
 * used for line oriented tags - like bulleted lists
 * if you have a multiline selection, the tagOpen/tagClose is added to each line
 * if there is no selection, select the entire current line
 * if there is a selection, select the entire line for each line selected
 */
CodemirrorEngine.prototype.insertLineTag = function(markup) {
  var self = this,
      tagOpen = markup[0],
      selection,
      sampleText = markup[1],
      tagClose = markup[2],
      doc = self.cm.getDoc(),
      listRegExp = new RegExp(/^(( {3})*)( {3})(\* |\d+ |\d+\. )/),
      start, end, i, subst, line, lines, nrSpaces = 0, result = [];

  selection = self.getSelectionLines() || sampleText;

  lines = selection.split(/\r?\n/);
  for (i = 0; i < lines.length; i++) {
    line = lines[i];

    if (line.match(/^\s*$/)) {
      // don't append tagOpen to empty lines
      subst = line;
    } else {
      // special case - undent (remove 3 spaces, and bullet or numbered list if outdenting away)
      if ((tagOpen === '' && sampleText === '' && tagClose === '')) {
        subst = line.replace(/^ {3}(\* |\d+ |\d+\. )?/, '');
      }

      // special case - list transform
      else if (listRegExp.test(line) && ( tagOpen === '   1 ' || tagOpen === '   * ')) {
        nrSpaces = RegExp.$1.length; 
        subst = line.replace(listRegExp, '$1' + tagOpen) + tagClose;
      } else {
        subst = tagOpen + line + tagClose;
      }
    }

    result.push(subst);
  }
  selection = result.join("\n");

  doc.replaceSelection(selection, "start");
  if (lines.length === 1) {
    start = doc.posFromIndex(nrSpaces + tagOpen.length + doc.indexFromPos(doc.getCursor()));
    end = doc.posFromIndex(doc.indexFromPos(doc.getCursor()) + selection.length);
  } else {
    start = doc.posFromIndex(nrSpaces + doc.indexFromPos(doc.getCursor()));
    end = doc.posFromIndex(doc.indexFromPos(doc.getCursor())+selection.length);
  }

  doc.setSelection(start, end);

  self.cm.focus();
};

/*************************************************************************
 * insert a topic markup tag 
 */
CodemirrorEngine.prototype.insertTag = function(markup) {
  var self = this,
      tagOpen = markup[0],
      selection,
      tagClose = markup[2],
      doc = self.cm.getDoc(),
      start, end;

  selection = self.getSelectionRange() || markup[1];
  doc.replaceSelection(tagOpen+selection+tagClose, "start");

  start = doc.posFromIndex(doc.indexFromPos(doc.getCursor())+tagOpen.length);
  end = doc.posFromIndex(doc.indexFromPos(doc.getCursor())+tagOpen.length+selection.length);

  //self.shell.log("start=",start,"end=",end);
  doc.setSelection(start, end);
};

/******************************************************************************/
CodemirrorEngine.prototype.getSearchState = function() {
  var self = this;

  if (typeof(self.searchState) === 'undefined') {
    self.searchState = new SearchState();
  }

  return self.searchState;
};

/******************************************************************************/
CodemirrorEngine.prototype.clearSearchState = function() {
  var self = this,
      state = self.getSearchState();

  if (state.overlay) {
    self.cm.removeOverlay(state.overlay);
  }

  if (state.annotate) { 
    state.annotate.clear(); 
  }

  self.searchState = undefined;
};

/******************************************************************************/
CodemirrorEngine.prototype.searchOverlay = function(term, ignoreCase) {
  var query;

  if (typeof(term) === 'string') {
    query = new RegExp(term.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&"), ignoreCase ? "gi" : "g");
  } else {
    query = term;
  }

  return {
    token: function(stream) {
      query.lastIndex = stream.pos;
      var match = query.exec(stream.string);
      if (match && match.index === stream.pos) {
        stream.pos += match[0].length || 1;
        return "searching";
      } else if (match) {
        stream.pos = match.index;
      } else {
        stream.skipToEnd();
      }
    }
  };
};

/*****************************************************************************
 * opens the search dialog
 */
CodemirrorEngine.prototype.openSearchDialog = function() {
  var self = this;

  if (self._searchDialogOpen) {
    self.shell.log("dialog is open");
    return;
  }

  self._searchDialogOpen = true;

  self.shell.dialog({
    name: "searchdialog",
    data: {
        web: self.shell.opts.web,
        topic: self.shell.opts.topic,
        selection: self.getSelection() || self.getSearchState().query
    }
  }).then(function(dialog) {
      var $dialog = $(dialog),
          search = $dialog.find("input[name='search']").val(),
          ignoreCase = $dialog.find("input[name='ignorecase']:checked").length?true:false;
      self._searchDialogOpen = false;
      self.search(search, ignoreCase);
    }, function(/*dialog*/) {
      self._searchDialogOpen = false;
      self.clearSearchState();
    }
  );
};

/*****************************************************************************
 * search in editor
 */
CodemirrorEngine.prototype.search = function(term, ignoreCase) {
  var self = this, state, query;

  if (typeof(term) !== 'undefined') {
    if (/^\s*\/(.*)\/\s*$/.test(term)) {
      query = new RegExp(RegExp.$1, ignoreCase ? "gi" : "g");
    } else {
      query = term;
    }

    self.clearSearchState();
    state = self.getSearchState();
    state.cursor = self.cm.getSearchCursor(query, 0, ignoreCase);
    state.overlay = self.searchOverlay(query, ignoreCase);
    state.query = query;
    self.cm.addOverlay(state.overlay);
    if (self.cm.showMatchesOnScrollbar) {
      if (state.annotate) { 
        state.annotate.clear(); 
        state.annotate = null; 
      }
      state.annotate = self.cm.showMatchesOnScrollbar(query, ignoreCase);
    }
  } else {
    state = self.getSearchState();
  }

  if (state.cursor) {
    if(state.cursor.findNext()) {
      state.found = true;
      self.cm.setSelection(state.cursor.from(), state.cursor.to());
      self.cm.scrollIntoView({from: state.cursor.from(), to: state.cursor.to()}, 20);
    } else {
      self.shell.showMessage("info", state.found?$.i18n("no more matches"):$.i18n("nothing found"));
      self.clearSearchState();
    }
  }
};

/*****************************************************************************
 * search & replace a term in the editor
 */
CodemirrorEngine.prototype.searchReplace = function(term, text, ignoreCase) {
  var self = this, cursor, i, query;

  if (/^\s*\/(.*)\/\s*$/.test(term)) {
    query = new RegExp(RegExp.$1);
  } else {
    query = term;
  }

  cursor = self.cm.getSearchCursor(query, 0, ignoreCase);

  for(i = 0; cursor.findNext(); i++) {
    cursor.replace(text);
  }

  return i;
};

/*************************************************************************
 * get the DOM element that holds the editor engine
 */
CodemirrorEngine.prototype.getWrapperElement = function() {
  var self = this;

  return self.cm?$(self.cm.getWrapperElement()):null;
};

/*************************************************************************
 * set focus
 */
CodemirrorEngine.prototype.focus = function() {
  var self = this;

  self.cm.focus();
};

/*************************************************************************
 * set the size of editor
 */
CodemirrorEngine.prototype.setSize = function(width, height) {
  var self = this;

  self.cm.setSize(width, height);
  self.cm.refresh();
};


/*************************************************************************
 * set the size of editor
 */
CodemirrorEngine.prototype.getSize = function() {
  var self = this, info;

  info = self.cm.getScrollInfo();
  return {
    width: info.width,
    height: info.height
  };
};

/*************************************************************************
 * set the value of the editor
 */
CodemirrorEngine.prototype.setValue = function(val) {
  var self = this;

  self.cm.setValue(val);
};

/*************************************************************************
 * get the value of the editor
 */
CodemirrorEngine.prototype.getValue = function() {
  var self = this;

  return self.cm.getValue();
};

/***************************************************************************
 * editor defaults
 */
CodemirrorEngine.defaults = {
  //value
  mode: 'foswiki',
  theme: 'foswiki',
  indentUnit: 3, 
  smartIndent: false,
  tabSize: 3,
  indentWithTabs: false, 
  //rtlMoveVisually
  electricChars: false,
  keyMap: "default", // or vim
  lineWrapping: true,
  lineNumbers: false, 
  firstLineNumber: 1,
  //lineNumberFormatter
  readOnly: false,
  showCursorWhenSelecting: false,
  undoDepth: 40,
  //tabindex
  autofocus: false,
  autoresize: false,
  singleCursorHeightPerLine: false,

  //gutters
  fixedGutter: true,
  foldGutter: true,
  gutters: [
    "CodeMirror-linenumbers", 
    "CodeMirror-foldgutter"
  ],

  // addon options
  extraKeys: {
    "Enter": "newlineAndIndentContinueFoswikiList",
    "Tab": "insertSoftTab",
    "Ctrl-Q": "toggleFold"
  },
  matchBrackets: true
  //bracketRegex: new RegExp('[(){}\[\]<>')
  //enterMode: "keep", 
  //tabMode: "shift" 
};

/*************************************************************************
 * register engine to NatEditor shell
 */
$.NatEditor.engines.CodemirrorEngine = {
  createEngine: function(shell) {
    return (new CodemirrorEngine(shell)).init();
  }
};

})(jQuery);
