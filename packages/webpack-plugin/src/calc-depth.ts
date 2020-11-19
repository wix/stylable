import { join, parse } from 'path';
import { Module, ModuleGraph, NormalModule } from 'webpack';
import { isStylableModule, uniqueFilterMap } from './plugin-utils';

export interface DepthResults {
    id: string;
    depth: number;
    deps: Set<Module>;
}

export function calcDepth(
    module: Module,
    moduleGraph: ModuleGraph,
    path: Module[] = [],
    cache = new Map<Module, number>()
): number {
    let cssDepth = 0;

    if (cache.has(module)) {
        return cache.get(module)!;
    }

    if (path.includes(module)) {
        return 0;
    }

    path = path.concat(module);

    const dependencies = uniqueFilterMap(
        moduleGraph.getOutgoingConnections(module),
        ({ module }) => module
    );

    for (const dependencyModule of dependencies) {
        cssDepth = Math.max(cssDepth, calcDepth(dependencyModule, moduleGraph, path, cache));
    }

    if (isStylableModule(module)) {
        const view = getCSSViewModules(module, moduleGraph);
        if (view) {
            cssDepth = Math.max(cssDepth, calcDepth(view, moduleGraph, path, cache));
        }
        cssDepth++;
    }

    cache.set(module, cssDepth);

    return cssDepth;
}

export function getCSSViewModules(
    module: Module,
    moduleGraph: ModuleGraph
): NormalModule | undefined {
    if (isStylableModule(module)) {
        const viewPath = module.resource.replace(/\.st\.css$/, '');

        const parentViews = uniqueFilterMap(
            moduleGraph.getIncomingConnections(module),
            ({ originModule }) => {
                const { dir, name } = parse((originModule as NormalModule)?.resource || '');
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
                    module.resource
                } has multiple components entries [${parentViewsList.map((m) => m.resource)}] `
            );
        }
        return parentViewsList[0];
    }
    return undefined;
}
