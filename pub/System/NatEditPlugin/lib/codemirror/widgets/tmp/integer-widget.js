"use strict;"

function IntegerWidget(cm) {
  var self = this
  this.value = 0;
  this.node = $(".widget-templates .integerwidget").clone();
  this.domNode = this.node[0];
  Widget.apply(this, arguments);

  this.node.find('.inc').click($.proxy(this, 'changeValue', 1))
  this.node.find('.dec').click($.proxy(this, 'changeValue', -1))
  this.node.find('.value').change(function(e) {
    self.setValue($(this).val())
  })

  this.node.keydown('left', function(event) {
    if ($(event.target).getCursorPosition() === 0) {
      self.exit('left');
    }
  });
  this.node.keydown('right', function(event) {
    var t = $(event.target);
    if (t.getCursorPosition() == t.val().length) {
      self.exit('right');
    }
  });

  var t = this.getText();
  if (t !== "") {
    this.value = parseInt(t);
  }
  // set text to the parsed or default value initially
  this.changeValue(0)
}
IntegerWidget.prototype = Object.create(Widget.prototype)
IntegerWidget.prototype.enter = function(direction) {
  var t = this.node.find('.value');
  t.focus();
  if (direction === 'left') {
    t.setCursorPosition(0);
  } else {
    t.setCursorPosition(t.val().length)
  }
}

IntegerWidget.prototype.exit = function(direction) {
  var range = this.mark.find();
  this.cm.focus();
  if (direction === 'left') {
    this.cm.setCursor(range.from)
  } else {
    this.cm.setCursor(range.to)
  }
}

IntegerWidget.prototype.changeValue = function(inc) {
  this.setValue(this.value + inc);
}
IntegerWidget.prototype.setValue = function(val) {
  this.value = parseInt(val);
  this.setText(this.value.toString());
  this.node.find('.value').val(this.value);
}
