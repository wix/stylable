import {
    RuntimeStylesheet,
    StateMap,
    StateValue
} from './types';

const stateMiddleDelimiter = '_';
const booleanStateDelimiter = '__';
const stateWithParamDelimiter = '___';

export function create(
    root: string,
    namespace: string,
    locals: Record<string, string>,
    css: string,
    depth: number,
    id: string | number
): RuntimeStylesheet {
    const stylesheet: Partial<RuntimeStylesheet> = locals;

    function cssStates(stateMapping?: StateMap | null): string {
        const classNames = [];
        for (const stateName in stateMapping) {
            const stateValue = stateMapping[stateName];
            const stateClass = createStateClass(stateName, stateValue);
            if (stateClass) {
                classNames.push(stateClass);
            }
        }

        return classNames.join(' ');
    }

    function get(localName: string) {
        return stylesheet[localName];
    }

    function createBooleanStateClassName(stateName: string) {
        return `${namespace}${booleanStateDelimiter}${stateName}`;
    }

    function createStateWithParamClassName(stateName: string, param: string) {
        // tslint:disable-next-line: max-line-length
        return `${namespace}${stateWithParamDelimiter}${stateName}${param.length}${stateMiddleDelimiter}${param.replace(/\s/gm, '_')}`;
    }

    function createStateClass(stateName: string, stateValue: StateValue): string {
        if (
            stateValue === false ||
            stateValue === undefined ||
            stateValue === null ||
            stateValue !== stateValue // check NaN
        ) {
            return '';
        }

        if (stateValue === true) { // boolean state
            return createBooleanStateClassName(stateName);
        }

        const valueAsString = stateValue.toString();

        return createStateWithParamClassName(stateName, valueAsString);
    }

    stylesheet.$root = root;
    stylesheet.$namespace = namespace;
    stylesheet.$depth = depth;
    stylesheet.$id = id;
    stylesheet.$css = css;

    stylesheet.$get = get;
    stylesheet.$cssStates = cssStates;

    function stylable_runtime_stylesheet(): string {
        const classNames = [];

        // tslint:disable-next-line:prefer-for-of
        for (let i = 0; i < arguments.length; i++) {
            const item = arguments[i];

            if (typeof item === 'string') {
                classNames.push(item);
            } else if (i >= 1) {
                for (const stateName in item) {
                    const stateValue = item[stateName];
                    const stateClass = createStateClass(stateName, stateValue);
                    if (stateClass) {
                        classNames.push(stateClass);
                    }
                }
            }
        }
        return classNames.join(' ');
    }

    Object.setPrototypeOf(stylable_runtime_stylesheet, stylesheet);

    return stylable_runtime_stylesheet as any;
}

export function createTheme(css: string, depth: number | string, id: number | string) {
    return { $css: css, $depth: depth, $id: id, $theme: true };
}
