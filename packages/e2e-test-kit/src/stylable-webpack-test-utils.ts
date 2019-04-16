import { RuntimeRenderer } from '@stylable/runtime';
import * as stylesheet from '@stylable/runtime';

export interface MinimalModule {
  type: string;
  context: string;
  resource?: string;
  id?: string | number;
  originalSource: () => any;
}

export interface MinimalStylableModule extends MinimalModule {
  type: 'stylable';
}

export function findModule(modules: MinimalModule[], contextPath: string) {
  return modules.find(
    module =>
      module.type === 'stylable' &&
      normalizeModuleResource(module) === contextPath
  );
}

export function normalizeModuleResource(m: MinimalModule) {
  return m.resource && m.resource.replace(m.context, '').replace(/\\/g, '/');
}

export function evalAssetModule(assetModule: MinimalModule, publicPath = ''): any {
  const code = assetModule.originalSource().source();
  const _module = { exports: {} };
  const moduleFactory = new Function(
    'module', 'exports', '__webpack_public_path__',
    code
  );
  moduleFactory(_module, _module.exports, publicPath);
  return _module.exports;
}

export function evalStylableModule(stylableModule: MinimalStylableModule, requireFunction: (id: string) => any) {

  const code = (stylableModule as any)._cachedSource.source();
  // const assets = stylableModule.dependencies.filter(
  //   dep => dep instanceof StylableAssetDependency
  // );
  // const assetsModules = assets.map(({ module }) => module).filter(Boolean);
  // evalStylableModule(assetsModule, requireAssetsFactory(assetsModules));

  const _module = { exports: { default: undefined } };
  const moduleFactory = new Function(
    'module', 'exports', '__webpack_require__',
    code
  );
  const customRequire = (id: string) => {
    if (id.match(/@stylable\/runtime$/)) {
      return new RuntimeRenderer();
    }
    if (id.match(/css-runtime-stylesheet.js$/)) {
      return stylesheet;
    }
    if (!requireFunction) {
      throw new Error(
        `evalStylableModule("${id}"): requireFunction missing in test with javascript files or assets`
      );
    }
    return requireFunction(id);
  };
  moduleFactory(_module, _module.exports, customRequire);
  return _module.exports.default;
}

export function configLoadAssets() {
  return [
    {
      test: /\.(png|jpg|gif)$/,
      use: [
        {
          loader: 'url-loader',
          options: {
            limit: 300
          }
        }
      ]
    }
  ];
}

// function requireAssetsFactory(assetsModules: MinimalModule[]) {
//   return function (id: string) {
//     const ass = assetsModules.find(module => module.id === id);
//     const assetHash = evalAssetModule(module);
//     return assetHash;
//   };
// }
