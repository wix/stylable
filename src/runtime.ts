import { RuntimeStylesheet, StateMap, StylesheetLocals } from './types';

export function create(root: string, namespace: string, localMapping: { [key: string]: string }, css: string | null, moduleId: string): RuntimeStylesheet {

    if (css && typeof document !== 'undefined') {
        let style = null;
        style = document.querySelector('[data-module-id="' + moduleId + '"]') || document.createElement('style');
        style.setAttribute('data-module-id', moduleId);
        style.id = namespace;
        style.textContent = css;
        document.head.appendChild(style);
    }

    const lo_ns = namespace.toLowerCase();

    function cssStates(stateMapping?: StateMap) {
        return stateMapping ? Object.keys(stateMapping).reduce(function (states, key) {
            if (stateMapping[key]) { states["data-" + lo_ns + "-" + key.toLowerCase()] = true; }
            return states;
        }, {} as StateMap) : {};
    }

    function get(localName: string) {
        return (locals as { [key: string]: string })[localName];
    }

    const locals: StylesheetLocals = localMapping as any;

    locals.$stylesheet = {
        namespace,
        root,
        get,
        cssStates
    };

    locals.$get = get;
    locals.$cssStates = cssStates;


    const apply = function (className: string, states?: StateMap, props?: { className?: string, [key: string]: any }) {
        className = className ? locals.root + ' ' + className : locals.root;

        const base: any = cssStates(states);

        if (props) {
            for (const k in props) {
                if (k.match(/^data-/)) {
                    base[k] = props[k];
                }
            }

            if (props.className) {
                className += ' ' + props.className;
            }
        }

        if(className){
            base.className = className;
        }

        return base;

    }

    Object.setPrototypeOf(apply, locals);

    return <RuntimeStylesheet>apply;
}
