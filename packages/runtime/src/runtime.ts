/* eslint-disable no-var */
import type { StateMap, StateValue } from './types';

export type {
    ClassesMap,
    RuntimeStylesheet,
    STFunction,
    StateMap,
    StateValue,
    StylableExports,
    RuntimeStVar,
} from './types';

function createStateClass(namespace: string, stateName: string, stateValue: StateValue): string {
    if (
        stateValue === false ||
        stateValue === undefined ||
        stateValue === null ||
        stateValue !== stateValue // check NaN
    ) {
        return '';
    }

    if (stateValue === true) {
        // boolean state
        return namespace + '--' + stateName;
    }

    var param = stateValue.toString();

    return namespace + '---' + stateName + '-' + param.length + '-' + param.replace(/\s/gm, '_');
}

export function classesRuntime(namespace: string): string {
    var classNames = [];

    for (var i = 1; i < arguments.length; i++) {
        // eslint-disable-next-line prefer-rest-params
        var item = arguments[i];

        if (item) {
            if (typeof item === 'string') {
                classNames[classNames.length] = item;
            } else if (i === 2) {
                for (var stateName in item) {
                    var stateValue = item[stateName];
                    var stateClass = createStateClass(namespace, stateName, stateValue);
                    if (stateClass) {
                        classNames[classNames.length] = stateClass;
                    }
                }
            }
        }
    }
    return classNames.join(' ');
}

export function statesRuntime(namespace: string, stateMapping?: StateMap | null): string {
    var classNames = [];
    for (var stateName in stateMapping) {
        var stateValue = stateMapping[stateName];
        var stateClass = createStateClass(namespace, stateName, stateValue);
        if (stateClass) {
            classNames.push(stateClass);
        }
    }
    return classNames.join(' ');
}

export function injectCSS(namespace: string, css: string, depth: number, runtimeId: string): void {
    if (typeof document === 'undefined') {
        return;
    }
    var d = document;
    var head = d.head;
    var style = d.createElement('style');
    style.setAttribute('st_id', namespace);
    style.setAttribute('st_depth', depth as unknown as string);
    style.setAttribute('st_runtime', runtimeId);
    style.textContent = css;
    var loadedStyleElements = head.querySelectorAll<HTMLStyleElement>(
        'style[st_runtime="' + runtimeId + '"]'
    );
    var inserted = false;
    for (var i = 0; i < loadedStyleElements.length; i++) {
        var styleElement = loadedStyleElements[i];
        var stId = styleElement.getAttribute('st_id');
        var stDepth = Number(styleElement.getAttribute('st_depth'));
        if (stId === namespace) {
            if (stDepth === depth) {
                head.replaceChild(style, styleElement);
                return;
            } else {
                styleElement.parentElement!.removeChild(styleElement);
            }
        }
        if (!inserted && depth < stDepth) {
            head.insertBefore(style, styleElement);
            inserted = true;
        }
    }
    if (!inserted) {
        head.append(style);
    }
}
