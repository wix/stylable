import { basename, join } from 'path';
// import { createElement } from 'react';
// import * as path from 'path';
// import { RawSource } from 'webpack-sources';
// import { renderToStaticMarkup } from 'react-dom/server';
import * as webpack from 'webpack';
import { RawSource } from 'webpack-sources';
import { compileAsEntry, exec } from './compile-as-entry';

const {
    getCSSComponentLogicModule
} = require('@stylable/webpack-plugin/src/stylable-module-helpers');

export interface HTMLSnapshotPluginOptions {
    outDir: string;
    render: (componentModule: any, component: any) => string | false;
    // TODO: Comment this
    moduleFilterLogic?: (stylableModule: any) => any;
}

export class HTMLSnapshotPlugin {
    private outDir: string;
    private render: (componentModule: any, component: any) => string | false;
    private moduleFilterLogic: (stylableModule: any) => any;

    constructor(options: Partial<HTMLSnapshotPluginOptions>) {
        this.outDir = options.outDir || '';
        this.render = options.render || (() => false);
        this.moduleFilterLogic = options.moduleFilterLogic ? options.moduleFilterLogic : getCSSComponentLogicModule;
    }
    public apply(compiler: webpack.Compiler) {
        compiler.hooks.thisCompilation.tap('HTMLSnapshotPlugin', compilation => {
            compilation.hooks.additionalAssets.tapPromise('HTMLSnapshotPlugin', async () => {
                const stylableModules = compilation.modules.filter(m => m.type === 'stylable');
                for (const module of stylableModules) {
                    await this.snapShotStylableModule(compilation, module);
                }
            });
        });
    }
    public async snapShotStylableModule(compilation: webpack.compilation.Compilation, module: any) {
        const component = this.moduleFilterLogic(module);

        if (!component) {
            return;
        }
        const source = await compileAsEntry(compilation, component.context, component.resource);

        const componentModule = exec(source, component.resource, component.context);

        const html = this.render(componentModule, component);

        if (html === false) {
            return;
        }

        const targetPath = join(this.outDir, basename(component.resource)).replace(
            /\.[^.]+$/,
            '.snapshot.html'
        );

        if (!compilation.assets[targetPath]) {
            compilation.assets[targetPath] = new RawSource(html);
        } else {
            compilation.errors.push(
                new Error(
                    `Duplicate component name ${component.resource} target path ${targetPath}`
                )
            );
        }
    }
}
