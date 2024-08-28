import { basename, join } from 'path';
import type { Module, Compiler, Compilation, ModuleGraph, NormalModule } from 'webpack';
import { compileAsEntry, exec } from './compile-as-entry';

import {
    getCSSViewModuleWebpack,
    isStylableModule,
    uniqueFilterMap,
} from '@stylable/webpack-plugin';

export type GetLogicModule = (module: Module, moduleGraph: ModuleGraph) => NormalModule | undefined;

export interface HTMLSnapshotPluginOptions {
    outDir: string;
    render: (componentModule: any, component: any) => string | false;
    /**
     * By default, gets component logic related to the stylesheet being imported. E.g., you
     * have stylesheet `a.st.css`, which is imported by a few files. By default, this method
     * will attempt to find `a.tsx`.
     */
    getLogicModule?: GetLogicModule;
}

export class HTMLSnapshotPlugin {
    private outDir: string;
    private render: (componentModule: any, component: any) => string | false;
    private userGetLogicModule: GetLogicModule | undefined;
    constructor(options: Partial<HTMLSnapshotPluginOptions>) {
        this.outDir = options.outDir || '';
        this.render = options.render || (() => false);
        this.userGetLogicModule = options.getLogicModule;
    }
    public apply(compiler: Compiler) {
        compiler.hooks.thisCompilation.tap('HTMLSnapshotPlugin', (compilation) => {
            compilation.hooks.additionalAssets.tapPromise('HTMLSnapshotPlugin', async () => {
                const stylableModules = uniqueFilterMap(compilation.modules, (m) => {
                    return isStylableModule(m) ? m : null;
                });
                const getLogicModule =
                    this.userGetLogicModule || getCSSViewModuleWebpack(compilation.moduleGraph);
                for (const module of stylableModules) {
                    await this.snapShotStylableModule(compilation, module, getLogicModule);
                }
            });
        });
    }
    private async snapShotStylableModule(
        compilation: Compilation,
        module: Module,
        getLogicModule: GetLogicModule,
    ) {
        const component = getLogicModule(module, compilation.moduleGraph);
        if (!component || !component.context) {
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
            '.snapshot.html',
        );

        if (!compilation.assets[targetPath]) {
            compilation.assets[targetPath] = new compilation.compiler.webpack.sources.RawSource(
                html,
                false,
            );
        } else {
            compilation.errors.push(
                new Error(
                    `Duplicate component name ${component.resource} target path ${targetPath}`,
                ) as any, // TODO: webpack types
            );
        }
    }
}
