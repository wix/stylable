import path from 'path';
import webpack from 'webpack';
import { CalcResult, StylableModule } from './types';

type MultiMap<K extends object, V> = Map<K, V> | WeakMap<K, V>;

export function calculateModuleDepthAndShallowStylableDependencies(
    module: StylableModule,
    cssDependencies: StylableModule[] = [],
    path: StylableModule[] = [],
    cache: MultiMap<StylableModule, CalcResult> = new Map()
) {
    const cachedResults = cache.get(module);
    if (cachedResults) {
        return cachedResults;
    }
    if (!module || path.includes(module)) {
        return { depth: 0, cssDependencies };
    }
    const { dependencies, reasons, type } = module;
    const isCSS = type === 'stylable';

    // +1 for CSS
    const selfDepth = isCSS ? 1 : 0;
    let jsDepth = 0;
    let cssDepth = 0;

    // max(CSS deep)
    if (dependencies) {
        const stylableModulesDepth = (dependencies
            .map(dep => dep.module)
            .filter(Boolean) as StylableModule[]).map(
            getDependenciesModuleDepth(path, cssDependencies, module, cache)
        );
        cssDepth = stylableModulesDepth.length ? Math.max(...stylableModulesDepth) : 0;
    }

    // Component depth
    if (reasons && isCSS) {
        const view = getCSSComponentLogicModule(module);

        if (view) {
            jsDepth = calculateModuleDepthAndShallowStylableDependencies(
                view,
                cssDependencies,
                path.concat(module),
                cache
            ).depth;
            cache.delete(view);
        }
    }

    const result = {
        depth: selfDepth + Math.max(cssDepth, jsDepth),
        cssDependencies
    };

    cache.set(module, result);

    return result;
}

function getDependenciesModuleDepth(
    path: StylableModule[] = [],
    cssDependencies: StylableModule[] = [],
    module: StylableModule,
    cache: MultiMap<StylableModule, CalcResult> = new Map()
) {
    return (dependencyModule: StylableModule) => {
        if (path.includes(dependencyModule)) {
            return 0;
        }
        const isCSSDep = dependencyModule && dependencyModule.type === 'stylable';
        const innerDeps = isCSSDep ? [] : cssDependencies;
        if (isCSSDep) {
            cssDependencies.push(dependencyModule);
        }
        return calculateModuleDepthAndShallowStylableDependencies(
            dependencyModule,
            innerDeps,
            path.concat(module),
            cache
        ).depth;
    };
}

export function getCSSComponentLogicModule(stylableModule: StylableModule) {
    const name = stylableModule.resource.replace(/\.st\.css$/, '');

    const views = stylableModule.reasons
        .filter(({ module: _module }) => {
            return (
                _module &&
                _module.type !== 'stylable' &&
                _module.resource &&
                // eslint-disable-next-line @typescript-eslint/prefer-string-starts-ends-with
                _module.resource.slice(0, -1 * path.extname(_module.resource).length) === name
            );
        })
        .map(({ module }) => module);
    const set = new Set(views);
    if (set.size > 1) {
        throw new Error(
            `Stylable Component Conflict:\n ${
                stylableModule.resource
            } has multiple components entries [${Array.from(set).map(m => m.resource)}] `
        );
    }
    return views[0];
}

export function getDeepCSSDependencies(
    m: StylableModule,
    onlyUsed = true,
    deps = new Set<StylableModule>(),
    origin = m
) {
    if (!deps.has(m)) {
        m.buildInfo.runtimeInfo.cssDependencies.forEach(dep => {
            if (origin !== dep) {
                getDeepCSSDependencies(dep, onlyUsed, deps, origin);
                if (onlyUsed && !dep.buildInfo.isImportedByNonStylable) {
                    return;
                }
                deps.add(dep);
            }
        });
    }
    return deps;
}

export function getStylableModulesFromDependencies(
    dependencies: Array<{ module: StylableModule }>
) {
    const modules: StylableModule[] = [];
    dependencies.forEach(({ module }) => {
        if (module.type === 'stylable') {
            modules.push(module);
        }
    });
    return modules;
}

export function getStylableModulesFromCompilation(compilation: webpack.compilation.Compilation) {
    const modules: StylableModule[] = [];
    compilation.modules.forEach(module => {
        if (module.type === 'stylable') {
            modules.push(module);
        }
    });
    return modules;
}

export function findStylableComponents(stylableModules: StylableModule[]) {
    return stylableModules
        .map(m => {
            return { logicModule: getCSSComponentLogicModule(m), stylableModule: m };
        })
        .filter(({ logicModule }) => logicModule);
}

export function sortedStylableModulesByDepth(modules: StylableModule[]) {
    modules.sort((a, b) => a.buildInfo.runtimeInfo.depth - b.buildInfo.runtimeInfo.depth);
    return modules;
}

export function renderStaticCSS(
    modules: any,
    mainTemplate: any,
    hash: any,
    filter: (item: any) => boolean = Boolean
): string[] {
    const modulesByDepth = sortedStylableModulesByDepth(modules.filter(filter));
    const cssSources = modulesByDepth.map(module => {
        const publicPath = mainTemplate.getPublicPath({
            hash
        });
        return (module as any).generator.toCSS(module, (assetModule: any) => {
            const source = assetModule.originalSource().source();
            const getStaticPath = new Function(
                '__webpack_public_path__',
                'var module = {}; return ' + source.replace('export default', 'module.exports = ')
            );
            return JSON.stringify(getStaticPath(publicPath));
        });
    });
    return cssSources;
}
