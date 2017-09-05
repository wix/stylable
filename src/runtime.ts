
export interface StateMap { [key: string]: boolean }

export interface Stylesheet {
    namespace: string;
    root: string;
    get: (localName: string) => string;
    cssStates: (stateMapping: StateMap) => StateMap;
}

export type RuntimeStylesheet = { [key: string]: string } & { $stylesheet: Stylesheet }

export function create(root: string, namespace: string, locals: { [key: string]: string } & { $stylesheet?: Stylesheet }, css: string, moduleId: string): RuntimeStylesheet {
    var style = null;

    if (css && typeof document !== 'undefined') {
        style = document.querySelector('[data-module-id="'+ moduleId +'"]') || document.createElement('style');
        style.setAttribute('data-module-id', moduleId);
        style.id = namespace;
        style.textContent = css;
        document.head.appendChild(style);
    }

    locals.$stylesheet = {
        namespace: namespace,
        root: root,
        get(localName: string) {
            return (locals as { [key: string]: string })[localName];
        },
        cssStates(stateMapping: StateMap) {
            return stateMapping ? Object.keys(stateMapping).reduce(function (states, key) {
                if (stateMapping[key]) { states["data-" + namespace.toLowerCase() + "-" + key.toLowerCase()] = true; }
                return states;
            }, {} as StateMap) : {};
        }
    };

    return <RuntimeStylesheet>locals;
}
