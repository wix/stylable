import { Stylable, StylableMeta, processNamespace } from '@stylable/core';
import findConfig from 'find-config';
import type { LoaderContext } from '@stylable/webpack-plugin';
import { createMetadataForStylesheet, ResolvedImport } from './create-metadata-stylesheet';

const { getOptions } = require('loader-utils');

let stylable: Stylable;
const getLocalConfig = loadLocalConfigLoader();

export interface LoaderOptions {
    exposeNamespaceMapping: boolean;
    resolveNamespace(namespace: string, filePath: string): string;
}

const defaultOptions: LoaderOptions = {
    resolveNamespace: processNamespace,
    exposeNamespaceMapping: false,
};

export const metadataLoaderLocation = __filename;

export default function metadataLoader(this: LoaderContext, content: string) {
    const { resolveNamespace, exposeNamespaceMapping }: LoaderOptions = {
        ...defaultOptions,
        ...getOptions(this),
        ...getLocalConfig(this.rootContext),
    };

    stylable =
        stylable ||
        Stylable.create({
            projectRoot: this.rootContext,
            fileSystem: this.fs,
            mode: this._compiler.options.mode === 'development' ? 'development' : 'production',
            resolveOptions: this._compiler.options.resolve as any /* make stylable types better */,
            timedCacheOptions: { useTimer: true, timeout: 1000 },
            resolveNamespace,
        });

    const { usedMeta, ...output } = createMetadataForStylesheet(
        stylable,
        content,
        this.resourcePath,
        exposeNamespaceMapping
    );

    addWebpackWatchDependencies(this, usedMeta);

    return 'export default ' + JSON.stringify(output);
}

function loadLocalConfigLoader() {
    const localConfig = new Map<string, Partial<LoaderOptions>>();
    return (cwd: string): Partial<LoaderOptions> => {
        if (localConfig.has(cwd)) {
            return localConfig.get(cwd)!;
        }
        let config: Partial<LoaderOptions>;
        try {
            config = findConfig.require('stylable.config', { cwd }).metadataLoader;
        } catch (e) {
            config = {};
        }
        localConfig.set(cwd, config);
        return config;
    };
}

function addWebpackWatchDependencies(
    ctx: LoaderContext,
    usedMeta: Map<StylableMeta, ResolvedImport[]>
) {
    for (const [meta] of usedMeta) {
        ctx.addDependency(meta.source);
    }
}
