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
    meta.imports.map((imported) => {
        const res = transformer.resolver.resolveImported(imported, '');
        if (res) {
            if (res._kind === 'css') {
                onMetaDependency(res.meta);
                addMetaDependencies(res.meta, onMetaDependency, transformer, visited);
            }
        }
    });
}
