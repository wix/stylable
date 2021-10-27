import { parsePseudoImport, Imported, parseStImport } from '@stylable/core';
import { Root, decl, Declaration, atRule, rule, Rule } from 'postcss';

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
    ensureItems: Array<EnsureImportItem>,
    { mode }: { mode: 'patch-only' | 'st-import' | ':import' },
    diagnostics: any
) {
    const handled = new Set<EnsureImportItem>();
    for (const node of ast.nodes) {
        if (node.type === 'atrule' && node.name === 'st-import') {
            const pseudoImport = parseStImport(node, '*', diagnostics);
            processImports(pseudoImport, ensureItems, handled);
            node.assign(createAtImportProps(pseudoImport));
        } else if (node.type === 'rule' && node.selector === ':import') {
            const pseudoImport = parsePseudoImport(node, '*', diagnostics);
            processImports(pseudoImport, ensureItems, handled);

            const named = generateNamedValue(pseudoImport);
            const { defaultDecls, namedDecls } = patchDecls(node, named, pseudoImport);

            ensureSingleDecl(defaultDecls, node, '-st-default', pseudoImport.defaultExport);
            ensureSingleDecl(namedDecls, node, '-st-named', named.join(','));
        }
    }
    if (mode === 'patch-only') {
        return;
    }
    if (handled.size === ensureItems.length) {
        return;
    }
    for (const item of ensureItems) {
        if (handled.has(item)) {
            continue;
        }
        if (!hasDefinitions(item)) {
            continue;
        }
        if (mode === 'st-import') {
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
        } else {
            ast.prepend(rule(createPseudoImportProps(item)));
        }
    }
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
                value: named.join(','),
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
            decl.assign({ value: named.join(',') });
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

type EnsureImportItem = {
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
        namedParts.push(`keyframes(${keyframesParts.join(',')})`);
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
    ensureItems: Array<EnsureImportItem>,
    handled: Set<EnsureImportItem>
) {
    const ops = ['named', 'keyframes'] as const;
    for (const item of ensureItems) {
        if (pseudoImport.request === item.request) {
            for (const op of ops) {
                const bucket = item[op];
                if (!bucket) {
                    continue;
                }
                for (const [asName, symbol] of Object.entries(bucket)) {
                    const currentSymbol = pseudoImport[op][asName];
                    if (currentSymbol === symbol) {
                        continue;
                    } else if (currentSymbol) {
                        // throw "Attempt to override existing import name"
                    } else {
                        pseudoImport[op][asName] = symbol;
                    }
                }
            }
            if (pseudoImport.defaultExport !== item.defaultExport) {
                if (!pseudoImport.defaultExport && item.defaultExport) {
                    pseudoImport.defaultExport = item.defaultExport;
                } else {
                    // throw "Attempt to override existing import name"
                }
            }
            handled.add(item);
        }
    }
}
