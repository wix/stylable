import type { ClassSymbol, StylableMeta, StylableResults, StylableSymbol } from '@stylable/core';
import {
    MappedStates,
    StateParsedValue,
    namespace as scope,
} from '@stylable/core/dist/index-internal';

export const SPACING = ' '.repeat(4);
const asString = (v: string) => JSON.stringify(v);

function addStatesEntries(
    stateEntries: Map<string, MappedStates[string]>,
    stStates: MappedStates | undefined
) {
    if (stStates) {
        for (const [stateName, stateDef] of Object.entries(stStates)) {
            if (!stateEntries.has(stateName)) {
                stateEntries.set(stateName, stateDef);
            }
        }
    }
}

function collectLocalStates(cls: ClassSymbol) {
    const stateEntries = new Map<string, StateParsedValue | null>();
    let currentClass: ClassSymbol | undefined = cls;

    while (currentClass) {
        const stStates = currentClass[`-st-states`];

        if (stStates) {
            addStatesEntries(stateEntries, stStates);
        }

        const extendedClass = currentClass[`-st-extends`] as StylableSymbol;
        currentClass = extendedClass && extendedClass._kind === 'class' ? extendedClass : undefined;
    }

    let stateEntriesString = '';

    // stringify states for current class
    for (const [stateName, stateDef] of stateEntries.entries()) {
        const booleanState = !stateDef;
        const mappedState = stateDef?.type === 'template' || typeof stateDef === 'string';
        if (booleanState || !mappedState) {
            stateEntriesString += `${asString(stateName)}?: ${getStateTSType(stateDef)}; `;
        }
    }

    return stateEntriesString;
}

function stringifyStates(meta: StylableMeta) {
    let out = '';
    for (const [name, symbol] of Object.entries(meta.getAllClasses())) {
        const states = collectLocalStates(symbol);
        out += states ? `${SPACING}${asString(scope(name, meta.namespace))}: { ${states}};\n` : '';
    }

    return out;
}

function stringifyStringRecord(
    record: Record<string, any>,
    addParentheses = false,
    indent = SPACING,
    delimiter = '\n'
): string {
    const s = Object.entries(record)
        .map(
            ([key, value]) =>
                `${indent}${asString(key)}: ${stringifyTypedValue(
                    value,
                    indent + SPACING,
                    delimiter
                )};`
        )
        .join(delimiter);

    return addParentheses ? `{${wrapNL(s)}${indent.replace(SPACING, '')}}` : s;
}

function stringifyStringArray(array: any[], indent = SPACING, delimiter = '\n') {
    return `[${wrapNL(
        array
            .map((value) => `${indent}${stringifyTypedValue(value, indent + SPACING, delimiter)},`)
            .join(delimiter)
    )}${indent.replace(SPACING, '')}]`;
}

function stringifyTypedValue(
    value: string | any[] | Record<string, any>,
    indent = SPACING,
    delimiter = '\n'
): string {
    if (typeof value === 'string') {
        return 'string';
    } else if (Array.isArray(value)) {
        return stringifyStringArray(value, indent, delimiter);
    } else {
        return stringifyStringRecord(value, true, indent, delimiter);
    }
}

function stringifyClasses(classes: Record<string, string>, namespace: string, indent = SPACING) {
    // this uses the scoped names from the exported stylesheet, but they may change in a future build
    return Object.keys(classes)
        .map((name) => `${indent}${asString(name)}: ${asString(scope(name, namespace))};`)
        .join('\n');
}

/**
 * TODO: this function is not 100% correct and need a fix
 * support custom validators in arguments?
 * support custom types?
 */
function getStateTSType(stateDef: StateParsedValue | null) {
    return stateDef === null
        ? 'boolean'
        : stateDef.type === 'enum'
        ? stateDef.arguments
              .map((v) => (typeof v === 'string' ? asString(v) : 'unknown'))
              .join(' | ')
        : stateDef.type /* string | number */;
}

function wrapNL(code: string) {
    return code ? `\n${code}\n` : code;
}

export function generateDTSContent({ exports, meta }: StylableResults) {
    const namespace = asString(meta.namespace);
    const classes = wrapNL(stringifyClasses(exports.classes, meta.namespace));
    const vars = wrapNL(stringifyStringRecord(exports.vars));
    const stVars = wrapNL(stringifyStringRecord(exports.stVars));
    const keyframes = wrapNL(stringifyStringRecord(exports.keyframes));
    const layers = wrapNL(stringifyStringRecord(exports.layers));
    const containers = wrapNL(stringifyStringRecord(exports.containers));
    const states = wrapNL(stringifyStates(meta));

    return `/* THIS FILE IS AUTO GENERATED DO NOT MODIFY */
declare const namespace = ${namespace};

type states = {${states}};

declare const classes: {${classes}};

declare const vars: {${vars}};

declare const stVars: {${stVars}};

declare const keyframes: {${keyframes}};

declare const layers: {${layers}};

declare const containers: {${containers}};

declare function st<T extends string = keyof states>(
    ctx: T | NullableString,
    s?: T extends keyof states ? states[T] | NullableString : NullableString,
    ...rest: NullableString[]
): string;

declare const style: typeof st;

declare function cssStates<T extends string = keyof states>(
    s: T extends keyof states ? states[T] : never,
    ctx?: T | string
): string;

export { 
    classes,
    vars,
    stVars,
    keyframes,
    layers,
    containers,
    namespace,
    st,
    style,
    cssStates
};

/* HELPERS */
type NullableString = string | undefined | null;
`;
}
