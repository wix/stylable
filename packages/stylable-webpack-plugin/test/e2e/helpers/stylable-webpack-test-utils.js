const renderer = require("../../../src/runtime/css-runtime-renderer");
const stylesheet = require("../../../src/runtime/css-runtime-stylesheet");

function findModule(modules, contextPath) {
  return modules.find(
    module =>
      module.type === "stylable" &&
      normalizeModuleResource(module) === contextPath
  );
}

function normalizeModuleResource(m) {
  return m.resource && m.resource.replace(m.context, "").replace(/\\/g, "/");
}

function evalAssetModule(assetModule, publicPath = "") {
  const code = assetModule.originalSource().source();
  const _module = { exports: {} };
  const moduleFactory = new Function(
    ["module", "exports", "__webpack_public_path__"],
    code
  );
  moduleFactory(_module, _module.exports, publicPath);
  return _module.exports;
}

function evalStylableModule(stylableModule, requireFunction) {
  const code = stylableModule._cachedSource.source();
  // const assets = stylableModule.dependencies.filter(
  //   dep => dep instanceof StylableAssetDependency
  // );
  // const assetsModules = assets.map(({ module }) => module).filter(Boolean);
  // evalStylableModule(assetsModule, requireAssetsFactory(assetsModules));

  const _module = { exports: {} };
  const moduleFactory = new Function(
    ["module", "exports", "__webpack_require__"],
    code
  );
  const customRequire = id => {
    if (id.match(/css-runtime-renderer.js$/)) {
      return new renderer.RuntimeRenderer();
    }
    if (id.match(/css-runtime-stylesheet.js$/)) {
      return stylesheet;
    }
    if (!requireFunction) {
      throw new Error(
        "evalStylableModule: requireFunction missing in test with javascript files or assets"
      );
    }
    return requireFunction(id);
  };
  moduleFactory(_module, _module.exports, customRequire);
  return _module.exports.default;
}

function configLoadAssets() {
  return [
    {
      test: /\.(png|jpg|gif)$/,
      use: [
        {
          loader: "url-loader",
          options: {
            limit: 300
          }
        }
      ]
    }
  ];
}

function requireAssetsFactory(assetsModules) {
  return function(id) {
    const ass = assetsModules.find(module => module.id === id);
    const assetHash = evalAssetModule(module);
    return assetHash;
  };
}

module.exports = {
  findModule,
  configLoadAssets,
  normalizeModuleResource,
  evalStylableModule,
  evalAssetModule
};
