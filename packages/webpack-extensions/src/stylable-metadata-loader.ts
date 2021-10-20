import { Stylable, processNamespace, MinimalFS } from '@stylable/core';
import findConfig from 'find-config';
import type { LoaderDefinition } from 'webpack';
import { createMetadataForStylesheet } from './create-metadata-stylesheet';

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

const metadataLoader: LoaderDefinition = function (content) {
    const { resolveNamespace, exposeNamespaceMapping }: LoaderOptions = {
        ...defaultOptions,
        ...this.getOptions(),
        ...getLocalConfig(this.rootContext),
    };

    stylable =
        stylable ||
        Stylable.create({
            projectRoot: this.rootContext,
            fileSystem: this.fs as unknown as MinimalFS,
            mode: this._compiler!.options.mode === 'development' ? 'development' : 'production',
            resolveOptions: this._compiler!.options.resolve,
            timedCacheOptions: { useTimer: true, timeout: 1000 },
            resolveNamespace,
        });

    const { usedMeta, ...output } = createMetadataForStylesheet(
        stylable,
        content,
        this.resourcePath,
        exposeNamespaceMapping
    );

    for (const [meta] of usedMeta) {
        this.addDependency(meta.source);
    }

    return 'export default ' + JSON.stringify(output);
};

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

export default metadataLoader;
