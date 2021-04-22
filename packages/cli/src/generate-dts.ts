import { MappedStates, StylableResults } from '@stylable/core';

const SPACING = ' '.repeat(4);

function createStateEntries(states: MappedStates) {
    return Object.entries(states)
        .map(([stateName, stateDef]) =>
            typeof stateDef !== 'string'
                ? `${JSON.stringify(stateName)}?: ${
                      stateDef === null
                          ? 'boolean'
                          : stateDef.type === 'enum'
                          ? stateDef.arguments.map((v) => `${JSON.stringify(v)}`).join(' | ')
                          : stateDef.type
                  }`
                : ''
        )
        .join(', ');
}

export function createDTSContent(res: StylableResults) {
    const { exports, meta: meta } = res;

    const classesType = `declare type classesType = ${JSON.stringify(exports.classes, null, 4)};\n`;

    const classes = 'export declare const classes: classesType;\n';

    const namespace = `export declare const namespace = ${JSON.stringify(meta.namespace)};\n`;
    const depth = `export declare const $depth: number;\n`;
    const id = `export declare const $id: string | number;\n`;
    const vars = `export declare const vars: {${Object.keys(exports.vars).map(
        (v) => `${JSON.stringify(v)}: string`
    ).join(', ')}}`;

    const stVars = `export declare const stVars: ${JSON.stringify(exports.stVars, null, 4)};\n`;
    const keyframes = `export declare const keyframes: ${JSON.stringify(
        exports.keyframes,
        null,
        4
    )};\n`;

    const states = `type states = {
${Object.entries(meta.classes)
    .map(([name, cls]) =>
        cls['-st-states']
            ? `${SPACING}${JSON.stringify(`${exports.classes[name]}`)}: { ${createStateEntries(cls['-st-states'])} };`
            : undefined
    )
    .filter(Boolean)
    .join('\n')}
} & { [key: string]: never };\n`;

    const isString =
        'type isString<T> = T extends string ? (string extends T ? true : false) : false;\n';

    const functions = `export declare function cssStates<T extends keyof states>(s: states[T], ctx?: T | string): string;\n
export declare function st<T extends string>(
    ctx: T | undefined,
    s?: string | (isString<T> extends false ? T extends keyof states ? states[T] : never : never),
    ...rest: Array<string | undefined>
): string;\n
export declare const style: typeof st;\n`;

    const emptyExport = `// do not remove - this is here to prevent auto-completion of inner parts
export {};`;

    return [
        classesType,
        classes,
        namespace,
        depth,
        id,
        vars,
        stVars,
        keyframes,
        states,
        isString,
        functions,
        emptyExport,
    ]
        .filter(Boolean)
        .join('\n');
}
