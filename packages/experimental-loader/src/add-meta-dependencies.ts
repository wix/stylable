import { StylableMeta, StylableTransformer } from '@stylable/core';

export function addMetaDependencies(
    meta: StylableMeta,
    onMetaDependency: (meta: StylableMeta) => void,
    transformer: StylableTransformer,
    visited = new Set<string>()
) {
    if (visited.has(meta.source)) {
        return;
    }
    visited.add(meta.source);
    for (const imported of meta.imports) {
        const res = transformer.resolver.resolveImported(imported, '');
        if (res?._kind === 'css') {
            onMetaDependency(res.meta);
            addMetaDependencies(res.meta, onMetaDependency, transformer, visited);
        }
    }
}
