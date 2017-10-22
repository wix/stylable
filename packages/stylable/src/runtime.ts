export function create(root: string, namespace: string, locals: { [key: string]: string } & { $stylesheet?: Stylable.Stylesheet }, css: string, moduleId: string): Stylable.RuntimeStylesheet {
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
        cssStates(stateMapping: Stylable.StateMap) {
            return stateMapping ? Object.keys(stateMapping).reduce(function (states, key) {
                if (stateMapping[key]) { states["data-" + namespace.toLowerCase() + "-" + key.toLowerCase()] = true; }
                return states;
            }, {} as Stylable.StateMap) : {};
        }
    };

    return <Stylable.RuntimeStylesheet>locals;
}
