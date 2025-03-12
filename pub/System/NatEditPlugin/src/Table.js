/*
 * Table 
 *
 * Copyright (c) 2024-2025 Michael Daum http://michaeldaumconsulting.com
 *
 * Licensed under the GPL license http://www.gnu.org/licenses/gpl.html
 *
 */

"use strict";
(function(module, $) {

  const debug = false;

  /* utils **************************************************************/
  function log() {
    var args;

    if (console && debug) {
      args = $.makeArray(arguments);
      args.unshift("TABLE: ");
      console && console.log.apply(console, args); // eslint-disable-line no-console
    }
  };

  /* class TableCell ***************************************************/
  function TableCell(text) {
    var self = this;

    //log("called new TableCell for",text);
    text = text || "";
    self.rawContent = text;

    self.content = text.trimStart();
    self.paddingLeft = self.rawContent.length - self.content.length;

    self.content = self.content.trimEnd();

    if (self.content === "") {
      if (self.paddingLeft == 0) {
        self.paddingRight = 0;
      } else {
        self.paddingRight = self.paddingLeft - 1;
        self.paddingLeft = 1;
      }
    } else {
      self.paddingRight = self.rawContent.length - self.content.length - self.paddingLeft;
    }

    if (/^\*(.*)\*$/.test(self.content)) {
      self.isHeader = true;
      self.content = RegExp.$1;
    } else {
      self.isHeader = false;
    }

    //log("...",self);
  }

  TableCell.prototype.copyFrom = function(other) {
    var self = this;

    if (other) {
      self.isHeader = other.isHeader;
      self.paddingLeft = other.paddingLeft;
      self.paddingRight = other.paddingRight;
      self.rawContent = other.rawContent;
      self.content = other.content;
    }

    return self;
  };

  TableCell.prototype.getAlignment = function() {
    var self = this;

    if (self.paddingLeft > 1) {
      if (self.paddingRight > 1 ) {
        return "center";
      }
      return "right";
    }
    if (!self.paddingLeft && !self.paddingRight) {
      return "none"
    }

    return "left";
  }

  TableCell.prototype.normalize = function() {
    var self = this;

    if (!self.paddingLeft && !self.paddingRight) {
      return;
    }

    if (self.paddingLeft < 1) {
      self.paddingLeft = 1;
    }

    if (self.paddingRight < 1) {
      self.paddingRight = 1;
    }

    if (self.content === "") {
      self.paddingLeft = 1;
      self.paddingRight = 0;
      return;
    }

    switch(self.getAlignment()) {
      case "none":
      case "left":
        self.paddingLeft = self.paddingRight = 1;
        break;
      case "right":
        self.paddingLeft = 2;
        self.paddingRight = 1;
        break;
      case "center":
        self.paddingLeft = 2;
        self.paddingRight = 2;
        break;
    }
  };

  TableCell.prototype.getWidth = function() {
    var self = this;
    return self.paddingLeft + self.content.length + self.paddingRight + (self.isHeader ? 2:0);
  };

  TableCell.prototype.setWidth = function(newWidth) {
    var self = this, 
      align = self.getAlignment(),
      contentWidth = self.content.length + (self.isHeader ? 2:0);

    newWidth = newWidth || 1;

    switch(align) {
      case "none":
      case "left":
        self.paddingLeft = 1;
        self.paddingRight = newWidth - contentWidth - 1;
        break;
      case "right":
        self.paddingRight = 1;
        self.paddingLeft = newWidth - contentWidth - 1;
        break;
      case "center":
        self.paddingRight = self.paddingLeft = Math.floor((newWidth - contentWidth) / 2);
        if ((newWidth - contentWidth) % 2) {
          self.paddingRight++;
        }
        break;
    }

    if (self.paddingLeft < 1 ) {
      self.paddingLeft = 1;
    }

    if (self.paddingRight < 1 ) {
      self.paddingRight = 0;
    }
  };

  TableCell.prototype.toString = function() {
    var self = this,
      align = self.getAlignment();

    return " ".repeat(self.paddingLeft) 
      + (self.isHeader?"*":"") 
      + self.content 
      + (self.isHeader?"*":"") 
      + " ".repeat(self.paddingRight);
  };

  TableCell.prototype.toHtml = function() {
    var self = this, 
      align = self.getAlignment(),
      node = self.isHeader ? "th" : "td";

    if (align !== "none" && align !== "left") {
      align = ` align="${align}"`;
    } else {
      align = "";
    }

    return `<${node}${align}>${self.content}</${node}>`;
  };

  /* class TableRow ***************************************************/
  function TableRow(line) {
    var self = this;

    line = line || "";
    //log("called TableRow for",line);
    self.prefix = ""; 
    self.suffix = ""; 
    self.cells = [];
    self.rawContent = line;
    self.parseCells(line).forEach(function(cell) {
      self.cells.push(new TableCell(cell));
    });
  }

  TableRow.prototype.copyFrom = function(other) {
    var self = this;

    if (other) {
      other.cells.forEach(function(cell, i) {
        self.cells[i] && self.cells[i].copyFrom(cell);
      });
    }

    return self;
  };

  TableRow.prototype.init = function(cols, isHeader) {
    var self = this;

    cols = cols || 0;
    self.cells = [];

    for (let i = 0; i < cols; i++) {
      let cell = new TableCell();
      cell.isHeader = isHeader;
      self.cells.push(cell);
    }

    return self;
  };

  TableRow.prototype.parseCells = function(line) {
    var self = this, cells = [], 
      buf = "", rest = line, found = false;

    while (rest !== "") {
      if (!found) {
        if (rest[0] === "|") {
          found = true;
        } else {
          if (rest[0] === ' ') {
            self.prefix += rest[0];
          } else {
            //console.log("non whitespace prefix found ... ");
            return []; // non whitespace prefix -> no table row
          }
        }
        rest = rest.substr(1);
        continue;
      }

      switch (rest[0]) {
        case "\\":
          // escape next character
          if (rest.length >= 2) {
            buf += rest.substr(0, 2);
            rest = rest.substr(2);
          } else {
            buf += "\\";
            rest = rest.substr(1);
          }
          break;
        case "|":
          // flush buffer
          cells.push(buf);
          buf = "";
          rest = rest.substr(1);
          break;
        default:
          buf += rest[0];
          rest = rest.substr(1);
      }
    }

    if (!/^\s*$/.test(buf)) {
      // non whitespace suffix found -> no table row
      return [];
    }


    self.suffix = buf;
    return cells;
  };

  TableRow.prototype.getWidth = function(col) {
    var self = this, cell;

    if (typeof(col) === 'undefined') {
      return self.cells.length;
    }

    cell = self.cells[col];
    return cell ? cell.getWidth() : 0;
  };

  TableRow.prototype.toString = function() {
    var self = this;

    if (self.cells.length) {
      return self.prefix + "|" + self.cells.map(cell => cell.toString()).join("|") + "|" + self.suffix;
    }
    return self.rawContent;
  };

  TableRow.prototype.toHtml = function() {
    var nodes = this.cells.map(cell => cell.toHtml());

    return "<tr>"+nodes.join("")+"</tr>";
  };


  /* class Table ***************************************************/
  function Table(text) {
    var self = this;

    text = text || "";
    self.rawContent = text;
    self.rows = [];
    self.offset = 0;
    self.position = {row: 0, col:0 };

    //log("called new Table for ",text);
    text.split("\n").forEach(function(line) {
      if (line !== "") {
        self.rows.push(new TableRow(line));
      }
    });
  }

  Table.prototype.copyFrom = function(other) {
    var self = this;

    if (other) {
      other.rows.forEach(function(row, i) {
        self.rows[i] && self.rows[i].copyFrom(row);
      });
    }

    return self;
  };

  Table.prototype.init = function (rows, cols, heads) {
    var self = this;

    self.rows = [];
    rows = rows || 0;
    cols = cols || 0;
    heads = heads || 0;

    for (let i = 0; i < heads; i++) {
      let row = new TableRow();
      row.init(cols, true);
      self.rows.push(row);
    }
    
    for (let i = 0; i < rows; i++) {
      let row = new TableRow();
      row.init(cols, false);
      self.rows.push(row);
    }

    return self;
  };

  Table.prototype.getWidth = function(col) {
    return this.rows
      .map(row => row.getWidth(col))
      .reduce((x, y) => Math.max(x, y), 0);
  }

  Table.prototype.getColumn = function(col) {
    var self = this, cells = [];

    self.rows.forEach(function(row) {
      cells.push(row.cells[col] || new TableCell());
    });

    return cells;
  };

  Table.prototype.toString = function() {
    var self = this;

    return self.rows.map(row => row.toString()).join("\n") + "\n";
  };

  Table.prototype.toHtml = function() {
    var nodes = this.rows.map(row => row.toHtml());

    return "<table>\n"+nodes.join("\n")+"\n</table>";
  };

  Table.prototype.normalize = function(alignColumns) {
    var self = this, 
      width = self.getWidth(),
      prefix, prefixLen;

    // get min prefix
    prefixLen = self.rows
                 .map(row => row.prefix.length)
                 .reduce((x, y) => Math.min(x,y), 99999);

    prefix = " ".repeat(prefixLen);

    // rows
    self.rows.forEach(function(row) {
      row.prefix = prefix;

      while (row.getWidth() < width) {
        row.cells.push(new TableCell("  "));
      }

      row.cells.forEach(cell => cell.normalize());
    });

    // columns
    if (alignColumns) {
      for (let col = 0; col < width; col++) {
        var colWidth = self.getWidth(col);
        log("col=",col,"colWidth=",colWidth);
        self.getColumn(col).forEach(function(cell) {
          if (cell.getAlignment() !== "none") {
            cell.setWidth(colWidth);
          }
        });
      }
    }
  };

  Table.prototype.setPosition = function(cursor, offset) {
    var self = this,
      line = cursor.line - offset,
      ch = cursor.ch,
      row = self.rows[line],
      cols = row.getWidth(),
      width = 0;

    if (row === undefined) {
      return;
    }

    let i;
    ch -= row.prefix.length;

    for (i = 0; i < cols; i++) {
      width += row.cells[i].getWidth() + 1;
      if (width >= ch) {
        i++;
        break;
      }
    }

    self.position = {row: line, col: i-1};
    self.offset = offset || 0;

    return self.position;

  };

  Table.prototype.getCell = function(row, col) {
    var row = this.rows[row];
    return row === undefined ? undefined : row.cells[col];
  };

  Table.prototype.getCurrentCell = function() {
    return this.getCell(this.position.row, this.position.col);
  };

  Table.prototype.getCursor = function() {
    var self = this, cursor = {},
      row = self.rows[self.position.row],
      cell;

    if (row === undefined) {
      return;
    }

    cell = row.cells[self.position.col];
    cursor.line = self.offset + self.position.row;
    cursor.ch = row.prefix.length;

    for (let i = self.position.col -1; i >= 0; i--) {
      cursor.ch += row.cells[i].getWidth() + 1;
    }
    cursor.ch += row.cells[self.position.col].paddingLeft + 1;

    return cursor;
  };

  Table.prototype.gotoFirstCol = function() {
    var self = this;
    self.position.col = 0;
  };

  Table.prototype.gotoLastCol = function() {
    var self = this;
    self.position.col = self.rows[self.position.row].cells.length - 1;
  };

  Table.prototype.isLastCol = function () {
    var self = this;
    return self.position.col === self.rows[self.position.row].cells.length - 1;
  };

  Table.prototype.gotoPrevCol = function() {
    var self = this,
      pos = Object.assign({}, self.position);

    pos.col--;

    if (pos.col < 0) {
      pos.row--;
      if (pos.row < 0) {
        return;
      }
      pos.col = self.rows[pos.row].cells.length - 1;
    }

    self.position = pos;
  };

  Table.prototype.gotoNextCol = function() {
    var self = this,
      pos = Object.assign({}, self.position);

    pos.col++;

    if (self.rows[pos.row].cells[pos.col] === undefined) {
      pos.row++;
      pos.col = 0;
      if (pos.row >= self.rows.length) {
        return;
      }
    }

    self.position = pos;
  };

  Table.prototype.gotoPrevRow = function() {
    var self = this;
      pos = self.position;

    pos.row--;
    if (pos.row < 0) {
      return;
    }

    self.position = pos;
  };

  Table.prototype.gotoNextRow = function() {
    var self = this;
      pos = self.position;

    pos.row++;
    if (self.rows[pos.row] === undefined) {
      return;
    }

    self.position = pos;
  };

  Table.prototype.moveRowUp = function(r) {
    var self = this;

    if (r === undefined) {
      r = self.position.row;
    }

    if (r <= 0) {
      return false;
    }
    self.rows[r - 1] = self.rows.splice(r, 1, self.rows[r - 1])[0];

    return true;
  };

  Table.prototype.moveRowDown = function(r) {
    var self = this;

    if (r === undefined) {
      r = self.position.row;
    }

    if (r >= self.rows.length - 1) {
      return false;
    }
    self.rows[r + 1] = self.rows.splice(r, 1, self.rows[r + 1])[0];

    return true;
  };

  Table.prototype.moveColumnLeft = function(c) {
    var self = this;

    if (c === undefined) {
      c = self.position.col;
    }

    if (c <= 0 ) {
      return false;
    }

    self.rows.forEach(function(row) {
      row.cells[c - 1] = row.cells.splice(c, 1, row.cells[c - 1])[0];
    });

    return true;
  };

  Table.prototype.moveColumnRight = function(c) {
    var self = this;

    if (c === undefined) {
      c = self.position.col;
    }

    if (c >= self.getWidth() - 1) {
      return false;
    }

    self.rows.forEach(function(row) {
      row.cells[c + 1] = row.cells.splice(c, 1, row.cells[c + 1])[0];
    });

    return true;
  };

  Table.prototype.insertColumn = function(col) {
    var self = this;

    if (col === undefined) {
      col = self.position.col;
    }

    if (col < 0 || col > self.getWidth()) {
      return;
    }

    self.rows.forEach(function(row) {
      row.cells.splice(col, 0 , new TableCell("  "));
    });
  };

  Table.prototype.deleteColumn = function(col) {
    var self = this;

    if (col === undefined) {
      col = self.position.col;
    }

    if (col < 0 || col > self.getWidth()) {
      return false;
    }

    self.rows.forEach(function(row) {
      row.cells.splice(col, 1);
    });

    if (self.position.col >= self.getWidth()) {
      self.position.col--;
    }

    return true;
  };

  Table.prototype.insertRowAfter = function(row) {
    var self = this,
      newRow = new TableRow();

    if (row === undefined) {
      row = self.position.row;
    }

    newRow.prefix = self.rows[row].prefix;
    newRow.suffix = self.rows[row].suffix;

    for (let i = self.getWidth(); i > 0; i--) {
      let cell = new TableCell("   ");
      newRow.cells.push(cell);
    }

    self.rows.splice(self.position.row+1, 0, newRow);

    return newRow;
  };

  Table.prototype.deleteRow = function(row) {
    var self = this;

    if (row === undefined) {
      row = self.position.row;
    }

    self.rows.splice(row, 1);

    if (self.position.row >= self.rows.length) {
      self.position.row--;
    }
  };

  /* static class methods ***************************************************/

  /* test if text holds a table */
  Table.isInTable = function (text) {
    if (text) {
      let row = new TableRow(text);
      return row.cells.length > 0;
    } else {
      return false;
    }
  }


  /* create a table based on the given parameters
   * opts: 
   * {
   *   heads: integer, // number of header rows
   *   rows: integer, // number of rows
   *   cols: integer, // number of columns
   *   init: table, // another table from which to copy the cells into the new table
   * }
   */
  Table.create = function(opts) {
    var table = 
      new Table()
        .init(opts.rows, opts.cols, opts.heads)
        .copyFrom(opts.init);

    table.rows.forEach(function(row, i) {
      row.cells.forEach(function(cell, j) {
        if (cell.content === "") {
          cell.content = cell.isHeader ? "header" : "data";
          cell.paddingLeft = cell.paddingRight = 1;
        }
      });
    });

    return table;
  };

  // export /////////////////////////////////////////////////////////
  module.TableCell = TableCell;
  module.TableRow = TableRow;
  module.Table = Table;

})(foswiki, jQuery);
