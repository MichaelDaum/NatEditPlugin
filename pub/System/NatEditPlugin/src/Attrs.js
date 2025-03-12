/*
 * Attrs 
 *
 * Copyright (c) 2024-2025 Michael Daum http://michaeldaumconsulting.com
 *
 * Licensed under the GPL license http://www.gnu.org/licenses/gpl.html
 *
 */

"use strict";
(function(module, $) {

  const debug = false,
    stringRe = /^\s*\"(.*?)\"\s*(.*?)$/,
    keyValueRe = /^\s*([#a-z0-9_]+)\s*=\s*\"(.*?)\"\s*(.*?)$/;

  /* utils **************************************************************/
  function log() {
    var args;

    if (console && debug) {
      args = $.makeArray(arguments);
      args.unshift("ATTRS: ");
      console && console.log.apply(console, args); // eslint-disable-line no-console
    }
  };

  /* class **************************************************************/
  function Attrs(string) {

    log("called new from",string);

    this.parse(string);
  }

  /* parse a string and assign values ***********************************/
  Attrs.prototype.parse = function(string) {
    var first = true,
      match, i = 0;

    log("called parse() for ",string);

    this.values = {};

    this.values._raw = string || "";
    this.values._default = "";

    while (string !== "") {
      log("...string='"+string+"'");

      i++;
      if (i > 100000) {
        break;
      }

      if (first && (match = string.match(stringRe))) {
        this.values._default = match[1];
        log("... adding _default=",match[1]);
        string = match[2];
        first = false;
        continue;
      } 

      if (match = string.match(keyValueRe)) {
        log("... adding "+match[1]+"="+match[2]);
        this.values[match[1]] = match[2];
        string = match[3];
        continue;
      } 

      if (/\S/.test(string)) {
        log("...breaking at string",string);
        break;
      }

    }

    log("... done");
  };

  /* returns true if no values have been found **************************/
  Attrs.prototype.isEmpty = function() {
    return $.isEmptyObject(this.values);
  };

  /* set a parameter ****************************************************/
  Attrs.prototype.set = function(key, val) {
    this.values[key] = val;
  };

  /* get a parameter ****************************************************/
  Attrs.prototype.get = function(key) {
    key = key || "_default";
    return this.values[key];
  };

  /* get all known keys *************************************************/
  Attrs.prototype.keys = function() {
    return Object.keys(this.values).filter(key => key !== "_raw");
  };

  /* remove a parameter *************************************************/
  Attrs.prototype.remove = function(key) {
    var val = this.values[key];
    delete this.values[key];
    return val;
  };

  /* stringify attr object again ****************************************/
  Attrs.prototype.toString = function() {
    var parts = [], self = this;

    Object.keys(self.values).sort().forEach(function(key) {
      if (key === "_default") {
        parts.push(`"${self.values[key]}"`);
      } else if (key !== "_raw") {
        parts.push(`${key}="${self.values[key]}"`);
      }
    });

    return parts.join(" ");
  };

  module.Attrs = Attrs;

})(foswiki, jQuery);
