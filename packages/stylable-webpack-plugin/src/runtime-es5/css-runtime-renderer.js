"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _require = require("./keyed-list-renderer"),
    keyedListRenderer = _require.keyedListRenderer;

var RuntimeRenderer = function () {
  function RuntimeRenderer() {
    _classCallCheck(this, RuntimeRenderer);

    this.listeners = [];
    this.styles = [];
    this.stylesMap = {};
    this.renderer = null;
    this.window = null;
    this.id = null;
    this.update = this.update.bind(this);
  }

  _createClass(RuntimeRenderer, [{
    key: "init",
    value: function init(_window) {
      if (this.window || !_window) {
        return;
      }

      _window.__stylable_renderer_global_counter = _window.__stylable_renderer_global_counter || 0;
      this.id = _window.__stylable_renderer_global_counter++;

      this.window = _window;
      this.renderer = keyedListRenderer(createCacheStyleNodeRenderer({
        attrKey: "st-id" + (this.id ? "-" + this.id : ""),
        createElement: _window.document.createElement.bind(_window.document)
      }));
      this.update();
    }
  }, {
    key: "update",
    value: function update() {
      if (this.renderer) {
        this.renderer.render(this.window.document.head, this.styles);
      }
    }
  }, {
    key: "onRegister",
    value: function onRegister() {
      if (this.window) {
        this.window.requestAnimationFrame(this.update);
      }
    }
  }, {
    key: "register",
    value: function register(stylesheet) {
      var registered = this.stylesMap[stylesheet.$id];

      if (registered) {
        this.removeStyle(registered);
      }

      var i = this.findDepthIndex(stylesheet.$depth);
      this.styles.splice(i + 1, 0, stylesheet);
      this.stylesMap[stylesheet.$id] = stylesheet;
      this.onRegister();
    }
  }, {
    key: "removeStyle",
    value: function removeStyle(stylesheet) {
      var i = this.styles.indexOf(stylesheet);
      if (~i) {
        this.styles.splice(i, 1);
      }
      delete this.stylesMap[stylesheet.$id];
    }
  }, {
    key: "findDepthIndex",
    value: function findDepthIndex(depth) {
      var index = this.styles.length;
      while (index--) {
        var stylesheet = this.styles[index];
        if (stylesheet.$depth <= depth) {
          return index;
        }
      }
      return index;
    }
  }, {
    key: "getStyles",
    value: function getStyles(ids, sortIndexes) {
      var _this = this;

      return this.sortStyles(ids.map(function (id) {
        return _this.stylesMap[id];
      }), sortIndexes);
    }
  }, {
    key: "sortStyles",
    value: function sortStyles(styles) {
      var _this2 = this;

      var sortIndexes = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

      var s = styles.slice();

      sortIndexes && s.sort(function (a, b) {
        return _this2.styles.indexOf(a) - _this2.styles.indexOf(b);
      });
      s.sort(function (a, b) {
        return a.$depth - b.$depth;
      });
      return s;
    }
  }]);

  return RuntimeRenderer;
}();

function createCacheStyleNodeRenderer(options) {
  var createElement = options.createElement,
      _options$attrKey = options.attrKey,
      attrKey = _options$attrKey === undefined ? "stylable-key" : _options$attrKey;


  var create = function create(stylesheet, key) {
    var node = createElement("style");
    node.textContent = stylesheet.$css;
    stylesheet.$theme && node.setAttribute('st-theme', true);
    node.setAttribute(attrKey, key);
    node.setAttribute("st-depth", stylesheet.$depth);
    return node;
  };

  var update = function update(stylesheet, node) {
    if (node.textContent !== stylesheet.$css) {
      node.textContent = stylesheet.$css;
    }
    return node;
  };

  var renderKey = function renderKey(stylesheet) {
    return stylesheet.$id;
  };

  var hasKey = function hasKey(node) {
    return node.hasAttribute(attrKey);
  };

  return {
    update: update,
    create: create,
    renderKey: renderKey,
    hasKey: hasKey
  };
}

module.exports = new RuntimeRenderer();
module.exports.RuntimeRenderer = RuntimeRenderer;