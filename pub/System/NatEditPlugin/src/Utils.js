/*
 * Utils for NatEdit
 *
 * Copyright (c) 2021-2026 Michael Daum http://michaeldaumconsulting.com
 *
 * Licensed under the GPL license http://www.gnu.org/licenses/gpl.html
 *
 */

/* eslint-disable no-unused-vars */

"use strict";

// returns the last element in an array
function _last(array) {
    return array[array.length - 1];
}

// reduce the line length to max len chars, wrap the text accordingly
function _wrapText(text, len) {
  var lines = [], 
    buf = "", 
    ch,
    isNewline = false,
    isSpace = false;
    listRegExp = new RegExp(/^(( {3})* {3})(\* |\d+ |\d+\. \|\$ |: )/),
    listPrefix = "",
    listIndent = "";

  len = len || 80;

  if (listRegExp.test(text)) {
    listPrefix = RegExp.$1; 
    listIndent = " ".repeat(RegExp.$3.length);
  }

  while(text !== '') {
    ch = text[0];

    if (ch === "\n") {

      if (isNewline) {
        lines.push(buf.trim());
        lines.push(""); // add an empty line
        buf = "";
        isNewline = false;
        text = text.substr(1);
        continue;
      } 

      isNewline = true;
      ch = " ";
    } else {
      isNewline = false;
    }

    if (ch === " ") {
      if (isSpace) {
        ch = "";
      } else {
        isSpace = true;
      }
    } else {
      isSpace = false;
    }

    if (buf.length >= len && isSpace) {
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

  return listPrefix+lines.join("\n"+listPrefix+listIndent);
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

function _clearClipboardContent(text) {

  function _init() {
    if (_clearClipboardContent.attrsRegex !== undefined) {
      return;
    }

    const attrs = [
      "align", // sometimes there's a bogus align=left in there
      "border",
      "cellpadding",
      "cellspacing",
      "dir",
      "id",
      "itemprop",
      "name",
      "rel",
      "class", // required to convert html tables to tml tables
      "style",
      "tabindex",
      "target",
      "valign",
      "width",
    ];
    const tags = [
      "a\-img",
      "a\-lightbox",
      "body",
      "code",
      "col",
      "colgroup",
      "figure",
      "font",
      "footer",
      "header",
      "time",
      "section",
      "meta",
      "o:p",
      "o",
    ];

    _clearClipboardContent.attrsRegex = new RegExp('(' + attrs.join('|') + ')=(["\']).*?\\2', 'gis'),
    _clearClipboardContent.tagsRegex = new RegExp("</?("+tags.join("|")+").*?>", "gis");
    _clearClipboardContent.doubleBrRegex = new RegExp("<br */?>\s*<br */?>", "gis");
    _clearClipboardContent.finalBrRegex = new RegExp("<br */?>$", "i");
    _clearClipboardContent.preRegex = new RegExp("^ *<pre *>(.*)</pre> *$", "si");
    _clearClipboardContent.strongRegex = new RegExp("<strong .*?>(.*)</strong>", "si");
    _clearClipboardContent.xmlHeaderRegex = new RegExp("<!\\-\\-\\?xml.*?\\?\\-\\->", "i");
    _clearClipboardContent.commentsRegex = new RegExp("<!\\-\\-.*?\\-\\->", "gs");
    _clearClipboardContent.conditionalRegex = new RegExp("<!\\[if .*?\\]>|<!\\[endif\\]>", "gi");
    _clearClipboardContent.emptySpansRegex = new RegExp("<span [^>]*>(&nbsp;|\\s)*</span>", "gis");
  }

  _init();

  //console.log("before='"+text+"'");

  text = text
    .replace(_clearClipboardContent.doubleBrRegex, "") // remove double br
    .replace(_clearClipboardContent.attrsRegex, "") // remove unwanted attributes blocking html2tml translation
    .replace(_clearClipboardContent.tagsRegex, "") // remove unwanted tags
    .replace(_clearClipboardContent.preRegex, "$1") // clear pres at start and end
    .replace(_clearClipboardContent.strongRegex, "<b>$1</b>") // rewrite strong to b
    .replace(_clearClipboardContent.xmlHeaderRegex, "") // xml headers sometimes are part of a text/html blob
    .replace(_clearClipboardContent.emptySpansRegex, "") // remove bogus spans
    .replace(_clearClipboardContent.commentsRegex, "") // remove html comments
    .replace(_clearClipboardContent.conditionalRegex, "") // remove conditional html comments
    .replace(_clearClipboardContent.finalBrRegex, ""); // remove br at end of string

  //console.log("after ='"+text+"'");

  return text;
}

