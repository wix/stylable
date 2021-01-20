/* eslint-disable no-var */

var stateMiddleDelimiter = '-';
var booleanStateDelimiter = '--';
var stateWithParamDelimiter = '---';

function createBooleanStateClassName(namespace, stateName) {
    return namespace + booleanStateDelimiter + stateName;
}

function createStateWithParamClassName(namespace, stateName, param) {
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

function createStateClass(namespace, stateName, stateValue) {
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

export function style(namespace) {
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

export function cssStates(namespace, stateMapping) {
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
