import { basename } from 'path';
import { StylableMeta } from '@stylable/core';
import { TokenizedDtsEntry, tokenizeDTS } from './dts-rough-tokenizer';
import { encode } from 'vlq';

type LineMapping = Array<Array<number>>;

function getClassSrcLine(
    className: string,
    meta: StylableMeta
): { line: number; column: number } | undefined {
    const cls = meta.classes[className];
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

    return res;
}

function getVarsSrcLine(
    varName: string,
    meta: StylableMeta
): { line: number; column: number } | undefined {
    const cssVar = meta.cssVars[`--${varName}`];
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

function getStVarsSrcLine(
    varName: string,
    meta: StylableMeta
): { line: number; column: number } | undefined {
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

function getKeyframeSrcLine(
    keyframeName: string,
    meta: StylableMeta
): { line: number; column: number } | undefined {
    const keyframe = meta.keyframes.find((keyframe) => keyframe.params === keyframeName);

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

function createLineMapping(
    dtsOffset: number,
    srcLine: number,
    srcCol: number
): [[number, number, number, number]] {
    return [[dtsOffset, 0, srcLine, srcCol]];
}

function findTokenForLine(line: number, dstTokens: TokenizedDtsEntry[]) {
    for (const typedTokens of dstTokens) {
        for (const token of typedTokens.tokens) {
            if ('line' in token && token.line === line) {
                return { type: typedTokens.type, token: token };
            }
        }
    }

    return;
}

export function generateDTSSourceMap(_srcFilename: string, dtsContent: string, meta: StylableMeta) {
    const tokens = tokenizeDTS(dtsContent);
    const mapping: Record<number, LineMapping> = {};
    const lines = dtsContent.split('\n');
    let lastSrcLocation = { line: 0, column: 0 };

    for (const dtsLine of lines.keys()) {
        const resToken = findTokenForLine(dtsLine, tokens);

        if (resToken) {
            let currentSrcLocation;
            if ('type' in resToken.token) {
                const tokenName = stripQuotes(resToken.token.value);
                switch (resToken.type) {
                    case 'classes':
                        currentSrcLocation = getClassSrcLine(tokenName, meta);
                        break;
                    case 'vars':
                        currentSrcLocation = getVarsSrcLine(tokenName, meta);
                        break;
                    case 'stVars':
                        currentSrcLocation = getStVarsSrcLine(tokenName, meta);
                        break;
                    case 'keyframes':
                        currentSrcLocation = getKeyframeSrcLine(tokenName, meta);
                        break;
                }

                if (currentSrcLocation) {
                    mapping[dtsLine] = createLineMapping(
                        5,
                        currentSrcLocation.line - lastSrcLocation.line,
                        currentSrcLocation.column - lastSrcLocation.column
                    );
                    lastSrcLocation = { ...currentSrcLocation };
                }
            } else {
                throw 'Implement states!!!';
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
                .map((segment) => (segment.length ? encode(segment[0]) : ''))
                .join(';'),
        },
        null,
        4
    );
}
