const path = require('path');

function calculateModuleDepthAndShallowStylableDependencies(
    module,
    cssDependencies = [],
    path = [],
    cache = new Map()
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
        const stylableModulesDepth = dependencies
            .map(dep => dep.module)
            .filter(Boolean)
            .map(getDependenciesModuleDepth(path, cssDependencies, module, cache));
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

function getDependenciesModuleDepth(path, cssDependencies, module, cache) {
    return dependencyModule => {
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

function getCSSComponentLogicModule(stylableModule) {
    const name = stylableModule.resource.replace(/\.st\.css$/, '');

    const views = stylableModule.reasons
        .filter(({ module: _module }) => {
            return (
                _module &&
                _module.type !== 'stylable' &&
                _module.resource &&
                _module.resource.slice(0, -path.extname(_module.resource).length) === name
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

function getDeepCSSDependencies(m, deps = new Set(), origin = m) {
    if (!deps.has(m)) {
        m.buildInfo.runtimeInfo.cssDependencies.forEach(dep => {
            if (origin !== dep) {
                getDeepCSSDependencies(dep, deps, origin);
                deps.add(dep);
            }
        });
    }
    return deps;
}

function getStylableModulesFromDependencies(dependencies) {
    const modules = [];
    dependencies.forEach(({module}) => {
        if (module.type === 'stylable') {
            modules.push(module);
        }
    });
    return modules;
}

function getStylableModulesFromCompilation(compilation) {
    const modules = [];
    compilation.modules.forEach((module) => {
        if (module.type === 'stylable') {
            modules.push(module);
        }
    });
    return modules;
}

function findStylableComponents(stylableModules) {
    return stylableModules
        .map(m => {
            return {logicModule: getCSSComponentLogicModule(m), stylableModule: m};
        })
        .filter(({logicModule})=>logicModule);
}

function sortedStylableModulesByDepth(modules) {
    modules.sort((a, b) => a.buildInfo.runtimeInfo.depth - b.buildInfo.runtimeInfo.depth);
    return modules;
}

function renderStaticCSS(modules, mainTemplate, hash, filter = Boolean) {
    const modulesByDepth = sortedStylableModulesByDepth(modules.filter(filter));
    const cssSources = modulesByDepth.map(module => {
        const publicPath = mainTemplate.getPublicPath({
            hash
        });
        return module.generator.toCSS(module, assetModule => {
            const source = assetModule.originalSource().source();
            const getStaticPath = new Function(
                ['__webpack_public_path__'],
                'var module = {}; return ' + source
            );
            return JSON.stringify(getStaticPath(publicPath));
        });
    });
    return cssSources;
}

exports.getDeepCSSDependencies = getDeepCSSDependencies;
exports.findStylableComponents = findStylableComponents;
exports.getStylableModulesFromCompilation = getStylableModulesFromCompilation;
exports.renderStaticCSS = renderStaticCSS;
exports.sortedStylableModulesByDepth = sortedStylableModulesByDepth;
exports.getStylableModulesFromDependencies = getStylableModulesFromDependencies;
exports.getCSSComponentLogicModule = getCSSComponentLogicModule;
exports.calculateModuleDepthAndShallowStylableDependencies = calculateModuleDepthAndShallowStylableDependencies;
