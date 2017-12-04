"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function create(root, namespace, localMapping, css, moduleId) {
    if (css && typeof document !== 'undefined') {
        var style = null;
        style = document.querySelector('[data-module-id="' + moduleId + '"]') || document.createElement('style');
        style.setAttribute('data-module-id', moduleId);
        style.id = namespace;
        style.textContent = css;
        document.head.appendChild(style);
    }
    var lo_ns = namespace.toLowerCase();
    function cssStates(stateMapping) {
        return stateMapping ? Object.keys(stateMapping).reduce(function (states, key) {
            if (stateMapping[key]) {
                states['data-' + lo_ns + '-' + key.toLowerCase()] = true;
            }
            return states;
        }, {}) : {};
    }
    function get(localName) {
        return locals[localName];
    }
    function mapClasses(classNameString) {
        return classNameString.split(/\s+/g).map(function (className) { return get(className) || className; }).join(' ');
    }
    var locals = localMapping;
    locals.$stylesheet = {
        namespace: namespace,
        root: root,
        get: get,
        cssStates: cssStates
    };
    locals.$get = get;
    locals.$cssStates = cssStates;
    function apply(className, states, props) {
        className = className ? mapClasses(className) : '';
        var base = cssStates(states);
        if (props) {
            for (var k in props) {
                if (k.match(/^data-/)) {
                    base[k] = props[k];
                }
            }
            if (props.className) {
                className += ' ' + props.className;
            }
        }
        if (className) {
            base.className = className;
        }
        return base;
    }
    Object.setPrototypeOf(apply, locals);
    return apply;
}
exports.create = create;
//# sourceMappingURL=runtime.js.map