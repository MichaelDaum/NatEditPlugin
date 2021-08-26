/*
 * Utils for NAtEdit
 *
 * Copyright (c) 2021 Michael Daum http://michaeldaumconsulting.com
 *
 * Licensed under the GPL license http://www.gnu.org/licenses/gpl.html
 *
 */

/* eslint-disable no-unused-vars */

"use strict";

function _last(array) {
    return array[array.length - 1];
}

function _throttle(callback, delay) {
  var timeout;

  return function executedFunction(...args) {

    function later() {
      clearTimeout(timeout);
      callback(...args);
    }

    clearTimeout(timeout);
    timeout = setTimeout(later, delay);
  };
}

function _debounce(callback, wait) {
  var timeout = null,
      storedEvent = null;

  return function executeFunction(event) {
    storedEvent = event;

    if (!timeout) {
      callback(storedEvent);

      storedEvent = null;

      timeout = setTimeout(function() {
        timeout = null;

        if (storedEvent) {
          executeFunction(storedEvent);
        }
      }, wait);
    }
  };
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
