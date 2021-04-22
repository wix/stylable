export interface CalcDepthContext<T> {
    getDependencies: (module: T) => Iterable<T>;
    getImporters: (module: T) => Iterable<T>;
    getModulePathNoExt: (module: T) => string;
    isStylableModule: (module: T) => boolean;
}

export function calcDepth<T>(
    module: T,
    context: CalcDepthContext<T>,
    path: T[] = [],
    cache = new Map<T, number>()
): number {
    let cssDepth = 0;
    if (cache.has(module)) {
        return cache.get(module)!;
    }

    if (path.includes(module)) {
        return 0;
    }

    path = path.concat(module);

    const dependencies = context.getDependencies(module);

    for (const dependencyModule of dependencies) {
        cssDepth = Math.max(cssDepth, calcDepth(dependencyModule, context, path, cache));
    }

    if (context.isStylableModule(module)) {
        const view = getCSSViewModule(module, context);
        if (view) {
            cssDepth = Math.max(cssDepth, calcDepth(view, context, path, cache));
            cache.delete(view);
        }
        cssDepth++;
    }

    cache.set(module, cssDepth);

    return cssDepth;
}

export function getCSSViewModule<T>(module: T, context: CalcDepthContext<T>) {
    if (context.isStylableModule(module)) {
        const parentViewsList: T[] = [];
        const viewPath = context.getModulePathNoExt(module);
        for (const importer of context.getImporters(module)) {
            if (
                !context.isStylableModule(importer) &&
                context.getModulePathNoExt(importer) === viewPath
            ) {
                parentViewsList.push(importer);
            }
        }

        if (parentViewsList.length > 1) {
            throw new Error(
                `Stylable Component Conflict:\n${module} has multiple components entries [${parentViewsList}] `
            );
        }
        return parentViewsList[0];
    }
    return undefined;
}
