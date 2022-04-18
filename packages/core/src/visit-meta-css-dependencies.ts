import type { StylableMeta } from './stylable-meta';
import type { Imported } from './features';
import type { StylableResolver } from './stylable-resolver';

export interface CSSDependency {
    kind: 'css';
    resolvedPath: string;
    imported: Imported;
    depth: number;
    meta: StylableMeta;
}

export interface JSDependency {
    kind: 'js';
    resolvedPath: string;
    imported: Imported;
}

export type Dependency = CSSDependency | JSDependency;

export function* visitMetaCSSDependencies({
    meta,
    resolver,
}: {
    meta: StylableMeta;
    resolver: StylableResolver;
}) {
    const visited = new Set<string>([meta.source]);
    const q = [[...meta.getImportStatements()]];
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
                const dependency: CSSDependency = {
                    kind: 'css',
                    depth: depth + 1,
                    meta: res.meta,
                    resolvedPath: res.meta.source,
                    imported,
                };

                yield dependency;

                q[depth + 1].push(...res.meta.getImportStatements());
            } else if (res?._kind === 'js') {
                const resolvedPath = resolver.resolvePath(imported.context, imported.request);

                if (!visited.has(resolvedPath)) {
                    visited.add(resolvedPath);
                    const dependency: JSDependency = {
                        kind: 'js',
                        imported,
                        resolvedPath,
                    };

                    yield dependency;
                }
            }
        }
    }
}
