import {
    Stylable,
    StylableMeta,
    valueMapping,
    Imported,
    CSSResolve,
    JSResolve,
} from '@stylable/core';
import { Rule, ChildNode } from 'postcss';
import { hashContent } from './hash-content-util';

export function createMetadataForStylesheet(
    stylable: Stylable,
    content: string,
    resourcePath: string,
    exposeNamespaceMapping = true
) {
    const meta = stylable.fileProcessor.processContent(content, resourcePath);

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
        const rawAst = meta.rawAst.clone();
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
                        if (decl.prop === valueMapping.from) {
                            decl.value = JSON.stringify(
                                `/${ensureHash(resolved.meta, hashes)}.st.css`
                            );
                        }
                    });
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

function ruleByLocation(ruleA: Rule) {
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
        hashes.set(meta, hashContent(meta.rawAst.toString()));
    }
    return hashes;
}

export type ResolvedImport = {
    stImport: Imported;
    resolved: CSSResolve | JSResolve | null;
};

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

    for (const stImport of meta.imports) {
        const resolved = stylable.resolver.resolveImported(stImport, '');
        imports.push({ stImport, resolved });
        if (resolved && resolved._kind === 'css') {
            collectDependenciesDeep(stylable, resolved.meta, out);
        }
    }
    return out;
}
