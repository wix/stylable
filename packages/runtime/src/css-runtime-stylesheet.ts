import {
    CSSVarMap,
    CSSVarMappingRuntimeType,
    RuntimeStylesheet,
    StateMap,
    StateValue
} from './types';

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

    function declarationToString(this: CSSVarMappingRuntimeType): string {
        return Object.keys(this).reduce((res: string, prop: string) => {
            const value = this[prop];
            if (typeof value === 'string') {
                res += `${prop}: ${value}; `;
            }

            return res;
        }, '');
    }

    function cssVars(cssVarsMapping: CSSVarMap) {
        const res: CSSVarMappingRuntimeType = {
            toString: declarationToString
        };

        return Object.keys(cssVarsMapping).reduce(
            (res: CSSVarMap, propName: string) => {
                if (propName.startsWith('--') && stylesheet[propName]) {
                    res[stylesheet[propName] as string] = cssVarsMapping[propName];
                } else {
                    res[propName] = cssVarsMapping[propName];
                }

                return res;
            },
            res as CSSVarMap
        );
    }

    function get(localName: string) {
        return stylesheet[localName];
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

        const baseState = createBaseState(stateName, namespace, stateValue === true ? false : true);
        if (stateValue === true) { // boolean state
            return baseState;
        }

        const valueAsString = stateValue.toString();

        return createStateWithParam(baseState, valueAsString);
    }

    stylesheet.$root = root;
    stylesheet.$namespace = namespace;
    stylesheet.$depth = depth;
    stylesheet.$id = id;
    stylesheet.$css = css;

    stylesheet.$get = get;
    stylesheet.$cssStates = cssStates;
    stylesheet.$cssVars = cssVars;

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

function createBaseState(stateName: string, namespace: string, withParam: boolean) {
    return `${namespace.toLowerCase()}_${withParam ? '_' : ''}_${stateName}`;
}

function createStateWithParam(baseState: string, param: string) {
    return `${baseState}${param.length}_${param.replace(/\s/gm, '_')}`;
}
