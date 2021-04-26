import { StateParsedValue, StylableMeta, StylableResults } from '@stylable/core';
import { SourceMapGenerator } from 'source-map';
import { basename } from 'path';
// import { SourceNode } from 'source-map';

const SPACING = ' '.repeat(4);
const asString = (v: string) => JSON.stringify(v);

function stringifyStringRecord(record: Record<string, string>, indent = SPACING) {
    return Object.keys(record)
        .map((k) => `${indent}${asString(k)}: string;`)
        .join('\n');
}

function stringifyClasses(classes: Record<string, string>, namespace: string, indent = SPACING) {
    return Object.keys(classes)
        .map((name) => `${indent}${asString(name)}: ${asString(scope(name, namespace))};`)
        .join('\n');
}

function stringifyStates({ classes, namespace }: StylableMeta) {
    let out = '';
    for (const [name, symbol] of Object.entries(classes)) {
        const stStates = symbol['-st-states'];
        if (!stStates) {
            continue;
        }
        let statesEntries = ' ';
        for (const [stateName, stateDef] of Object.entries(stStates)) {
            if (typeof stateDef === 'string') {
                continue;
            }
            statesEntries += `${asString(stateName)}?: ${getStateTSType(stateDef)}; `;
        }
        out += `${SPACING}${asString(scope(name, namespace))}: {${statesEntries}};\n`;
    }
    return out.slice(0, -1);
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
        : stateDef.type /* what are the rest of the states */;
}

function wrapNL(code: string) {
    return code ? `\n${code}\n` : code;
}

// TODO: make available from core currently defined in transformer class
function scope(name: string, namespace: string, delimiter = '__') {
    return namespace ? namespace + delimiter + name : name;
}

export function createDTSContent({ exports, meta }: StylableResults) {
    const namespace = asString(meta.namespace);
    const classes = wrapNL(stringifyClasses(exports.classes, meta.namespace));
    const vars = wrapNL(stringifyStringRecord(exports.vars));
    const stVars = wrapNL(stringifyStringRecord(exports.stVars));
    const keyframes = wrapNL(stringifyStringRecord(exports.keyframes));
    const states = wrapNL(stringifyStates(meta));

    return `/* THIS FILE IS AUTO GENERATED DO NOT MODIFY */
declare const namespace = ${namespace};

type states = {${states}};

declare const classes: {${classes}};

declare const vars: {${vars}};

declare const stVars: {${stVars}};

declare const keyframes: {${keyframes}};

declare function st<T extends string = keyof states>(
    ctx: T | NullableString,
    s?: GetStatesType<T>,
    ...rest: NullableString[]
): string;

declare const style: typeof st;

declare function cssStates<T = keyof states>(
    s: T extends keyof states ? states[T] : never,
    ctx?: T | string
): string;

export { 
    classes,
    vars,
    stVars,
    keyframes,
    namespace,
    st,
    style,
    cssStates
};

/* HELPERS */
type NullableString = string | undefined | null;

type isString<T> = T extends string ? (string extends T ? true : false) : false;

type GetStatesType<T> = T extends string
    ? isString<T> extends false
        ? T extends keyof states
            ? states[T] | NullableString
            : NullableString
        : NullableString
    : NullableString;

`;
}

export function createDTSSourceMap(srcFilename: string, _dtsContent: string, _meta: StylableMeta) {
    const filename = basename(srcFilename);
    const map = new SourceMapGenerator({
        file: `${filename}.d.ts`,
    });
    console.log(filename);

    const newNode = {
        generated: {
            line: 9,
            column: 5,
        },
        source: filename,
        original: {
            line: 6,
            column: 1,
        },
        name: 'root',
    };
    // const newNode2 = {
    //     generated: {
    //         line: 9,
    //         column: 9,
    //     },
    //     source: null,
    //     original: null,
    // };
    // const node = new SourceNode(6, 1, filename, 'root');

    // node.toString();

    // map.addMapping({
    //     source: filename,
    //     generated: { line: 1, column: 0 },
    //     original: { line: 1, column: 0 },
    // });

    map.addMapping(newNode);
    // // @ts-expect-error sasyhgduyhguyh
    // map.addMapping(newNode2);

    return map.toString();
}
