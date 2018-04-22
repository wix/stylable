import { PartialProps, RuntimeStylesheet, StateMap, StylesheetLocals } from './types';

export function create(
    root: string,
    namespace: string,
    localMapping: { [key: string]: string },
    css: string | null,
    moduleId: string
): RuntimeStylesheet {

    if (css && typeof document !== 'undefined') {
        let style = null;
        style = document.querySelector('[data-module-id="' + moduleId + '"]') || document.createElement('style');
        style.setAttribute('data-module-id', moduleId);
        style.id = namespace;
        style.textContent = css;
        document.head.appendChild(style);
    }

    const lo_ns = namespace.toLowerCase();

    function cssStates(stateMapping?: StateMap | null) {
        return stateMapping ? Object.keys(stateMapping).reduce((states, key) => {
            const stateValue = stateMapping[key];

            if (stateValue === undefined || stateValue === null || stateValue === false) {
                return states;
            }

            states['data-' + lo_ns + '-' + key.toLowerCase()] = stateValue;

            return states;
        }, {} as StateMap) : {};
    }

    function get(localName: string) {
        return (locals as { [key: string]: string })[localName];
    }

    function mapClasses(classNameString: string): string {
        return classNameString.split(/\s+/g).map(className => get(className) || className).join(' ');
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

    function stylable_runtime_stylesheet(className: string, states?: StateMap | null, props?: PartialProps) {

        className = className ? mapClasses(className) : '';

        const base: PartialProps = cssStates(states);

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

        if (className) {
            base.className = className;
        }

        return base;
    }

    Object.setPrototypeOf(apply, locals);

    return apply as RuntimeStylesheet;
}
