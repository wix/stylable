import { basename, join } from 'path';
import { sources } from 'webpack';
import { Module, Compiler, Compilation } from 'webpack';
import { compileAsEntry, exec } from './compile-as-entry';

import { getCSSViewModules, isStylableModule, uniqueFilterMap } from '@stylable/webpack-plugin';

const { RawSource } = sources;

export interface HTMLSnapshotPluginOptions {
    outDir: string;
    render: (componentModule: Module, component: any) => string | false;
    /**
     * By default, gets component logic related to the stylesheet being imported. E.g., you
     * have stylesheet `a.st.css`, which is imported by a few files. By default, this method
     * will attempt to find `a.tsx`.
     */
    getLogicModule?: typeof getCSSViewModules;
}

export class HTMLSnapshotPlugin {
    private outDir: string;
    private render: (componentModule: any, component: any) => string | false;
    private getLogicModule: typeof getCSSViewModules;

    constructor(options: Partial<HTMLSnapshotPluginOptions>) {
        this.outDir = options.outDir || '';
        this.render = options.render || (() => false);
        this.getLogicModule = options.getLogicModule || getCSSViewModules;
    }
    public apply(compiler: Compiler) {
        compiler.hooks.thisCompilation.tap('HTMLSnapshotPlugin', (compilation) => {
            compilation.hooks.additionalAssets.tapPromise('HTMLSnapshotPlugin', async () => {
                const stylableModules = uniqueFilterMap(compilation.modules, (m) => {
                    return isStylableModule(m) ? m : null;
                });
                for (const module of stylableModules) {
                    await this.snapShotStylableModule(compilation, module);
                }
            });
        });
    }
    public async snapShotStylableModule(compilation: Compilation, module: any) {
        const component = this.getLogicModule(module, compilation.moduleGraph);
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
            compilation.assets[targetPath] = new RawSource(html, false);
        } else {
            compilation.errors.push(
                new Error(
                    `Duplicate component name ${component.resource} target path ${targetPath}`
                ) as any // TODO: webpack types 
            );
        }
    }
}
