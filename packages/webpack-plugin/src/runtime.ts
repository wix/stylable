/* eslint-disable no-var */
type StateValue = boolean | number | string;

interface StateMap {
    [stateName: string]: StateValue;
}

interface Host {
    sts: any;
    stc: any;
    sti: any;
}

export function stylesheet(host: Host) {
    var stateMiddleDelimiter = '-';
    var booleanStateDelimiter = '--';
    var stateWithParamDelimiter = '---';

    function createBooleanStateClassName(namespace: string, stateName: string) {
        return namespace + booleanStateDelimiter + stateName;
    }

    function createStateWithParamClassName(namespace: string, stateName: string, param: string) {
        return (
            namespace +
            stateWithParamDelimiter +
            stateName +
            stateMiddleDelimiter +
            param.length +
            stateMiddleDelimiter +
            param.replace(/\s/gm, '_')
        );
    }

    function createStateClass(
        namespace: string,
        stateName: string,
        stateValue: StateValue
    ): string {
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
            return createBooleanStateClassName(namespace, stateName);
        }

        var valueAsString = stateValue.toString();

        return createStateWithParamClassName(namespace, stateName, valueAsString);
    }

    function style(namespace: string) {
        const classNames = [];

        for (let i = 1; i < arguments.length; i++) {
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

    function cssStates(namespace: string, stateMapping?: StateMap | null): string {
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

    host.sts = style;
    host.stc = cssStates;
}

export function injectStyles(host: Host) {
    function stylableRuntime(
        namespace: string,
        css: string,
        depth: number,
        runtimeId: string
    ): void {
        if (typeof document === 'undefined') {
            return;
        }
        var d = document;
        var head = d.head;
        var style = d.createElement('style');
        style.setAttribute('st-depth', (depth as unknown) as string);
        style.setAttribute('st-id', namespace);
        style.setAttribute('st-runtime', runtimeId);
        style.textContent = css;
        var loadedStyleElements = head.querySelectorAll<HTMLStyleElement>(
            `style[st-runtime="${runtimeId}"]`
        );
        var inserted = false;
        for (var i = 0; i < loadedStyleElements.length; i++) {
            var styleElement = loadedStyleElements[i];
            var stId = styleElement.getAttribute('st-id');
            var stDepth = Number(styleElement.getAttribute('st-depth'));
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
    host.sti = stylableRuntime;
}
