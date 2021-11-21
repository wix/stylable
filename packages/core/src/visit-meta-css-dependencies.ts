import type { StylableMeta } from './stylable-meta';
import type { Imported } from './features';
import type { StylableResolver } from './stylable-resolver';

export function visitMetaCSSDependenciesBFS(
    meta: StylableMeta,
    onMetaDependency: (meta: StylableMeta, imported: Imported, depth: number) => void,
    resolver: StylableResolver,
    onJsDependency?: (resolvedPath: string, imported: Imported) => void
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
            const resolvedPath = resolver.resolvePath(imported.context, imported.request);

            if (res?._kind === 'css' && !visited.has(res.meta.source)) {
                visited.add(res.meta.source);
                onMetaDependency(res.meta, imported, depth + 1);
                q[depth + 1].push(...res.meta.imports);
            } else if (res?._kind === 'js' && onJsDependency && !visited.has(resolvedPath)) {
                visited.add(resolvedPath);
                onJsDependency(resolvedPath, imported);
            }
        }
    }
}
