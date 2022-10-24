import type { Stylable, StylableMeta } from '@stylable/core';
import type { Rule, ChildNode, AtRule } from 'postcss';
import type { Metadata, ResolvedImport } from './types';
import { hashContent } from './hash-content-util';

export function createMetadataForStylesheet(
    stylable: Stylable,
    content: string,
    resourcePath: string,
    exposeNamespaceMapping = true,
    meta = stylable.fileProcessor.processContent(content, resourcePath)
): Metadata {
    const usedMeta = collectDependenciesDeep(stylable, meta);

    const hashes = createContentHashPerMeta(usedMeta.keys());

    const stylesheetMapping = rewriteImports(usedMeta, hashes);

    const namespaceMapping = exposeNamespaceMapping ? createNamespaceMapping(usedMeta, hashes) : {};

    return {
        usedMeta,
        stylesheetMapping,
        namespaceMapping,
        entry: `/${ensureHash(meta, hashes)}.st.css`,
    };
}

export function createNamespaceMapping(
    usedMeta: Map<StylableMeta, ResolvedImport[]>,
    hashes: Map<StylableMeta, string>
) {
    const namespaceMapping: Record<string, string> = {};
    for (const [meta] of usedMeta) {
        namespaceMapping[`/${ensureHash(meta, hashes)}.st.css`] = meta.namespace;
    }
    return namespaceMapping;
}

export function rewriteImports(
    usedMeta: Map<StylableMeta, ResolvedImport[]>,
    hashes: Map<StylableMeta, string>
) {
    const sourcesByHash: Record<string, string> = {};
    for (const [meta, resolvedImports] of usedMeta.entries()) {
        const hash = ensureHash(meta, hashes);
        const rawAst = meta.sourceAst.clone();
        for (const { resolved, stImport } of resolvedImports) {
            if (resolved && resolved._kind === 'css') {
                const rawRule = rawAst.nodes?.find(ruleByLocation(stImport.rule));
                if (!rawRule) {
                    throw new Error(
                        'Could not find source node for ' +
                            stImport.rule.toString() +
                            ' at ' +
                            meta.source
                    );
                }
                if (rawRule.type === 'rule') {
                    rawRule.walkDecls((decl) => {
                        if (decl.prop === `-st-from`) {
                            decl.value = JSON.stringify(
                                `/${ensureHash(resolved.meta, hashes)}.st.css`
                            );
                        }
                    });
                } else if (rawRule.type === 'atrule') {
                    rawRule.params = rawRule.params.replace(
                        stImport.request,
                        `/${ensureHash(resolved.meta, hashes)}.st.css`
                    );
                } else {
                    throw new Error('Unknown import rule ' + rawRule.toString());
                }
            } else if (resolved && resolved._kind === 'js') {
                throw new Error('js import are not supported yet!');
            }
        }
        sourcesByHash[`/${hash}.st.css`] = rawAst.toString();
    }
    return sourcesByHash;
}

function ruleByLocation(ruleA: Rule | AtRule) {
    return (ruleB: ChildNode) => {
        return (
            ruleB.source?.start?.column === ruleA.source?.start?.column &&
            ruleB.source?.start?.line === ruleA.source?.start?.line &&
            ruleB.source?.end?.column === ruleA.source?.end?.column &&
            ruleB.source?.end?.line === ruleA.source?.end?.line
        );
    };
}

export function ensureHash(meta: StylableMeta, hashes: Map<StylableMeta, string>) {
    const hash = hashes.get(meta);
    if (!hash) {
        throw new Error('Missing meta hash for:' + meta.source);
    }
    return hash;
}

export function createContentHashPerMeta(usedMeta: Iterable<StylableMeta>) {
    const hashes = new Map<StylableMeta, string>();
    for (const meta of usedMeta) {
        hashes.set(meta, hashContent(meta.sourceAst.toString()));
    }
    return hashes;
}

export function collectDependenciesDeep(
    stylable: Stylable,
    meta: StylableMeta,
    out = new Map<StylableMeta, ResolvedImport[]>()
) {
    if (out.has(meta)) {
        return out;
    }
    const imports: ResolvedImport[] = [];
    out.set(meta, imports);

    for (const stImport of meta.getImportStatements()) {
        const resolved = stylable.resolver.resolveImported(stImport, '');
        imports.push({ stImport, resolved });
        if (resolved && resolved._kind === 'css') {
            collectDependenciesDeep(stylable, resolved.meta, out);
        }
    }
    return out;
}
