/* eslint-disable no-var */
import type { Host, StateMap, StateValue } from './types';
export { injectCSS, statesRuntime, classesRuntime } from './pure';

export function stylesheet(host?: Host) {
    host = host || {};
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
    return host as Required<Pick<Host, 'stc' | 'sts'>>;
}
