/*
 * NatEdit: codemirror engine
 *
 * Copyright (c) 2016-2025 Michael Daum http://michaeldaumconsulting.com
 *
 * Licensed under the GPL license http://www.gnu.org/licenses/gpl.html
 *
 */

/*global BaseEngine:false CodeMirror:false EmojiWidget:false LinkWidget:false ImageWidget:false _debounce:false _posEqual:false */

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
  self.id = "CodemirrorEngine";
  self.type = "wikiwyg";
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
      editorPath = pubUrlPath+'/'+systemWeb+'/NatEditPlugin/lib/codemirror',
      dfd = $.Deferred();

  if (self.isInited) {
    self.shell.log("... engine already inited");
    return dfd.resolve();
  }
  self.isInited = true;

  self.shell.log("called codemirror init");
  $('<link>')
    .appendTo('head')
    .attr({type : 'text/css', rel : 'stylesheet'})
    .attr('href', editorPath + '/pkg.css');

/*
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
*/

  self.shell.getScript(editorPath+"/lib/codemirror.js").done(function() {
    CodeMirror.modeURL = editorPath+'/'+'/mode/%N/%N.js';

    $.when(
      self.parent.init(),
      self.shell.getScript(editorPath+"/pkg.js"),
      /*
      self.shell.getScript(editorPath+"/addon/mode/loadmode.js"),
      //self.shell.getScript(editorPath+"/addon/fold/foldcode.js"),
      //self.shell.getScript(editorPath+"/addon/fold/foldgutter.js"),
      self.shell.getScript(editorPath+"/addon/search/searchcursor.js"),
      self.shell.getScript(editorPath+"/addon/scroll/annotatescrollbar.js"),
      self.shell.getScript(editorPath+"/addon/search/matchesonscrollbar.js"),
      self.shell.getScript(editorPath+"/addon/edit/matchbrackets.js"),
      self.shell.getScript(editorPath+"/addon/dialog/dialog.js"),
      self.shell.getScript(editorPath+"/keymap/vim.js")
      */
    ).done(function() {

        // extend vim mode to make :w and :x work
        CodeMirror.commands.save = function() {
          self.shell.formManager.checkPoint();
        };

        CodeMirror.Vim.defineEx("x", undefined, function() {
          self.shell.formManager.save();
        });


        CodeMirror.Vim.defineOperator("wrapText", function(cm, params) {
          self.wrapText();
        });

        CodeMirror.Vim.mapCommand("gq", "operator", "wrapText", undefined, {isEdit: true});

        CodeMirror.Vim.defineEx("xa", undefined, function() {
          self.shell.formManager.save();
        });

        CodeMirror.Vim.defineEx("qa", undefined, function() {
          self.shell.formManager.cancel();
        });

        CodeMirror.Vim.defineEx("q", undefined, function() {
          self.shell.formManager.cancel();
        });

        CodeMirror.requireMode(self.opts.mode || 'foswiki', function() {
          var cols = parseInt(self.shell.txtarea.attr("cols"), 10) || 10000,
              rows = parseInt(self.shell.txtarea.attr("rows"), 10),
              lineHeight = parseInt(self.shell.txtarea.css("line-height"), 10);

          self.cm = CodeMirror.fromTextArea(self.shell.txtarea[0], self.opts); 
          //window.cm = self.cm; //playground

          // only set the width if specified by a cols attribute and not any css styled width
          if (typeof(cols) !== 'undefined' && !self.shell.txtarea[0].style.width) {
            self.cm.setSize(`min(${cols}ch,100%)`);
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
            self.handleKeyUp(ev);
          });
          self.cm.on("keydown", function(cm, ev) {
            self.handleKeyDown(ev);
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
 * word wrap selected lines longer than 80 chars
 */
CodemirrorEngine.prototype.wrapText = function() {
  var self = this,
    lines = _wrapText(self.getSelection() || "") + "\n";

  self.remove();
  self.insert(lines);
};

/*************************************************************************
 * local handler for keydown events called before passing it on to the shell
 */
CodemirrorEngine.prototype.findTable = function() {
  var self = this,
      cursor = self.cm.getCursor(),
      start = cursor.line,
      end = start+1,
      lineCount = self.cm.lineCount(),
      table, row;

  row = new foswiki.TableRow(self.cm.getLine(start));
  if (!row.cells.length) {
    return;
  }

  table = new foswiki.Table();
  table.rows.push(row);

  start--;
  while (start >= 0) {
    row = new foswiki.TableRow(self.cm.getLine(start));
    if (row.cells.length) {
      table.rows.unshift(row);
      start--;
    } else {
      break;
    }
  }
  start++;

  while (end < lineCount) {
    row = new foswiki.TableRow(self.getLine(end));
    if (row.cells.length) {
      table.rows.push(row);
      end++;
    } else {
      break;
    }
  }

  table.rawContent = self.cm.getRange({line:start, ch:0}, {line: end, ch:0});
  table.setPosition(cursor, start);

  return table;
};

CodemirrorEngine.prototype.repaintTable = function(table, doCursor) {
  var self = this,
    start = CodeMirror.Pos(table.offset, 0),
    end = self.cm.findPosH(start, table.rawContent.length, "char"),
    orig, cursor;

  if (typeof(doCursor) === 'undefined') {
    doCursor = true;
  } else {
    cursor = self.getCaretPosition();
  }

  if (self.opts.normalizeTables !== 'off') {
    table.normalize(self.opts.normalizeTables === 'full');
  }

  orig = self.cm.getRange(start, end);
  self.cm.replaceRange(table.toString(), start, end, orig);

  if (doCursor) {
    cursor = table.getCursor();
  }
  cursor && self.setCaretPosition(cursor);

  return cursor;
};

CodemirrorEngine.prototype.insertTableRow = function() {
  var self = this,
    table = self.findTable();

  if (table) {
    table.insertRowAfter();
    table.position.row++;
    table.position.col = 0;
    self.repaintTable(table);
  }
};

CodemirrorEngine.prototype.deleteTableRow = function() {
  var self = this,
    table = self.findTable();

  if (table) {
    table.deleteRow();
    self.repaintTable(table);
  }
};

CodemirrorEngine.prototype.insertTableColumn = function() {
  var self = this,
    table = self.findTable();

  if (table) {
    table.insertColumn();
    self.repaintTable(table);
  }
};

CodemirrorEngine.prototype.deleteTableColumn = function() {
  var self = this,
    table = self.findTable();

  if (table && table.deleteColumn()) {
    self.repaintTable(table);
  }
};

CodemirrorEngine.prototype.moveTableRowUp = function() {
  var self = this,
    table = self.findTable();

  if (table && table.moveRowUp()) {
    table.gotoPrevRow();
    self.repaintTable(table);
  }
};

CodemirrorEngine.prototype.moveTableRowDown = function() {
  var self = this,
    table = self.findTable();

  if (table && table.moveRowDown()) {
    table.gotoNextRow();
    self.repaintTable(table);
  }
};

CodemirrorEngine.prototype.moveTableColumnLeft = function() {
  var self = this,
    table = self.findTable();

  if (table && table.moveColumnLeft()) {
    table.gotoPrevCol();
    self.repaintTable(table);
  }
};

CodemirrorEngine.prototype.moveTableColumnRight = function() {
  var self = this,
    table = self.findTable();

  if (table && table.moveColumnRight()) {
    table.gotoNextCol();
    self.repaintTable(table);
  }
};

CodemirrorEngine.prototype.handleKeyDown = function(ev) {
  var self = this, table;

  if (self._searchDialogOpen) {
    //console.log("search dialog is open, still got key",ev.key);
    ev.preventDefault();
    return false;
  }

  if (ev.key === "Escape" || 
      ev.key === "Tab" || 
      ev.key === "Home" || 
      ev.key === "End" || 
      (ev.key === "Delete" && ev.altKey) ||
      (ev.key === "Enter" && !ev.shiftKey) ||
      (ev.key === "ArrowLeft" && ev.altKey) || 
      (ev.key === "ArrowRight" && ev.altKey) || 
      (ev.key === "ArrowUp" && ev.altKey) || 
      (ev.key === "ArrowDown" && ev.altKey) || 
      (ev.key === "N" && ev.altKey) || 
      (ev.key === "n" && ev.altKey)) {

    table = self.findTable();
  }

  if (table) {
    if (!self._messageVisible) {
      self._messageVisible = true;
      self.shell.formManager.showMessage("info", self.opts.tableEditorHelp, "Table Editor", {
        sticker: true,
        insert_brs: false,
        delay: 2000,
        after_close: function() {
          self._messageVisible = false;
        }
      });
    }

    if (ev.key === "Escape") {
      self.repaintTable(table, 0);
    } 

    // alt+delete: delete row
    else if (ev.altKey && ev.key === "Delete" && !ev.shiftKey) {
      table.deleteRow();
      self.repaintTable(table);
      ev.preventDefault();
      return false;
    }

    // alt+shift+n or alt+shift+delete: delete column
    else if (ev.altKey && (ev.key === "N" || (ev.key === 'Delete' && ev.shiftKey))) {
      table.deleteColumn();
      self.repaintTable(table);
      ev.preventDefault();
      return false;
    }

    // alt+n: insert column
    else if (ev.altKey && ev.key === "n") {
      table.insertColumn();
      self.repaintTable(table);
      ev.preventDefault();
      return false;
    }

    // alt+left: move column left
    else if (ev.altKey && ev.key === "ArrowLeft") {
      if (table.moveColumnLeft()) {
        table.gotoPrevCol();
        self.repaintTable(table);
      }
      ev.preventDefault();
      return false;
    }

    // alt+right: move column right
    else if (ev.altKey && ev.key === "ArrowRight") {
      if (table.moveColumnRight()) {
        table.gotoNextCol();
        self.repaintTable(table);
      }
      ev.preventDefault();
      return false;
    }

    // alt+up: move row up
    else if (ev.altKey && ev.key === "ArrowUp") {
      if (table.moveRowUp()) {
        table.gotoPrevRow();
        self.repaintTable(table);
      }
      ev.preventDefault();
      return false;
    }

    // alt+down: move row down
    else if (ev.altKey && ev.key === "ArrowDown") {
      if (table.moveRowDown()) {
        table.gotoNextRow();
        self.repaintTable(table);
      }
      ev.preventDefault();
      return false;
    }

    // home: go to first col
    else if (ev.key === "Home") {
      if (table.position.col) {
        table.gotoFirstCol();
        self.repaintTable(table);
        ev.preventDefault();
        return false;
      }
    }

    // end: go to last col
    else if (ev.key === "End") {
      if (!table.isLastCol()) {
        table.gotoLastCol();
        self.repaintTable(table);
        ev.preventDefault();
        return false;
      }
    }

    // tab or shift+tab: go to next/prev col
    else if (ev.key === "Tab") {
      if (ev.shiftKey) {
        table.gotoPrevCol();
      } else {
        let cursor = self.getCaretPosition();
        if (cursor.ch) {
          table.gotoNextCol();
        } else {
          table.gotoFirstCol();
        }
      }

      self.repaintTable(table);
      ev.preventDefault();
      return false;
    }

    // alt+enter: insert row
    else if (ev.altKey && ev.key === "Enter") {
      table.insertRowAfter();
      table.position.row++;
      table.position.col = 0;
      self.repaintTable(table);
      ev.preventDefault();
      return false;
    } 

    // enter: go down one row in the same column
    else if (!ev.altKey && ev.key === "Enter") {
      table.gotoNextRow();
      self.repaintTable(table);
      ev.preventDefault();
      return false;
    } 
  }

  self.shell.handleKeyDown(ev);
};

/*************************************************************************
 * local handler for keyup events called before passing it on to the shell
 */
CodemirrorEngine.prototype.handleKeyUp = function(ev) {
  var self = this;

  if (ev.key === "Escape") {
    self.manageWidgets();
  }

  self.shell.handleKeyUp(ev);
};

/*************************************************************************
 * intercept save process
 */
CodemirrorEngine.prototype.beforeSubmit = function(action) {
  var self = this;

  self.shell.log("Codemirror::beforeSubmit");
  self.shell.setTextFormat("tml");
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

  if (typeof(Emojis) !== 'undefined') {
    EmojiWidget.createWidgets(self);
  }
  LinkWidget.createWidgets(self);
  //ImageWidget.createWidgets(self);
};

/*************************************************************************
 * remove the selected substring
 */
CodemirrorEngine.prototype.remove = function() {
  var self = this;

  return self.cm.replaceSelection("");
};

/*****************************************************************************
 * get the coordinates of the cursor
 */
CodemirrorEngine.prototype.getCursorCoords = function(chOffset) {
  var self = this,
      pos = self.cm.getCursor();

  return self.cm.charCoords({line: pos.line, ch: pos.ch + chOffset});
};

/*************************************************************************
 * set the caret position to a specific position. 
 */
CodemirrorEngine.prototype.setCaretPosition = function(pos) {
  var self = this;

  self.cm.focus();
  self.cm.setCursor(pos);
};

/*************************************************************************
 * get the caret position 
 */
CodemirrorEngine.prototype.getCaretPosition = function() {
  var self = this;

  return self.cm.getCursor();
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

/*****************************************************************************
 * get the line the currsor is currenly located at
 */
CodemirrorEngine.prototype.getLine = function(l) {
  var self = this;

  l = l || self.cm.getCursor().line;

  return self.cm.getLine(l);
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
 * set the selection
 */
CodemirrorEngine.prototype.setSelectionRange = function(start, end) {
  var self = this,
      doc = self.cm.getDoc();

  doc.setSelection(start, end);
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
      pos = doc.getCursor();

  doc.replaceRange(text, pos);
  self.cm.setCursor(pos); // preserve cursor
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
      self.shell.formManager.showMessage("info", state.found?$.i18n("no more matches"):$.i18n("nothing found"));
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
 * update content from textarea
 */
CodemirrorEngine.prototype.updateContent = function() {
  var self = this;

  return self.setContent(self.shell.txtarea.val());
};

/*************************************************************************
 * set value 
 */
CodemirrorEngine.prototype.setContent = function(val) {
  var self = this,
      dfd = $.Deferred();

  self.setValue(val);

  return dfd.resolve().promise();
};

/*************************************************************************
 * set the value of the editor
 */
CodemirrorEngine.prototype.setValue = function(val) {
  var self = this;

  if (typeof(self.cm) === 'undefined') {
    console.warn("called setValue while editor isn't fully loaded yet");
  } else {
    self.cm.setValue(val);
  }
};

/*************************************************************************
 * get the value of the editor
 */
CodemirrorEngine.prototype.getValue = function() {
  var self = this;

  self.shell.log("Codemirror::getValue");
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
  keyMap: "default", // or vim, sublime
  lineWrapping: false,
  lineNumbers: false, 
  firstLineNumber: 1,
  //lineNumberFormatter
  readOnly: false,
  showCursorWhenSelecting: false,
  undoDepth: 1000,
  //tabindex
  //autofocus: false,
  autoresize: false,
  singleCursorHeightPerLine: false,
  leaveSubmitMethodAlone: true,

  inputStyle: "contenteditable", /* SMELL: some ui problems in VI mode, such as cursor and focus issues */
  spellcheck: true,
  tableEditorHelp: `<table class='foswikiLayoutTable foswikiSmallish'>
    <tr><th style='width:5em'> Tab </th><td> jump to next column </td></tr>
    <tr><th> Shift-Tab </th><td> jump to previous column </td></tr>
    <tr><th> Enter </th><td> jump to next row in the same column </td></tr>
    <tr><th> Home </th><td> jump to the first column; if pressed again jump to first char in line </td></tr>
    <tr><th> End </th><td> jump to the last column; if pressed again jump to last char in line </td></tr>
    <tr><th> Alt-Enter </th><td> insert a new row </td></tr>
    <tr><th> Alt-Delete </th><td> delete the current row </td></tr>
    <tr><th> Alt-n </th><td> insert a new column </td></tr>
    <tr><th> Alt-N </th><td> delete the current column </td></tr>
    <tr><th> Alt-Up </th><td> move up current row </td></tr>
    <tr><th> Alt-Down </th><td> move down current row </td></tr>
    <tr><th> Alt-Left </th><td> move current column to the </td></tr>
    <tr><th> Alt-Right </th><td> move current column to the right </td></tr>
    </table>`,

  //gutters
/*  
  fixedGutter: true,
  foldGutter: true,
  gutters: [
    "CodeMirror-linenumbers", 
    "CodeMirror-foldgutter"
  ],
*/

  // addon options
  extraKeys: {
    "Enter": "newlineAndIndentContinueFoswikiList",
    "Tab": "insertSoftTab",
    "Ctrl-Q": "toggleFold"
  },
  matchBrackets: true,
  normalizeTables: "off"
  //bracketRegex: new RegExp('[(){}\[\]<>')
  //enterMode: "keep", 
  //tabMode: "shift" 
};

/*************************************************************************
 * register engine to NatEditor shell
 */
$.NatEditor.factory.CodemirrorEngine = {
  createEngine: function(shell) {
    return new CodemirrorEngine(shell);
  }
};

})(jQuery);
