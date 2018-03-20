function keyedListRenderer(nodeRenderer) {
  let first;

  const nodes = {};

  const setNode = (style, node) =>
    (nodes[nodeRenderer.renderKey(style)] = node);

  const renderNode = dataItem => {
    const key = nodeRenderer.renderKey(dataItem);
    let node = nodes[key];
    return node
      ? nodeRenderer.update(dataItem, node)
      : setNode(dataItem, nodeRenderer.create(dataItem, key));
  };

  const render = (container, data = []) => {
    let node;
    if (data.length) {
      let next = first;
      for (let i = 0; i < data.length; i++) {
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
        const next = first.nextElementSibling;
        container.removeChild(first);
        first = next && nodeRenderer.hasKey(next) ? next : undefined;
      }
    }
  };

  return { render, nodes };
}

module.exports.keyedListRenderer = keyedListRenderer;
