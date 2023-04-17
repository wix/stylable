import type { Plugin, PluginBuild } from 'esbuild';
import { Stylable, StylableResults } from '@stylable/core';
import { resolveNamespace } from '@stylable/node';
import decache from 'decache';
import fs from 'fs';
import { generateStylableJSModuleSource } from '@stylable/module-utils';

const namespaces = {
    exports: 'stylable-exports',
    css: 'stylable-css',
};

interface ESBuildOptions {
    resolveNamespace?: typeof resolveNamespace;
}

export const stylablePlugin = (options: ESBuildOptions = {}): Plugin => ({
    name: 'esbuild-stylable-plugin',
    setup(build: PluginBuild) {

        build.initialOptions.metafile = true;

        const requireModule = createDecacheRequire(build);
        const stylable = new Stylable({
            fileSystem: fs,
            projectRoot: build.initialOptions.absWorkingDir || process.cwd(),
            requireModule,
            resolveNamespace: options.resolveNamespace || resolveNamespace,
        });

        build.onStart(() => {
            stylable.initCache();
        });

        build.onResolve({ filter: /\.st\.css$/ }, (args) => {
            if (args.namespace === namespaces.exports) {
                return {
                    path: args.path,
                    pluginData: args.pluginData,
                    namespace: namespaces.css,
                };
            }

            return {
                path: stylable.resolvePath(args.resolveDir, args.path),
                namespace: namespaces.exports,
            };
        });

        build.onLoad({ filter: /.*/, namespace: namespaces.exports }, (args) => {
            const res = stylable.transform(args.path);
            const moduleCode = generateStylableJSModuleSource({
                header: `import ${JSON.stringify(args.path)};`,
                namespace: res.meta.namespace,
                imports: [],
                jsExports: res.exports,
                moduleType: 'esm',
                runtimeRequest: '@stylable/runtime/esm/pure',
            });
            return {
                resolveDir: '.',
                contents: moduleCode,
                pluginData: { stylableResults: res },
            };
        });

        build.onLoad({ filter: /.*/, namespace: namespaces.css }, (args) => {
            const { meta } = args.pluginData.stylableResults as StylableResults;
            return {
                resolveDir: '.',
                contents: meta.targetAst!.toString(),
                loader: 'css',
            };
        });

        build.onEnd((a) => {
            console.log(a);
            debugger;
        });
    },
});

function createDecacheRequire(build: PluginBuild) {
    const cacheIds = new Set<string>();
    build.onStart(() => {
        for (const id of cacheIds) {
            decache(id);
        }
        cacheIds.clear();
    });
    return (id: string) => {
        cacheIds.add(id);
        return require(id);
    };
}
