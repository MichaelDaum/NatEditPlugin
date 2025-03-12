"use strict";

(function($) {

  var utils =  {};

  utils.getAttrs = function getAttrs(text) {
    var attrs = {},
        parts = text.split(/\s+/),
        len = parts.length,
        i, tmp,
        attachUrlPath  = 
          foswiki.getPreference("PUBURLPATH") +
          "/" + foswiki.getPreference("WEB") +
          "/" + foswiki.getPreference("TOPIC"),
        attachUrl  = 
          foswiki.getPreference("PUBURL") +
          "/" + foswiki.getPreference("WEB") +
          "/" + foswiki.getPreference("TOPIC");

    for (i = 0; i < len; i++) {
      tmp = parts[i].split("=");
      if (tmp.length == 2) {
        attrs[tmp[0]] = tmp[1].slice(1,-1);
      }
    }

    $.each(attrs, function(key, val) {
      attrs[key] = val
        .replace("%ATTACHURL%", attachUrl)
        .replace("%ATTACHURLPATH%", attachUrlPath)
        .replace("%PUBURL%", foswiki.getPreference("PUBURL"))
        .replace("%PUBURLPATH%", foswiki.getPreference("PUBURLPATH"));
    });

    //console.log("attrs=",attrs);

    return attrs;
  };

  window.utils = utils;

})(jQuery);
