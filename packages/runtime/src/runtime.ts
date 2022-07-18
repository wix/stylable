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

export function injectCSS(id: string, css: string, depth: number, runtimeId: string): void {
    if (typeof document === 'undefined') {
        return;
    }
    var d = document;
    var head = d.head;
    var style = d.createElement('style');
    style.setAttribute('st_id', id);
    style.setAttribute('st_depth', depth as unknown as string);
    style.setAttribute('st_runtime', runtimeId);
    style.textContent = css;
    var loadedStyleElements = head.querySelectorAll<HTMLStyleElement>(
        'style[st_runtime="' + runtimeId + '"]'
    );
    var inserted = false;
    var insertAfter: HTMLElement | undefined;
    for (var i = 0; i < loadedStyleElements.length; i++) {
        var styleElement = loadedStyleElements[i];
        var existingStId = styleElement.getAttribute('st_id');
        var existingStDepth = Number(styleElement.getAttribute('st_depth'));
        if (existingStId === id) {
            if (existingStDepth === depth) {
                head.replaceChild(style, styleElement);
                return;
            } else {
                styleElement.parentElement!.removeChild(styleElement);
                continue;
            }
        }
        if (!inserted && depth < existingStDepth) {
            head.insertBefore(style, styleElement);
            inserted = true;
        }
        insertAfter = styleElement;
    }
    if (!inserted) {
        insertAfter
            ? head.insertBefore(style, insertAfter.nextElementSibling)
            : head.appendChild(style);
    }
}
