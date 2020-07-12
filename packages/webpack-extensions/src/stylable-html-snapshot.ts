import { basename, join } from 'path';
import type webpack from 'webpack';
import { RawSource } from 'webpack-sources';
import { compileAsEntry, exec } from './compile-as-entry';

import { getCSSComponentLogicModule } from '@stylable/webpack-plugin';

export interface HTMLSnapshotPluginOptions {
    outDir: string;
    render: (componentModule: any, component: any) => string | false;
    /**
     * By default, gets component logic related to the stylesheet being imported. E.g., you
     * have stylesheet `a.st.css`, which is imported by a few files. By default, this method
     * will attempt to find `a.tsx`.
     */
    getLogicModule?: (stylableModule: any) => any;
}

export class HTMLSnapshotPlugin {
    private outDir: string;
    private render: (componentModule: any, component: any) => string | false;
    private getLogicModule: (stylableModule: any) => any;

    constructor(options: Partial<HTMLSnapshotPluginOptions>) {
        this.outDir = options.outDir || '';
        this.render = options.render || (() => false);
        this.getLogicModule = options.getLogicModule || getCSSComponentLogicModule;
    }
    public apply(compiler: webpack.Compiler) {
        compiler.hooks.thisCompilation.tap('HTMLSnapshotPlugin', (compilation) => {
            compilation.hooks.additionalAssets.tapPromise('HTMLSnapshotPlugin', async () => {
                const stylableModules = compilation.modules.filter((m) => m.type === 'stylable');
                for (const module of stylableModules) {
                    await this.snapShotStylableModule(compilation, module);
                }
            });
        });
    }
    public async snapShotStylableModule(compilation: webpack.compilation.Compilation, module: any) {
        const component = this.getLogicModule(module);

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
