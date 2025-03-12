/*
 * ImagesWidget for CodeMirror
 *
 * Copyright (c) 2021-2025 Michael Daum http://michaeldaumconsulting.com
 *
 * Licensed under the GPL license http://www.gnu.org/licenses/gpl.html
 *
 */
"use strict";

(function($) {

var imageRegExp = /%IMAGE{(.*?)}%/;

function ImageWidget(editor, from, to) {
  var self = this;

  //console.log("creating an ImageWidget at from=",from,"to=",to);

  self.editor = editor;
  self.from = from;
  self.to = to;
  self.init();
};

ImageWidget.prototype.makeInteractive = function() {
  var self = this;

console.log("called makeInteractive");

  self.elem.resizable({
    aspectRatio: true,
    handles: "se",
    autoHide: true,
    stop: function(ev, ui) {
      self.attrs.remove("size");
      self.attrs.set("width",ui.size.width);
      self.attrs.set("height", ui.size.height);
      self.setText(self.toString());
      self.mark.changed();
    }
  });
};

ImageWidget.createWidgets = function(editor) {
  var search = editor.cm.getSearchCursor(imageRegExp, 0, 0),
      cursor = editor.cm.getCursor(),
      marks;

  while (search.findNext()) {
    if (!_posInsideRange(cursor, search.pos) && !_posEqual(cursor, search.pos.to)) {
      marks = editor.cm.findMarksAt(search.pos.from);
      if (!marks.find(function(mark) {
        return typeof(mark.widget) !== 'undefined';
      })) {
        new ImageWidget(editor, search.pos.from, search.pos.to);
      }
    }
  }
};

ImageWidget.prototype.init = function() {
  var self = this, 
      text;

console.log("called init");

  if (/%IMAGE{(.*?)}%$/.test(self.getText())) {
    text = RegExp.$1;
  }
console.log("text=",text);

  self.attrs = new foswiki.Attrs(text);

  let webTopic = foswiki.normalizeWebTopicName(self.attrs.get("web") || foswiki.getPreference("WEB"), self.attrs.get("topic") || foswiki.getPreference("TOPIC"));
  self.web = webTopic[0];
  self.topic = webTopic[1];

console.log("attrs="+self.attrs);

  if (typeof(self.elem) === 'undefined') {
    self.elem = $("<img>").appendTo("body");
    self.elem.attr("src", foswiki.getPubUrlPath(self.web, self.topic, self.attrs.get("_default")));
    self.elem.addClass("cm-natedit-image");
    self.elem.data("ImageWidget", self);
    self.elem.attr("align", self.attrs.get("align") || "none");
    self.elem.addClass = self.attrs.get("class") || "";
    let size = self.attrs.get("size");
    let width = self.attrs.get("width");
    let height = self.attrs.get("height");
    if (size) {
      if (/^(\d+)x(\d+)$/.test(size)) {
        width = RegExp.$1;
        height = RegExp.$2;
      } else {
        width = size;
        height = "auto";
      }
    } 
    self.elem.attr("width", width || "auto");
    self.elem.attr("height", height || "auto");
    self.elem.on("click", function(ev) {
      var opts = {
        web: self.web,
        topic: self.topic,
        classList: self.attrs.get("class"),
        align: self.attrs.get("align"),
        type: self.attrs.get("type"),
        width: self.attrs.get("width"),
        height: self.attrs.get("height"),
        file: self.attrs.get("_default"),
      };

console.log("opts=",opts);
      self.editor.shell.dialog({
        name: "insertimage",
        open: function(elem) {
          self.editor.shell.initImageDialog(elem);
        },
        data: opts,
        //event: ev
      }).done(function(elem) {
        var dialog = $(elem);

        self.attrs.set("web", dialog.find("[name=web]").val());
        self.attrs.set("topic", dialog.find("[name=topic]").val());
        self.attrs.set("caption", dialog.find("[name=caption]").val());
        self.attrs.set("classList", dialog.find("[name=classList]").val());
        self.attrs.set("_default", dialog.find("[name=file]").val());
        self.attrs.set("width", dialog.find("[name=width]").val());
        self.attrs.set("height", dialog.find("[name=height]").val());
        self.attrs.set("align", dialog.find("[name=align]:checked").val());
        self.attrs.set("type", dialog.find("[name=type]:checked").val());
console.log("attrs=",self.attrs.values);
      });
    });

  } else {
    //self.elem.resizable("destroy").removeClass("ui-resizable");
  }

console.log("elem=",self.elem[0]);
  self.mark = self.editor.cm.markText(self.from, self.to, {
    replacedWith: self.elem[0],
    clearOnEnter: true,
    clearWhenEmpty: true,
    handleMouseEvents: true,
    widget: self,
    selectLeft: true,
    selectRight: true
  });

  self.elem.parent().imagesLoaded().done(function() {
    self.makeInteractive();
  });

  self.mark.on("beforeCursorEnter", function() {
    console.log("beforeCursorEnter");
  });

  self.mark.on("clear", function() {
    console.log("clear");
  });

  self.mark.on("redraw", function() {
    console.log("redraw");
  });

  /*
  self.mark.on("hide", function() {
    var find = self.mark.find();
    console.log("hide, find=",find);
  });

  self.mark.on("unhide", function() {
    var find = self.mark.find();
    console.log("unhide, find=",find);
  });
  */
};

ImageWidget.prototype.toString = function() {
  var self = this,
    result = "%IMAGE{" + self.attrs + "}%";

console.log("result=",result);

  return result;
};

ImageWidget.prototype.getText = function() {
  var self = this;
  return self.editor.cm.getRange(self.from, self.to);
};

ImageWidget.prototype.setText = function(text) {
  var self = this,
      len = text.length;

  self.editor.cm.replaceRange(text, self.from, self.to);
  self.to.ch = self.from.ch + len;
  self.init();
};

/* export */
window.ImageWidget = ImageWidget;

})(jQuery);
