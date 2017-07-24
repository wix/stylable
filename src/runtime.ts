export interface SmallSheet { }
export interface StateMap { [key: string]: boolean }

export function create(root: string, namespace: string, classes: { $stylesheet?: SmallSheet }, css: string, moduleId: string) {
    var style = null;

    if (css && typeof document !== 'undefined') {
        style = document.getElementById(moduleId) || document.createElement('style');
        style.setAttribute('data-module-id', moduleId);
        style.id = namespace;
        style.textContent = css;
        document.head.appendChild(style);
    }

    classes.$stylesheet = {
        namespace: namespace,
        root: root,
        get(localName: string) {
            return (classes as { [key: string]: string })[localName];
        },
        cssStates(stateMapping: StateMap) {
            return stateMapping ? Object.keys(stateMapping).reduce(function (states, key) {
                if (stateMapping[key]) { states["data-" + namespace.toLowerCase() + "-" + key.toLowerCase()] = true; }
                return states;
            }, {} as StateMap) : {};
        }
    };

    return classes;
}
