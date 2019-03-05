import { RuntimeRenderer } from './css-runtime-renderer';
import {
    RuntimeStylesheet,
    StateMap,
    StateValue,
    StylableExports
} from './types';

const stateMiddleDelimiter = '_';
const booleanStateDelimiter = '__';
const stateWithParamDelimiter = '___';

export function create(
    namespace: string,
    exports: StylableExports,
    css: string,
    depth: number,
    id: string | number,
    renderer: RuntimeRenderer | null
): RuntimeStylesheet {

    const stylesheet: RuntimeStylesheet = {
        namespace,
        classes: exports.classes,
        keyframes: exports.keyframes,
        vars: exports.vars,
        stVars: exports.stVars,
        cssStates,
        style,
        $id: id,
        $depth: depth,
        $css: css
    };

    if (renderer) {
        renderer.register(stylesheet);
    }

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

    function style() {
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

    return stylesheet;
}

export function createRenderable(css: string, depth: number | string, id: number | string) {
    return { $css: css, $depth: depth, $id: id, $theme: true };
}
