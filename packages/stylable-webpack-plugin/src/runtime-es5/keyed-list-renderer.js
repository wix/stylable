"use strict";

function keyedListRenderer(nodeRenderer) {
  var first = void 0;

  var nodes = {};

  var setNode = function setNode(style, node) {
    return nodes[nodeRenderer.renderKey(style)] = node;
  };

  var renderNode = function renderNode(dataItem) {
    var key = nodeRenderer.renderKey(dataItem);
    var node = nodes[key];
    return node ? nodeRenderer.update(dataItem, node) : setNode(dataItem, nodeRenderer.create(dataItem, key));
  };

  var render = function render(container) {
    var data = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];

    var node = void 0;
    if (data.length) {
      var next = first;
      for (var i = 0; i < data.length; i++) {
        node = renderNode(data[i]);
        if (node !== next) {
          container.insertBefore(node, next);
        } else {
          next = node.nextElementSibling;
        }
      }
      first = nodes[nodeRenderer.renderKey(data[0])];

      while (node.nextElementSibling) {
        if (nodeRenderer.hasKey(node.nextElementSibling)) {
          container.removeChild(node.nextElementSibling);
        } else {
          break;
        }
      }
    } else {
      while (first) {
        var _next = first.nextElementSibling;
        container.removeChild(first);
        first = _next && nodeRenderer.hasKey(_next) ? _next : undefined;
      }
    }
  };

  return { render: render, nodes: nodes };
}

module.exports.keyedListRenderer = keyedListRenderer;