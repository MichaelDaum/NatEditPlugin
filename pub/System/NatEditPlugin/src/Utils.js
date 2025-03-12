/*
 * Utils for NatEdit
 *
 * Copyright (c) 2021-2025 Michael Daum http://michaeldaumconsulting.com
 *
 * Licensed under the GPL license http://www.gnu.org/licenses/gpl.html
 *
 */

/* eslint-disable no-unused-vars */

"use strict";

function _last(array) {
    return array[array.length - 1];
}

function _debounce(callback, wait) {
  return function(...args) {
    clearTimeout(_debounce.timeout);
    _debounce.timeout = setTimeout(function() {
      callback(...args);
    }, wait);
  };
}

function _wrapText(text, len) {
  var lines = [], 
    buf = "", 
    ch,
    newLine = false;

  len = len || 80;
  text = text.trim();

  while(text !== '') {
    ch = text[0];

    if (ch === "\n") {

      if (newLine) {
        lines.push(buf.trim());
        lines.push(""); // add an empty line
        buf = "";
        newLine = false;
        text = text.substr(1);
        continue;
      } 

      newLine = true;
      ch = " ";
    } else {
      newLine = false;
    }

    if (buf.length >= len && ch === " ") {
      lines.push(buf.trim());
      buf = "";
    } else {
      buf += ch;
    }

    text = text.substr(1);
  }
  if (buf !== "") {
    lines.push(buf.trim());
  }

  return lines.join("\n");
}

// compare two positions
function _posEqual(pos1, pos2) {
  return (pos1.line == pos2.line && pos2.ch == pos1.ch);
}

// return negative / 0 / positive.  a < b iff _posCmp(a, b) < 0 etc.
function _posCmp(a, b) {
  return (a.line - b.line) || (a.ch - b.ch);
}

// true if inside, false if on edge.
function _posInsideRange(pos, range) {
  return _posCmp(range.from, pos) < 0 && _posCmp(pos, range.to) < 0;
}

// true if outside, true if on edge
function _posOutsideRange(pos, range) {
  return _posCmp(range.from, pos) > 0 || _posCmp(pos, range.to) > 0;
}

// true if there is at least one character in common, false if just touching.
function _rangesOverlap(range1, range2) {
  return (_posCmp(range1.from, range2.to) < 0 &&
          _posCmp(range2.from, range1.to) < 0);
}

function _escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}
