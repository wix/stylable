import { basename } from 'path';
import { ClassSymbol, StylableMeta, valueMapping } from '@stylable/core';
import { STSymbol, CSSKeyframes } from '@stylable/core/dist/features';
import { encode } from 'vlq';
import {
    ClassesToken,
    ClassStateToken,
    TokenizedDtsEntry,
    tokenizeDTS,
} from './dts-rough-tokenizer';

type LineMapping = Array<Array<number>>;

function getClassSrcPosition(className: string, meta: StylableMeta): Position | undefined {
    const cls = meta.getClass(className);
    let res;

    if (cls) {
        meta.rawAst.walkRules(`.${className}`, (rule) => {
            if (rule.source && rule.source.start) {
                res = { line: rule.source.start.line - 1, column: rule.source.start.column - 1 };
                return false;
            }

            return;
        });
    }

    // root is auto defined by stylable in each stylesheet even if not explicitly written by the user
    return className === 'root' && !res ? { line: 0, column: 0 } : res;
}

function getVarsSrcPosition(varName: string, meta: StylableMeta): Position | undefined {
    const cssVar = STSymbol.get(meta, `--${varName}`, `cssVar`);
    let res;

    if (cssVar) {
        meta.rawAst.walkDecls(cssVar.name, (decl) => {
            if (decl.source && decl.source.start) {
                res = { line: decl.source.start.line - 1, column: decl.source.start.column - 1 };
                return false;
            }

            return;
        });
    }

    return res;
}

function getStVarsSrcPosition(varName: string, meta: StylableMeta): Position | undefined {
    const stVar = meta.vars.find((v) => v.name === varName);
    let res;

    if (stVar) {
        meta.rawAst.walkRules(':vars', (rule) => {
            return rule.walkDecls(varName, (decl) => {
                if (decl.source && decl.source.start) {
                    res = {
                        line: decl.source.start.line - 1,
                        column: decl.source.start.column - 1,
                    };
                    return false;
                }

                return;
            });
        });
    }

    return res;
}

function getKeyframeSrcPosition(keyframeName: string, meta: StylableMeta): Position | undefined {
    const keyframe = CSSKeyframes.getKeyframesStatements(meta).find(
        (keyframe) => keyframe.params === keyframeName
    );

    if (keyframe && keyframe.source && keyframe.source.start) {
        return {
            line: keyframe.source.start.line - 1,
            column: keyframe.source.start.column - 1,
        };
    }

    return;
}

function stripQuotes(name: string) {
    return name.slice(1, name.length - 1);
}

type LinePartMapping = [number, number, number, number];

function createLinePartMapping(
    dtsOffset: number,
    srcLine: number,
    srcCol: number
): LinePartMapping {
    return [dtsOffset, 0, srcLine, srcCol];
}

function createLineMapping(dtsOffset: number, srcLine: number, srcCol: number): LinePartMapping[] {
    return [createLinePartMapping(dtsOffset, srcLine, srcCol)];
}

type Position = {
    line: number;
    column: number;
};

function findDefiningClassName(stateToken: ClassStateToken, entryClassName: ClassSymbol) {
    let currentClass = entryClassName;

    while (currentClass[valueMapping.states]) {
        if (
            currentClass[valueMapping.states]?.[stripQuotes(stateToken.stateName.value)] !==
            undefined
        ) {
            return currentClass.name;
        }

        if (currentClass[valueMapping.extends]?._kind === 'class') {
            currentClass = currentClass[valueMapping.extends] as ClassSymbol;
        }
    }

    return entryClassName.name;
}

function createStateLineMapping(
    stateTokens: ClassStateToken[],
    entryClassName: string,
    lastSrcPosition: Position,
    meta: StylableMeta
) {
    const res: { mapping: LinePartMapping[]; lastSrcPosition: Position } = {
        mapping: [],
        lastSrcPosition,
    };
    let prevDtsColumn = 0;
    for (const stateToken of stateTokens) {
        let stateSourcePosition: Position | undefined;

        const srcClassName = findDefiningClassName(stateToken, meta.getClass(entryClassName)!);

        meta.rawAst.walkRules(`.${srcClassName}`, (rule) => {
            return rule.walkDecls(valueMapping.states, (decl) => {
                if (decl.source && decl.source.start)
                    stateSourcePosition = {
                        line: decl.source.start.line - 1,
                        column: decl.source.start.column - 1,
                    };
                return false;
            });
        });

        if (stateSourcePosition) {
            res.mapping.push(
                createLinePartMapping(
                    stateToken.stateName.column - prevDtsColumn,
                    stateSourcePosition.line - res.lastSrcPosition.line,
                    stateSourcePosition.column - res.lastSrcPosition.column
                )
            );

            prevDtsColumn = stateToken.stateName.column;
            res.lastSrcPosition = {
                line: stateSourcePosition.line,
                column: stateSourcePosition.column,
            };
        }
    }

    return res;
}

function findTokenForLine(line: number, dstTokens: TokenizedDtsEntry[]) {
    for (const typedTokens of dstTokens) {
        for (const token of typedTokens.tokens) {
            if ('line' in token) {
                if (token.line === line) {
                    return { type: typedTokens.type, token: token };
                }
            } else if (
                token.classStates &&
                token.classStates.length &&
                token.classStates[0].stateName.line === line
            ) {
                return { type: typedTokens.type, token: token };
            }
        }
    }

    return;
}

function getClassSourceName(targetName: string, classTokens: ClassesToken): string | undefined {
    for (const classToken of classTokens.tokens) {
        if (classToken.outputValue?.value === targetName) {
            return classToken.value;
        }
    }

    return;
}

export function generateDTSSourceMap(dtsContent: string, meta: StylableMeta) {
    const tokens = tokenizeDTS(dtsContent);
    const mapping: Record<number, LineMapping> = {};
    const lines = dtsContent.split('\n');
    let lastSrcPosition: Position = { line: 0, column: 0 };

    // each line represents one item (classes, vars, etc..)
    // to be mapped to one position in the source
    for (const dtsLine of lines.keys()) {
        const resToken = findTokenForLine(dtsLine, tokens);

        if (resToken) {
            let currentSrcPosition: Position | undefined;
            if ('type' in resToken.token) {
                const tokenName = stripQuotes(resToken.token.value);
                switch (resToken.type) {
                    case 'classes':
                        currentSrcPosition = getClassSrcPosition(tokenName, meta);
                        break;
                    case 'vars':
                        currentSrcPosition = getVarsSrcPosition(tokenName, meta);
                        break;
                    case 'stVars':
                        currentSrcPosition = getStVarsSrcPosition(tokenName, meta);
                        break;
                    case 'keyframes':
                        currentSrcPosition = getKeyframeSrcPosition(tokenName, meta);
                        break;
                }

                if (currentSrcPosition) {
                    mapping[dtsLine] = createLineMapping(
                        4, // top-level object property offset
                        currentSrcPosition.line - lastSrcPosition.line,
                        currentSrcPosition.column - lastSrcPosition.column
                    );
                    lastSrcPosition = { ...currentSrcPosition };
                }
            } else if (resToken.type === 'states') {
                const classSourceName = getClassSourceName(
                    resToken.token.className.value,
                    tokens[1] as ClassesToken
                );

                if (classSourceName) {
                    const stateRes = createStateLineMapping(
                        resToken.token.classStates,
                        stripQuotes(classSourceName),
                        lastSrcPosition,
                        meta
                    );
                    lastSrcPosition = stateRes.lastSrcPosition;
                    mapping[dtsLine] = stateRes.mapping;
                }
            }
        } else {
            mapping[dtsLine] = [];
        }
    }

    const stylesheetName = basename(meta.source);
    return JSON.stringify(
        {
            version: 3,
            file: `${stylesheetName}.d.ts`,
            sources: [stylesheetName],
            names: [],
            mappings: Object.values(mapping)
                .map((segment) => (segment.length ? segment.map((s) => encode(s)).join(',') : ''))
                .join(';'),
        },
        null,
        4
    );
}
