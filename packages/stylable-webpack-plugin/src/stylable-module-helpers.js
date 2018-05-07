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
  const { resource, dependencies, reasons, type } = module;
  const isCSS = type === "stylable";

  // +1 for CSS
  const selfDepth = isCSS ? 1 : 0;
  let jsDepth = 0;
  let cssDepth = 0;

  // max(CSS deep)
  if (dependencies) {
    const stylableModulesDepth = dependencies
      .map(dep => dep.module)
      .map(getDependenciesModuleDepth(path, cssDependencies, module, cache));
    cssDepth = stylableModulesDepth.length
      ? Math.max(...stylableModulesDepth)
      : 0;
  }

  // Component depth
  if (reasons && isCSS) {
    const name = resource.replace(/\.st\.css$/, "");
    const view = getCSSComponentLogicModule(reasons, name);

    if (view) {
      jsDepth = calculateModuleDepthAndShallowStylableDependencies(
        view,
        cssDependencies,
        path.concat(module),
        cache
      ).depth;
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
    const isCSSDep = dependencyModule && dependencyModule.type === "stylable";
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

function getCSSComponentLogicModule(reasons, name) {
  const views = reasons
    .filter(({ module: _module }) => {
      return (
        _module &&
        _module.type !== "stylable" &&
        _module.resource &&
        _module.resource.indexOf(name) !== -1
      );
    })
    .map(({ module }) => module);
  if (new Set(views).size > 1) {
    throw new Error(`only one file with the name ${name} allowed`);
  }
  return views[0];
}

module.exports.calculateModuleDepthAndShallowStylableDependencies = calculateModuleDepthAndShallowStylableDependencies;
