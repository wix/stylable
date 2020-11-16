import { StylableMeta } from './stylable-meta';
import { Imported } from './stylable-processor';
import { StylableResolver } from './stylable-resolver';

export function visitMetaCSSDependencies(
    meta: StylableMeta,
    onMetaDependency: (meta: StylableMeta, imported: Imported, depth: number) => void,
    resolver: StylableResolver,
    visited = new Set<string>(),
    depth = 0
): void {
    if (visited.has(meta.source)) {
        return;
    }
    visited.add(meta.source);
    for (const imported of meta.imports) {
        const res = resolver.resolveImported(imported, '');
        if (res?._kind === 'css') {
            onMetaDependency(res.meta, imported, depth);
            visitMetaCSSDependencies(res.meta, onMetaDependency, resolver, visited, depth + 1);
        }
    }
}

export function visitMetaCSSDependenciesBFS(
    meta: StylableMeta,
    onMetaDependency: (meta: StylableMeta, imported: Imported, depth: number) => void,
    resolver: StylableResolver
): void {
    const visited = new Set<string>([meta.source]);
    const q = [[...meta.imports]];
    let depth = -1;
    while (++depth < q.length) {
        let index = -1;
        const items = q[depth];
        if (items.length && !q[depth + 1]) {
            q[depth + 1] = [];
        }
        while (++index < items.length) {
            const imported = items[index];
            const res = resolver.resolveImported(imported, '');
            if (res?._kind === 'css' && !visited.has(res.meta.source)) {
                visited.add(res.meta.source);
                onMetaDependency(res.meta, imported, depth + 1);
                q[depth + 1].push(...res.meta.imports);
            }
        }
    }
}
