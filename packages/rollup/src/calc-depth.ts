import { join, parse } from 'path';
import { PluginContext } from 'rollup';

function isStylableModule(moduleId: string) {
    return moduleId.endsWith('.st.css');
}

export function calcDepth(
    module: string,
    context: PluginContext,
    path: string[] = [],
    cache = new Map<typeof module, number>()
): number {
    let cssDepth = 0;
    if (cache.has(module)) {
        return cache.get(module)!;
    }

    if (path.includes(module)) {
        return 0;
    }

    path = path.concat(module);

    const dependencies = context.getModuleInfo(module).importedIds;

    for (const dependencyModule of dependencies) {
        cssDepth = Math.max(cssDepth, calcDepth(dependencyModule, context, path, cache));
    }

    if (isStylableModule(module)) {
        const view = getCSSViewModules(module, context);
        if (view) {
            cssDepth = Math.max(cssDepth, calcDepth(view, context, path, cache));
        }
        cssDepth++;
    }

    cache.set(module, cssDepth);

    return cssDepth;
}

export function getCSSViewModules(module: string, context: PluginContext) {
    if (isStylableModule(module)) {
        const viewPath = module.replace(/\.st\.css$/, '');

        const parentViewsList = context.getModuleInfo(module).importers.filter((importer) => {
            const { dir, name } = parse(importer);
            if (!isStylableModule(importer) && join(dir, name) === viewPath) {
                return true;
            }
            return false;
        });

        if (parentViewsList.length > 1) {
            throw new Error(
                `Stylable Component Conflict:\n${
                    module
                } has multiple components entries [${parentViewsList}] `
            );
        }
        return parentViewsList[0];
    }
    return undefined;
}
