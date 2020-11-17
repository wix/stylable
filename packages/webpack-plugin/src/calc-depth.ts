import { join, parse } from 'path';
import { Module, ModuleGraph, NormalModule } from 'webpack';
import { isStylableModule, uniqueFilterMap } from './plugin-utils';

export interface DepthResults {
    id: string;
    depth: number;
    deps: Set<Module>;
}

export function calcDepth(
    start: Module,
    moduleGraph: ModuleGraph,
    path: Module[] = [],
    cache = new Map<Module, number>()
): number {
    let cssDepth = 0;

    if (cache.has(start)) {
        return cache.get(start)!;
    }

    if (path.includes(start)) {
        return 0;
    }

    path = path.concat(start);

    const dependencies = uniqueFilterMap(
        moduleGraph.getOutgoingConnections(start),
        ({ module }) => module
    );

    for (const dependencyModule of dependencies) {
        cssDepth = Math.max(cssDepth, calcDepth(dependencyModule, moduleGraph, path, cache));
    }

    if (isStylableModule(start)) {
        const viewPath = start.resource.replace(/\.st\.css$/, '');

        const parentViews = uniqueFilterMap(
            moduleGraph.getIncomingConnections(start),
            ({ originModule }) => {
                const { dir, name } = parse((originModule as NormalModule).resource || '');
                if (!isStylableModule(originModule) && join(dir, name) === viewPath) {
                    return originModule as NormalModule;
                }
                return null;
            }
        );
        const parentViewsList = [...parentViews];
        if (parentViewsList.length > 1) {
            throw new Error(
                `Stylable Component Conflict:\n ${
                    start.resource
                } has multiple components entries [${parentViewsList.map((m) => m.resource)}] `
            );
        } else if (parentViewsList.length === 1) {
            cssDepth = Math.max(cssDepth, calcDepth(parentViewsList[0], moduleGraph, path, cache));
        }
        cssDepth++;
    }

    cache.set(start, cssDepth);

    return cssDepth;
}
