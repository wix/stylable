import { createElement } from 'react';
// import * as path from 'path';
// import { RawSource } from 'webpack-sources';
import { renderToStaticMarkup } from 'react-dom/server';
import * as webpack from 'webpack';
// import { getCSSComponentLogicModule } from '../stylable-module-helpers';``

export class HTMLSnapshotPlugin {
  public apply(compiler: webpack.Compiler) {
    compiler.hooks.compilation.tap('HTMLSnapshotPlugin', compilation => {
      compilation.hooks.optimizeModules.tap(
        'HTMLSnapshotPlugin',
        modules => {
          modules.forEach(this.handleModule);
        }
      );

    });
  }
  public handleModule(module: any) {
    if (module.type === 'stylable') {
      // const component = getCSSComponentLogicModule(module);
      // if (component) {
      //   this.renderComponentHTML(component);
      // }
    }
  }
  public renderComponentHTML(componentModule: any) {
    const mod = require(componentModule.resource);
    return renderToStaticMarkup(createElement(mod));
  }
}
