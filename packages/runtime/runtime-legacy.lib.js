/* runtime version: 2.0.6 */
function StylableRuntime(exports){
exports = exports || {};
function require(){return exports;};

(function(){/* source: cached-node-renderer.ts */
var CacheStyleNodeRenderer = /** @class */ (function () {
    function CacheStyleNodeRenderer(options) {
        var _this = this;
        this.options = options;
        this.create = function (stylesheet, key) {
            var node = _this.options.createElement('style');
            node.textContent = stylesheet.$css || '';
            node.setAttribute(_this.options.attrKey, key);
            node.setAttribute('st-depth', stylesheet.$depth + '');
            return node;
        };
        this.hasKey = function (node) { return node.hasAttribute(_this.options.attrKey); };
        this.update = function (stylesheet, node) {
            if (node.textContent !== stylesheet.$css) {
                node.textContent = stylesheet.$css || '';
            }
            return node;
        };
        this.renderKey = function (stylesheet) { return stylesheet.$id; };
    }
    return CacheStyleNodeRenderer;
}());
exports.CacheStyleNodeRenderer = CacheStyleNodeRenderer;
}());
(function(){/* source: keyed-list-renderer.ts */
function createDOMListRenderer(nodeRenderer) {
    var first;
    var nodes = {};
    var setNode = function (dataItem, node) {
        return (nodes[nodeRenderer.renderKey(dataItem)] = node);
    };
    var renderNode = function (dataItem) {
        var key = nodeRenderer.renderKey(dataItem);
        var node = nodes[key];
        return node
            ? nodeRenderer.update(dataItem, node)
            : setNode(dataItem, nodeRenderer.create(dataItem, key));
    };
    var render = function (container, data) {
        if (data === void 0) { data = []; }
        var node;
        if (data.length) {
            var next = first;
            // tslint:disable-next-line:prefer-for-of
            for (var i = 0; i < data.length; i++) {
                node = renderNode(data[i]);
                if (node !== next) {
                    container.insertBefore(node, next || null);
                }
                else {
                    next = node.nextElementSibling;
                }
            }
            first = nodes[nodeRenderer.renderKey(data[0])];
            while (node.nextElementSibling) {
                if (nodeRenderer.hasKey(node.nextElementSibling)) {
                    container.removeChild(node.nextElementSibling);
                }
                else {
                    break;
                }
            }
        }
        else {
            while (first) {
                var next = first.nextElementSibling;
                container.removeChild(first);
                first = next && nodeRenderer.hasKey(next) ? next : undefined;
            }
        }
    };
    return { render: render, nodes: nodes };
}
exports.createDOMListRenderer = createDOMListRenderer;
}());
(function(){/* source: css-runtime-renderer.ts */
var cached_node_renderer_1 = require("./cached-node-renderer");
var keyed_list_renderer_1 = require("./keyed-list-renderer");
var RuntimeRenderer = /** @class */ (function () {
    function RuntimeRenderer() {
        var _this = this;
        this.styles = [];
        this.stylesMap = {};
        this.renderer = null;
        this.window = null;
        this.id = null;
        this.update = function () {
            if (_this.renderer) {
                _this.renderer.render(_this.window.document.head, _this.styles);
            }
        };
    }
    RuntimeRenderer.prototype.init = function (_window) {
        if (this.window || !_window) {
            return;
        }
        _window.__stylable_renderer_global_counter =
            _window.__stylable_renderer_global_counter || 0;
        this.id = _window.__stylable_renderer_global_counter++;
        this.window = _window;
        this.renderer = keyed_list_renderer_1.createDOMListRenderer(new cached_node_renderer_1.CacheStyleNodeRenderer({
            attrKey: 'st-id' + (this.id ? '-' + this.id : ''),
            createElement: _window.document.createElement.bind(_window.document)
        }));
        this.update();
    };
    RuntimeRenderer.prototype.onRegister = function () {
        if (this.window) {
            this.window.requestAnimationFrame(this.update);
        }
    };
    RuntimeRenderer.prototype.register = function (stylesheet) {
        var registered = this.stylesMap[stylesheet.$id];
        if (registered) {
            this.removeStyle(registered);
        }
        var i = this.findDepthIndex(stylesheet.$depth);
        this.styles.splice(i + 1, 0, stylesheet);
        this.stylesMap[stylesheet.$id] = stylesheet;
        this.onRegister();
    };
    RuntimeRenderer.prototype.removeStyle = function (stylesheet) {
        var i = this.styles.indexOf(stylesheet);
        if (~i) {
            this.styles.splice(i, 1);
        }
        delete this.stylesMap[stylesheet.$id];
    };
    RuntimeRenderer.prototype.findDepthIndex = function (depth) {
        var index = this.styles.length;
        while (index--) {
            var stylesheet = this.styles[index];
            if (stylesheet.$depth <= depth) {
                return index;
            }
        }
        return index;
    };
    RuntimeRenderer.prototype.getStyles = function (ids, sortIndexes) {
        var _this = this;
        return this.sortStyles(ids.map(function (id) { return _this.stylesMap[id]; }), sortIndexes);
    };
    RuntimeRenderer.prototype.sortStyles = function (styles, sortIndexes) {
        var _this = this;
        if (sortIndexes === void 0) { sortIndexes = false; }
        var s = styles.slice();
        if (sortIndexes) {
            s.sort(function (a, b) {
                return _this.styles.indexOf(a) - _this.styles.indexOf(b);
            });
        }
        s.sort(function (a, b) {
            return a.$depth - b.$depth;
        });
        return s;
    };
    return RuntimeRenderer;
}());
exports.RuntimeRenderer = RuntimeRenderer;
// The $ export is a convention with the webpack plugin if changed both needs a change
exports.$ = new RuntimeRenderer();
}());
(function(){/* source: css-runtime-stylesheet.ts */
var stateMiddleDelimiter = '-';
var booleanStateDelimiter = '--';
var stateWithParamDelimiter = '---';
function create(namespace, exports, css, depth, id, renderer) {
    var stylesheet = {
        namespace: namespace,
        classes: exports.classes,
        keyframes: exports.keyframes,
        vars: exports.vars,
        stVars: exports.stVars,
        cssStates: cssStates,
        style: style,
        st: style,
        $id: id,
        $depth: depth,
        $css: css
    };
    if (renderer) {
        renderer.register(stylesheet);
    }
    function cssStates(stateMapping) {
        var classNames = [];
        for (var stateName in stateMapping) {
            var stateValue = stateMapping[stateName];
            var stateClass = createStateClass(stateName, stateValue);
            if (stateClass) {
                classNames.push(stateClass);
            }
        }
        return classNames.join(' ');
    }
    function createBooleanStateClassName(stateName) {
        return "" + namespace + booleanStateDelimiter + stateName;
    }
    function createStateWithParamClassName(stateName, param) {
        // tslint:disable-next-line: max-line-length
        return "" + namespace + stateWithParamDelimiter + stateName + stateMiddleDelimiter + param.length + stateMiddleDelimiter + param.replace(/\s/gm, '_');
    }
    function createStateClass(stateName, stateValue) {
        if (stateValue === false ||
            stateValue === undefined ||
            stateValue === null ||
            stateValue !== stateValue // check NaN
        ) {
            return '';
        }
        if (stateValue === true) { // boolean state
            return createBooleanStateClassName(stateName);
        }
        var valueAsString = stateValue.toString();
        return createStateWithParamClassName(stateName, valueAsString);
    }
    function style() {
        var classNames = [];
        // tslint:disable-next-line:prefer-for-of
        for (var i = 0; i < arguments.length; i++) {
            var item = arguments[i];
            if (item) {
                if (typeof item === 'string') {
                    classNames[classNames.length] = item;
                }
                else if (i === 1) {
                    for (var stateName in item) {
                        var stateValue = item[stateName];
                        var stateClass = createStateClass(stateName, stateValue);
                        if (stateClass) {
                            classNames[classNames.length] = stateClass;
                        }
                    }
                }
            }
        }
        return classNames.join(' ');
    }
    return stylesheet;
}
exports.create = create;
function createRenderable(css, depth, id) {
    return { $css: css, $depth: depth, $id: id, $theme: true };
}
exports.createRenderable = createRenderable;
}());
(function(){/* source: css-runtime-stylesheet-legacy.ts */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var css_runtime_stylesheet_1 = require("./css-runtime-stylesheet");
// If you see this code and don't know anything about it don't change it.
// Because Barak made a custom bundler we can only support one api export name.
// In order to create legacy api support we allow duplicate export that we know we can override in the bundle.
var newCreate = css_runtime_stylesheet_1.create;
function create(namespace, exports, css, depth, id, renderer) {
    var stylesheet = newCreate(namespace, exports, css, depth, id, renderer);
    var dataNamespace = 'data-' + namespace.toLowerCase() + '-';
    function $cssStates(stateMapping) {
        // TODO: legacy states does not compatible with class based states
        return stateMapping
            ? Object.keys(stateMapping).reduce(function (states, key) {
                var stateValue = stateMapping[key];
                if (stateValue === undefined || stateValue === null || stateValue === false) {
                    return states;
                }
                states[dataNamespace + key.toLowerCase()] = stateValue;
                return states;
            }, {})
            : {};
    }
    function $get(localName) {
        return stylesheet.classes[localName];
    }
    function $mapClasses(className) {
        return className
            .split(/\s+/g)
            .map(function (className) { return stylesheet.classes[className] || className; })
            .join(' ');
    }
    function stylable_runtime_stylesheet(className, states, inheritedAttributes) {
        className = className ? $mapClasses(className) : '';
        if (states) {
            var stateClasses = stylesheet.cssStates(states);
            if (stateClasses) {
                className += className ? ' ' + stateClasses : stateClasses;
            }
        }
        var base = {};
        if (inheritedAttributes) {
            for (var k in inheritedAttributes) {
                if (k.match(/^data-/)) {
                    base[k] = inheritedAttributes[k];
                }
            }
            if (inheritedAttributes.className) {
                className += className
                    ? ' ' + inheritedAttributes.className
                    : inheritedAttributes.className;
            }
        }
        if (className) {
            base.className = className;
        }
        return base;
    }
    Object.setPrototypeOf(stylable_runtime_stylesheet, __assign({ $root: 'root' }, stylesheet.stVars, stylesheet.classes, { $namespace: stylesheet.namespace, $depth: stylesheet.$depth, $id: stylesheet.$id, $css: stylesheet.$css, $get: $get,
        $cssStates: $cssStates }));
    // EDGE CACHE BUG FIX
    stylable_runtime_stylesheet.root = stylesheet.classes.root;
    return stylable_runtime_stylesheet;
}
exports.create = create;
}());;
return exports;
}