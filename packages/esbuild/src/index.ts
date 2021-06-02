import type { Plugin, PluginBuild } from 'esbuild';
import { Stylable } from '@stylable/core';
import fs from 'fs';

const namespaces = {
    exports: 'stylable-exports',
    css: 'stylable-css',
};

export const stylablePlugin = (): Plugin => ({
    name: 'esbuild-stylable-plugin',
    setup(build: PluginBuild) {
        const stylable = Stylable.create({
            fileSystem: fs,
            projectRoot: '',
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

            const path = stylable.resolvePath(args.resolveDir, args.path);

            return {
                path,
                namespace: namespaces.exports,
            };
        });

        build.onLoad({ filter: /.*/, namespace: namespaces.exports }, (args) => {
            const res = stylable.transform(stylable.process(args.path));

            return {
                resolveDir: '.',
                contents: `
                import { sts, stc } from "@stylable/esbuild/runtime"; 
                import ${JSON.stringify(args.path)};
                export const namespace = ${JSON.stringify(res.meta.namespace)};
                export const classes = ${JSON.stringify(res.exports.classes)};
                export const keyframes = ${JSON.stringify(res.exports.keyframes)};
                export const stVars = ${JSON.stringify(res.exports.stVars)};
                export const vars = ${JSON.stringify(res.exports.vars)};
                export const cssStates = /* @__PURE__ */ stc.bind(namespace);
                export const st = /* @__PURE__ */ sts.bind(namespace);
                export const style = st;
                `,
                pluginData: { stylable: res },
            };
        });

        build.onLoad({ filter: /.*/, namespace: namespaces.css }, (args) => {
            const { meta } = args.pluginData.stylable;
            return {
                contents: meta.outputAst!.toString(),
                loader: 'css',
            };
        });
    },
});
