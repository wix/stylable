import type webpack from 'webpack';
import { RawSource } from 'webpack-sources';
import { createMetadataForStylesheet } from './create-metadata-stylesheet';
import { Stylable } from '@stylable/core';
import { resolveNamespace } from '@stylable/node';
import { hashContent } from './hash-content-util';
import { basename } from 'path';
import { EOL } from 'os';

export interface Options {
    contentHashLength?: number;
    exposeNamespaceMapping: boolean;
    resolveNamespace(namespace: string, filePath: string): string;
    filterComponents(resourcePath: string): boolean;
    getCompId(resourcePath: string): string;
    getOutputFileName(contentHash: string): string;
}

export interface Metadata {
    entry: string;
    stylesheetMapping: Record<string, string>;
    namespaceMapping?: Record<string, string>;
}

export interface Manifest {
    stylesheetMapping: Record<string, string>;
    namespaceMapping: Record<string, string>;
    componentsEntries: Record<string, string>;
    componentsIndex: string;
}

const defaultOptions: Options = {
    resolveNamespace,
    exposeNamespaceMapping: true,
    filterComponents(resourcePath) {
        return resourcePath.endsWith('.comp.st.css');
    },
    getCompId(resourcePath) {
        return basename(resourcePath).replace(/\.comp\.st\.css$/, '');
    },
    getOutputFileName(contentHash) {
        return `stylable.manifest.${contentHash}.json`;
    },
};

export class StylableManifestPlugin {
    private options: Options;
    constructor(options: Partial<Options> = {}) {
        this.options = Object.assign({}, defaultOptions, options);
    }
    public apply(compiler: webpack.Compiler) {
        const stylable = Stylable.create({
            projectRoot: compiler.context,
            fileSystem: {
                readlinkSync: (filePath) => compiler.inputFileSystem.readlinkSync(filePath),
                statSync: (filePath) => compiler.inputFileSystem.statSync(filePath),
                readFileSync: (filePath) =>
                    compiler.inputFileSystem.readFileSync(filePath).toString(),
            },
            mode: compiler.options.mode === 'development' ? 'development' : 'production',
            resolveOptions: compiler.options.resolve as any /* make stylable types better */,
            timedCacheOptions: { useTimer: true, timeout: 1000 },
            resolveNamespace: this.options.resolveNamespace,
        });

        let metadata: Array<{ compId: string; metadata: Metadata }>;
        compiler.hooks.compilation.tap(this.constructor.name, (compilation) => {
            compilation.hooks.optimizeModules.tap(this.constructor.name, (modules) => {
                metadata = this.createModulesMetadata(compiler, stylable, modules);
            });
        });

        compiler.hooks.emit.tap(this.constructor.name, (compilation) =>
            this.emitManifest(metadata, compilation)
        );
    }
    private emitManifest(
        metadata: { compId: string; metadata: Metadata }[],
        compilation: webpack.compilation.Compilation
    ) {
        const manifest = metadata.reduce<Manifest>(
            (manifest, { compId, metadata }) => {
                Object.assign(manifest.stylesheetMapping, metadata.stylesheetMapping);
                Object.assign(manifest.namespaceMapping, metadata.namespaceMapping);
                manifest.componentsEntries[compId] = metadata.entry;
                manifest.componentsIndex += `:import{-st-from: ${JSON.stringify(
                    metadata.entry
                )};-st-default: ${compId};} ${compId}{}${EOL}`;
                return manifest;
            },
            {
                componentsIndex: '',
                componentsEntries: {},
                stylesheetMapping: {},
                namespaceMapping: {},
            }
        );

        const manifestContent = JSON.stringify(manifest);

        const contentHash = hashContent(manifestContent, this.options.contentHashLength);

        compilation.assets[this.options.getOutputFileName(contentHash)] = new RawSource(
            manifestContent
        );
    }

    private createModulesMetadata(
        compiler: webpack.compiler.Compiler,
        stylable: Stylable,
        modules: webpack.compilation.Module[]
    ) {
        const stylableComps = modules.filter((module) => {
            const resource = (module as any).resource;
            return resource && this.options.filterComponents(resource);
        });

        return stylableComps.map((module) => {
            const resource = (module as any).resource;
            const source = compiler.inputFileSystem.readFileSync(resource).toString();

            return {
                compId: this.options.getCompId(resource),
                metadata: createMetadataForStylesheet(
                    stylable,
                    source,
                    resource,
                    this.options.exposeNamespaceMapping
                ),
            };
        });
    }
}
