import path from 'path';
import { parseImports } from '@tokey/imports-parser';
import { Diagnostics } from '../diagnostics';
import type { Imported } from '../features';
import { Root, decl, Declaration, atRule, rule, Rule, AtRule } from 'postcss';
import { rootValueMapping, valueMapping } from '../stylable-value-parsers';
import { stripQuotation } from '../helpers/string';
import { isCompRoot } from './selector';
import type { ParsedValue } from '../types';
import type * as postcss from 'postcss';
import postcssValueParser, {
    ParsedValue as PostCSSParsedValue,
    FunctionNode,
} from 'postcss-value-parser';

export const parseImportMessages = {
    ST_IMPORT_STAR() {
        return '@st-import * is not supported';
    },
    INVALID_ST_IMPORT_FORMAT(errors: string[]) {
        return `Invalid @st-import format:\n - ${errors.join('\n - ')}`;
    },

    ST_IMPORT_EMPTY_FROM() {
        return '@st-import must specify a valid "from" string value';
    },
    EMPTY_IMPORT_FROM() {
        return '"-st-from" cannot be empty';
    },

    MULTIPLE_FROM_IN_IMPORT() {
        return `cannot define multiple "${valueMapping.from}" declarations in a single import`;
    },
    DEFAULT_IMPORT_IS_LOWER_CASE() {
        return 'Default import of a Stylable stylesheet must start with an upper-case letter';
    },
    ILLEGAL_PROP_IN_IMPORT(propName: string) {
        return `"${propName}" css attribute cannot be used inside ${rootValueMapping.import} block`;
    },
    FROM_PROP_MISSING_IN_IMPORT() {
        return `"${valueMapping.from}" is missing in ${rootValueMapping.import} block`;
    },
    INVALID_NAMED_IMPORT_AS(name: string) {
        return `Invalid named import "as" with name "${name}"`;
    },
    INVALID_NESTED_KEYFRAMES(name: string) {
        return `Invalid nested keyframes import "${name}"`;
    },
};

export const ensureImportsMessages = {
    ATTEMPT_OVERRIDE_SYMBOL(
        kind: 'default' | 'named' | 'keyframes',
        origin: string,
        override: string
    ) {
        return `Attempt to override existing ${kind} import symbol. ${origin} -> ${override}`;
    },
    PATCH_CONTAINS_NEW_IMPORT_IN_NEW_IMPORT_NONE_MODE() {
        return `Attempt to insert new a import in newImport "none" mode`;
    },
};

export function createAtImportProps(
    importObj: Partial<Pick<Imported, 'named' | 'keyframes' | 'defaultExport' | 'request'>>
): {
    name: string;
    params: string;
} {
    const named = Object.entries(importObj.named || {});
    const keyframes = Object.entries(importObj.keyframes || {});
    let params = '';
    if (importObj.defaultExport) {
        params += importObj.defaultExport;
    }
    if (importObj.defaultExport && (named.length || keyframes.length)) {
        params += ', ';
    }
    if (named.length || keyframes.length) {
        params += '[';

        const namedParts = getNamedImportParts(named);
        const keyFramesParts = getNamedImportParts(keyframes);

        params += namedParts.join(', ');

        if (keyFramesParts.length) {
            if (namedParts.length) {
                params += ', ';
            }
            params += `keyframes(${keyFramesParts.join(', ')})`;
        }
        params += ']';
    }

    params += ` from ${JSON.stringify(importObj.request || '')}`;
    return { name: 'st-import', params };
}

export function ensureStylableImports(
    ast: Root,
    importPatches: Array<ImportPatch>,
    options: {
        newImport: 'none' | 'st-import' | ':import';
    },
    diagnostics: Diagnostics = new Diagnostics()
) {
    const patches = createImportPatches(ast, importPatches, options, diagnostics);
    if (!diagnostics.reports.length) {
        for (const patch of patches) {
            patch();
        }
    }
    return { diagnostics };
}
function createImportPatches(
    ast: Root,
    importPatches: Array<ImportPatch>,
    { newImport }: { newImport: 'none' | 'st-import' | ':import' },
    diagnostics: Diagnostics
) {
    const patches: Array<() => void> = [];
    const handled = new Set<ImportPatch>();
    for (const node of ast.nodes) {
        if (node.type === 'atrule' && node.name === 'st-import') {
            const imported = parseStImport(node, '*', diagnostics);
            processImports(imported, importPatches, handled, diagnostics);
            patches.push(() => node.assign(createAtImportProps(imported)));
        } else if (node.type === 'rule' && node.selector === ':import') {
            const imported = parsePseudoImport(node, '*', diagnostics);
            processImports(imported, importPatches, handled, diagnostics);

            patches.push(() => {
                const named = generateNamedValue(imported);
                const { defaultDecls, namedDecls } = patchDecls(node, named, imported);

                if (imported.defaultExport) {
                    ensureSingleDecl(defaultDecls, node, '-st-default', imported.defaultExport);
                }
                if (named.length) {
                    ensureSingleDecl(namedDecls, node, '-st-named', named.join(', '));
                }
            });
        }
    }
    if (newImport === 'none') {
        if (handled.size !== importPatches.length) {
            diagnostics.error(
                ast,
                ensureImportsMessages.PATCH_CONTAINS_NEW_IMPORT_IN_NEW_IMPORT_NONE_MODE()
            );
        }
        return patches;
    }
    if (handled.size === importPatches.length) {
        return patches;
    }
    for (const item of importPatches) {
        if (handled.has(item)) {
            continue;
        }
        if (!hasDefinitions(item)) {
            continue;
        }
        if (newImport === 'st-import') {
            patches.push(() => {
                ast.prepend(
                    atRule(
                        createAtImportProps({
                            defaultExport: item.defaultExport || '',
                            keyframes: item.keyframes || {},
                            named: item.named || {},
                            request: item.request,
                        })
                    )
                );
            });
        } else {
            patches.push(() => {
                ast.prepend(rule(createPseudoImportProps(item)));
            });
        }
    }
    return patches;
}

function setImportObjectFrom(importPath: string, dirPath: string, importObj: Imported) {
    if (!path.isAbsolute(importPath) && !importPath.startsWith('.')) {
        importObj.request = importPath;
        importObj.from = importPath;
    } else {
        importObj.request = importPath;
        importObj.from =
            path.posix && path.posix.isAbsolute(dirPath) // browser has no posix methods
                ? path.posix.resolve(dirPath, importPath)
                : path.resolve(dirPath, importPath);
    }
}

export function parseStylableImport(
    node: AtRule | Rule,
    context: string,
    diagnostics: Diagnostics
) {
    if (node.type === 'atrule') {
        return parseStImport(node, context, diagnostics);
    } else {
        return parsePseudoImport(node, context, diagnostics);
    }
}

export function parseStImport(atRule: AtRule, context: string, diagnostics: Diagnostics) {
    const importObj: Imported = {
        defaultExport: '',
        from: '',
        request: '',
        named: {},
        rule: atRule,
        context,
        keyframes: {},
    };
    const imports = parseImports(`import ${atRule.params}`, '[', ']', true)[0];

    if (imports && imports.star) {
        diagnostics.error(atRule, parseImportMessages.ST_IMPORT_STAR());
    } else {
        setImportObjectFrom(imports.from || '', context, importObj);

        importObj.defaultExport = imports.defaultName || '';
        if (
            importObj.defaultExport &&
            !isCompRoot(importObj.defaultExport) &&
            importObj.from.endsWith(`.css`)
        ) {
            diagnostics.warn(atRule, parseImportMessages.DEFAULT_IMPORT_IS_LOWER_CASE(), {
                word: importObj.defaultExport,
            });
        }
        if (imports.tagged?.keyframes) {
            // importObj.keyframes = imports.tagged?.keyframes;
            for (const [impName, impAsName] of Object.entries(imports.tagged.keyframes)) {
                importObj.keyframes[impAsName] = impName;
            }
        }
        if (imports.named) {
            for (const [impName, impAsName] of Object.entries(imports.named)) {
                importObj.named[impAsName] = impName;
            }
        }
        if (imports.errors.length) {
            diagnostics.error(atRule, parseImportMessages.INVALID_ST_IMPORT_FORMAT(imports.errors));
        } else if (!imports.from?.trim()) {
            diagnostics.error(atRule, parseImportMessages.ST_IMPORT_EMPTY_FROM());
        }
    }

    return importObj;
}

export function parsePseudoImport(rule: Rule, context: string, diagnostics: Diagnostics) {
    let fromExists = false;
    const importObj: Imported = {
        defaultExport: '',
        from: '',
        request: '',
        named: {},
        keyframes: {},
        rule,
        context,
    };

    rule.walkDecls((decl) => {
        switch (decl.prop) {
            case valueMapping.from: {
                const importPath = stripQuotation(decl.value);
                if (!importPath.trim()) {
                    diagnostics.error(decl, parseImportMessages.EMPTY_IMPORT_FROM());
                }

                if (fromExists) {
                    diagnostics.warn(rule, parseImportMessages.MULTIPLE_FROM_IN_IMPORT());
                }

                setImportObjectFrom(importPath, context, importObj);
                fromExists = true;
                break;
            }
            case valueMapping.default:
                importObj.defaultExport = decl.value;
                if (!isCompRoot(importObj.defaultExport) && importObj.from.endsWith(`.css`)) {
                    diagnostics.warn(decl, parseImportMessages.DEFAULT_IMPORT_IS_LOWER_CASE(), {
                        word: importObj.defaultExport,
                    });
                }
                break;
            case valueMapping.named:
                {
                    const { keyframesMap, namedMap } = parsePseudoImportNamed(
                        decl.value,
                        decl,
                        diagnostics
                    );
                    importObj.named = namedMap;
                    importObj.keyframes = keyframesMap;
                }
                break;
            default:
                diagnostics.warn(decl, parseImportMessages.ILLEGAL_PROP_IN_IMPORT(decl.prop), {
                    word: decl.prop,
                });
                break;
        }
    });

    if (!importObj.from) {
        diagnostics.error(rule, parseImportMessages.FROM_PROP_MISSING_IN_IMPORT());
    }
    return importObj;
}

export function parsePseudoImportNamed(
    value: string,
    node: postcss.Declaration | postcss.AtRule,
    diagnostics: Diagnostics
) {
    const namedMap: Record<string, string> = {};
    const keyframesMap: Record<string, string> = {};
    if (value) {
        handleNamedTokens(
            postcssValueParser(value),
            { namedMap, keyframesMap },
            'namedMap',
            node,
            diagnostics
        );
    }
    return { namedMap, keyframesMap };
}

function createPseudoImportProps(
    item: Partial<Pick<Imported, 'named' | 'keyframes' | 'defaultExport' | 'request'>>
) {
    const nodes = [];
    const named = generateNamedValue(item);
    if (item.request) {
        nodes.push(decl({ prop: '-st-from', value: JSON.stringify(item.request) }));
    }
    if (item.defaultExport) {
        nodes.push(
            decl({
                prop: '-st-default',
                value: item.defaultExport,
            })
        );
    }
    if (named.length) {
        nodes.push(
            decl({
                prop: '-st-named',
                value: named.join(', '),
            })
        );
    }

    return {
        selector: ':import',
        nodes,
    };
}

function patchDecls(node: Rule, named: string[], pseudoImport: Imported) {
    const namedDecls: Declaration[] = [];
    const defaultDecls: Declaration[] = [];
    node.walkDecls((decl) => {
        if (decl.prop === '-st-named') {
            decl.assign({ value: named.join(', ') });
            namedDecls.push(decl);
        } else if (decl.prop === '-st-default') {
            decl.assign({ value: pseudoImport.defaultExport });
            defaultDecls.push(decl);
        }
    });
    return { defaultDecls, namedDecls };
}

function ensureSingleDecl(decls: Declaration[], node: Rule, prop: string, value: string) {
    if (!decls.length) {
        node.append(decl({ prop, value }));
    } else if (decls.length > 1) {
        // remove duplicates keep last one
        for (let i = 0; i < decls.length - 1; i++) {
            decls[i].remove();
        }
    }
}

function getNamedImportParts(named: [string, string][]) {
    const parts: string[] = [];
    for (const [as, name] of named) {
        if (as === name) {
            parts.push(name);
        } else {
            parts.push(`${name} as ${as}`);
        }
    }

    return parts;
}

type ImportPatch = Partial<Pick<Imported, 'defaultExport' | 'named' | 'keyframes'>> &
    Pick<Imported, 'request'>;

function generateNamedValue({
    named = {},
    keyframes = {},
}: Partial<Pick<Imported, 'named' | 'keyframes'>>) {
    const namedParts = getNamedImportParts(Object.entries(named));
    const keyframesParts = getNamedImportParts(Object.entries(keyframes));
    if (keyframesParts.length) {
        namedParts.push(`keyframes(${keyframesParts.join(', ')})`);
    }
    return namedParts;
}

function hasDefinitions({
    named = {},
    keyframes = {},
    defaultExport,
}: Partial<Pick<Imported, 'named' | 'keyframes' | 'defaultExport'>>) {
    return defaultExport || Object.keys(named).length || Object.keys(keyframes).length;
}

function processImports(
    imported: Imported,
    importPatches: Array<ImportPatch>,
    handled: Set<ImportPatch>,
    diagnostics: Diagnostics
) {
    const ops = ['named', 'keyframes'] as const;
    for (const patch of importPatches) {
        if (handled.has(patch)) {
            continue;
        }
        if (imported.request === patch.request) {
            for (const op of ops) {
                const patchBucket = patch[op];
                if (!patchBucket) {
                    continue;
                }
                for (const [asName, symbol] of Object.entries(patchBucket)) {
                    const currentSymbol = imported[op][asName];
                    if (currentSymbol === symbol) {
                        continue;
                    } else if (currentSymbol) {
                        diagnostics.error(
                            imported.rule,
                            ensureImportsMessages.ATTEMPT_OVERRIDE_SYMBOL(
                                op,
                                currentSymbol === asName
                                    ? currentSymbol
                                    : `${currentSymbol} as ${asName}`,
                                symbol === asName ? symbol : `${symbol} as ${asName}`
                            )
                        );
                    } else {
                        imported[op][asName] = symbol;
                    }
                }
            }

            if (patch.defaultExport) {
                if (!imported.defaultExport) {
                    imported.defaultExport = patch.defaultExport;
                } else if (imported.defaultExport !== patch.defaultExport) {
                    diagnostics.error(
                        imported.rule,
                        ensureImportsMessages.ATTEMPT_OVERRIDE_SYMBOL(
                            'default',
                            imported.defaultExport,
                            patch.defaultExport
                        )
                    );
                }
            }
            handled.add(patch);
        }
    }
}

function handleNamedTokens(
    tokens: PostCSSParsedValue | FunctionNode,
    buckets: { namedMap: Record<string, string>; keyframesMap: Record<string, string> },
    key: keyof typeof buckets = 'namedMap',
    node: postcss.Declaration | postcss.AtRule,
    diagnostics: Diagnostics
) {
    const { nodes } = tokens;
    for (let i = 0; i < nodes.length; i++) {
        const token = nodes[i];
        if (token.type === 'word') {
            const space = nodes[i + 1];
            const as = nodes[i + 2];
            const spaceAfter = nodes[i + 3];
            const asName = nodes[i + 4];
            if (isImportAs(space, as)) {
                if (spaceAfter?.type === 'space' && asName?.type === 'word') {
                    buckets[key][asName.value] = token.value;
                    i += 4; //ignore next 4 tokens
                } else {
                    i += !asName ? 3 : 2;
                    diagnostics.warn(
                        node,
                        parseImportMessages.INVALID_NAMED_IMPORT_AS(token.value)
                    );
                    continue;
                }
            } else {
                buckets[key][token.value] = token.value;
            }
        } else if (token.type === 'function' && token.value === 'keyframes') {
            if (key === 'keyframesMap') {
                diagnostics.warn(
                    node,
                    parseImportMessages.INVALID_NESTED_KEYFRAMES(
                        postcssValueParser.stringify(token)
                    )
                );
            }
            handleNamedTokens(token, buckets, 'keyframesMap', node, diagnostics);
        }
    }
}

function isImportAs(space: ParsedValue, as: ParsedValue) {
    return space?.type === 'space' && as?.type === 'word' && as?.value === 'as';
}
