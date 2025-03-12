"use strict";
function GraphWidget(cm) {
  var self = this

  this.node = $(".widget-templates .graphwidget").clone();
  this.domNode = this.node[0];
  this.graph = new GraphEditor(this.domNode, {
    width: 200,
    height: 200
  })
  Widget.apply(this, arguments);

  this.graph.changed = function() {
    var u, v, i;
    var graph = {
      'widget': 'graph'
    };
    graph.vertices = self.graph.nodes.length;
    graph.edges = [];
    for (i = 0; i < self.graph.links.length; i++) {
      u = self.graph.nodes.indexOf(self.graph.links[i].source);
      v = self.graph.nodes.indexOf(self.graph.links[i].target);
      graph.edges.push([u, v]);
    }
    self.setText(JSON.stringify(graph));
    console.log(graph);

  }
  this.graph.changed();
}
GraphWidget.prototype = Object.create(Widget.prototype)
