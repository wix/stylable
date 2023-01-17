import { basename } from 'path';
import type { ClassSymbol, StylableMeta } from '@stylable/core';
import { STSymbol, CSSKeyframes, CSSLayer, CSSContains } from '@stylable/core/dist/index-internal';
import { processDeclarationFunctions } from '@stylable/core/dist/index-internal';
import { encode } from 'vlq';
import {
    ClassesToken,
    ClassStateToken,
    TokenizedDtsEntry,
    tokenizeDTS,
} from './dts-rough-tokenizer';
import { SPACING } from './generate-dts';

type LineMapping = Array<Array<number>>;

function getClassSrcPosition(className: string, meta: StylableMeta): Position | undefined {
    const cls = meta.getClass(className);
    let res;

    if (cls) {
        meta.sourceAst.walkRules(`.${className}`, (rule) => {
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
        meta.sourceAst.walkDecls(cssVar.name, (decl) => {
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
    const stVar = Object.values(meta.getAllStVars()).find((v) => v.name === varName);

    if (stVar?.node.source?.start) {
        return {
            line: stVar.node.source.start.line - 1,
            column: stVar.node.source.start.column - 1,
        };
    } else {
        // TODO: move this logic to Stylable core and enhance it. The meta should provide the API to get to the inner parts of the st-var
        let res: Position;
        meta.sourceAst.walkRules(':vars', (rule) => {
            return rule.walkDecls((decl) => {
                if (decl.source?.start) {
                    if (decl.prop === varName) {
                        res = {
                            line: decl.source.start.line - 1,
                            column: decl.source.start.column - 1,
                        };
                    } else {
                        processDeclarationFunctions(decl, (node, level) => {
                            if (node.type === 'item' && node.name === varName) {
                                const rawDeclaration = `${decl.raws.before ?? ''}${decl.prop}${
                                    decl.raws.between ?? ''
                                }${decl.value}`;
                                const rootPosition = {
                                    line: rule.source!.start!.line - 1,
                                    column: rule.source!.start!.column - 1,
                                };

                                res = {
                                    ...calculateEstimatedPosition(
                                        rawDeclaration,
                                        node.name,
                                        node.after,
                                        rootPosition
                                    ),
                                    generatedOffsetLevel: level,
                                };
                            }
                        });
                    }

                    if (res) {
                        return false;
                    }
                }

                return;
            });
        });
        return res!;
    }
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
function getLayersSrcPosition(layerName: string, meta: StylableMeta): Position | undefined {
    const definitionNode = CSSLayer.getDefinition(meta, layerName);

    if (definitionNode && definitionNode.source && definitionNode.source.start) {
        return {
            line: definitionNode.source.start.line - 1,
            column: definitionNode.source.start.column - 1,
        };
    }

    return;
}
function getContainersSrcPosition(containerName: string, meta: StylableMeta): Position | undefined {
    const definitionNode = CSSContains.getDefinition(meta, containerName);

    if (definitionNode && definitionNode.source && definitionNode.source.start) {
        return {
            line: definitionNode.source.start.line - 1,
            column: definitionNode.source.start.column - 1,
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
    generatedOffsetLevel?: number;
};

function findDefiningClassName(stateToken: ClassStateToken, entryClassName: ClassSymbol) {
    let currentClass = entryClassName;

    while (currentClass[`-st-states`]) {
        if (currentClass[`-st-states`]?.[stripQuotes(stateToken.stateName.value)] !== undefined) {
            return currentClass.name;
        }

        if (currentClass['-st-extends']?._kind === 'class') {
            currentClass = currentClass[`-st-extends`];
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

        meta.sourceAst.walkRules(`.${srcClassName}`, (rule) => {
            return rule.walkDecls(`-st-states`, (decl) => {
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

export function generateDTSSourceMap(
    dtsContent: string,
    meta: StylableMeta,
    targetFilePath?: string
) {
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
                    case 'layers':
                        currentSrcPosition = getLayersSrcPosition(tokenName, meta);
                        break;
                    case 'containers':
                        currentSrcPosition = getContainersSrcPosition(tokenName, meta);
                        break;
                }

                if (currentSrcPosition) {
                    const lineDelta = currentSrcPosition.line - lastSrcPosition.line;
                    const columnDelta = currentSrcPosition.column - lastSrcPosition.column;

                    mapping[dtsLine] = createLineMapping(
                        SPACING.repeat(currentSrcPosition.generatedOffsetLevel ?? 1).length,
                        lineDelta,
                        columnDelta
                    );

                    // reset to default offset level
                    currentSrcPosition.generatedOffsetLevel = undefined;

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
            sources: [targetFilePath ?? stylesheetName],
            names: [],
            mappings: Object.values(mapping)
                .map((segment) => (segment.length ? segment.map((s) => encode(s)).join(',') : ''))
                .join(';'),
        },
        null,
        4
    );
}

function calculateEstimatedPosition(
    rawValue: string,
    name: string,
    after = '',
    rootPosition?: Position
): Position {
    const valueLength = rawValue.indexOf(name + after) + name.length - after.length;
    const value = rawValue.slice(0, valueLength);
    const byLines = value.split(/\n/g);
    const lastLine = byLines[byLines.length - 1];

    return {
        line: byLines.length - 1 + (rootPosition?.line ?? 0),
        column: lastLine.length + (rootPosition?.column ?? 0),
    };
}
