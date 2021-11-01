import path from 'path';
import { parseImports } from '@tokey/imports-parser';
import { Diagnostics } from './diagnostics';
import type { Imported } from './stylable-meta';
import { Root, decl, Declaration, atRule, rule, Rule, AtRule } from 'postcss';
import { rootValueMapping, SBTypesParsers, valueMapping } from './stylable-value-parsers';
import { stripQuotation } from './utils';
import { isCompRoot } from './helpers/selector';

const parseNamed = SBTypesParsers[valueMapping.named];

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
};

export const ensureImportsMessages = {
    ATTEMPT_OVERRIDE_SYMBOL(
        kind: 'default' | 'named' | 'keyframes',
        origin: string,
        override: string
    ) {
        return `Attempt to override existing ${kind} import symbol. ${origin} -> ${override} `;
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
        mode: 'patch-only' | 'st-import' | ':import';
        shouldPatch?: (diagnostics: Diagnostics) => boolean;
    },
    diagnostics: Diagnostics = new Diagnostics()
) {
    const patches = createImportPatches(ast, importPatches, options, diagnostics);
    const shouldPatch = options.shouldPatch || (() => !diagnostics.reports.length);
    if (shouldPatch(diagnostics)) {
        for (const patch of patches) {
            patch();
        }
    }
    return { diagnostics };
}
function createImportPatches(
    ast: Root,
    importPatches: Array<ImportPatch>,
    { mode }: { mode: 'patch-only' | 'st-import' | ':import' },
    diagnostics: Diagnostics
) {
    const patches: Array<() => void> = [];
    const handled = new Set<ImportPatch>();
    for (const node of ast.nodes) {
        if (node.type === 'atrule' && node.name === 'st-import') {
            const pseudoImport = parseStImport(node, '*', diagnostics);
            processImports(pseudoImport, importPatches, handled, diagnostics);
            patches.push(() => node.assign(createAtImportProps(pseudoImport)));
        } else if (node.type === 'rule' && node.selector === ':import') {
            const pseudoImport = parsePseudoImport(node, '*', diagnostics);
            processImports(pseudoImport, importPatches, handled, diagnostics);

            patches.push(() => {
                const named = generateNamedValue(pseudoImport);
                const { defaultDecls, namedDecls } = patchDecls(node, named, pseudoImport);

                if (pseudoImport.defaultExport) {
                    ensureSingleDecl(defaultDecls, node, '-st-default', pseudoImport.defaultExport);
                }
                if (named.length) {
                    ensureSingleDecl(namedDecls, node, '-st-named', named.join(', '));
                }
            });
        }
    }
    if (mode === 'patch-only') {
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
        if (mode === 'st-import') {
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

export function parseImport(
    node: AtRule | Rule,
    context: string,
    diagnostics: Diagnostics
): Imported {
    return node.type === 'atrule'
        ? parseStImport(node, context, diagnostics)
        : parsePseudoImport(node, context, diagnostics);
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
        importObj.defaultExport = imports.defaultName || '';
        setImportObjectFrom(imports.from || '', context, importObj);

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

                if (!isCompRoot(importObj.defaultExport) && importObj.from.match(/\.css$/)) {
                    diagnostics.warn(decl, parseImportMessages.DEFAULT_IMPORT_IS_LOWER_CASE(), {
                        word: importObj.defaultExport,
                    });
                }
                break;
            case valueMapping.named:
                {
                    const { keyframesMap, namedMap } = parseNamed(decl.value, decl, diagnostics);
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

type ImportPatch = {
    request: string;
    named?: Record<string, string>;
    keyframes?: Record<string, string>;
    defaultExport?: string;
};

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
    pseudoImport: Imported,
    importPatches: Array<ImportPatch>,
    handled: Set<ImportPatch>,
    diagnostics: Diagnostics
) {
    const ops = ['named', 'keyframes'] as const;
    for (const patch of importPatches) {
        if (pseudoImport.request === patch.request) {
            for (const op of ops) {
                const patchBucket = patch[op];
                if (!patchBucket) {
                    continue;
                }
                for (const [asName, symbol] of Object.entries(patchBucket)) {
                    const currentSymbol = pseudoImport[op][asName];
                    if (currentSymbol === symbol) {
                        continue;
                    } else if (currentSymbol) {
                        diagnostics.error(
                            pseudoImport.rule,
                            ensureImportsMessages.ATTEMPT_OVERRIDE_SYMBOL(
                                op,
                                currentSymbol === asName
                                    ? currentSymbol
                                    : `${currentSymbol} as ${asName}`,
                                symbol === asName ? symbol : `${symbol} as ${asName}`
                            )
                        );
                    } else {
                        pseudoImport[op][asName] = symbol;
                    }
                }
            }

            if (patch.defaultExport) {
                if (!pseudoImport.defaultExport) {
                    pseudoImport.defaultExport = patch.defaultExport;
                } else if (pseudoImport.defaultExport !== patch.defaultExport) {
                    diagnostics.error(
                        pseudoImport.rule,
                        ensureImportsMessages.ATTEMPT_OVERRIDE_SYMBOL(
                            'default',
                            pseudoImport.defaultExport,
                            patch.defaultExport
                        )
                    );
                }
            }
            handled.add(patch);
        }
    }
}
