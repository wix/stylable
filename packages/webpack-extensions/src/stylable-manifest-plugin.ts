import { basename } from 'path';
import { EOL } from 'os';
import webpack from 'webpack';
import { RawSource } from 'webpack-sources';
import { Stylable, StylableMeta } from '@stylable/core';
import { resolveNamespace } from '@stylable/node';
import { createMetadataForStylesheet } from './create-metadata-stylesheet';
import { hashContent } from './hash-content-util';
import { ComponentsMetadata } from './component-metadata-builder';
import { MetadataList, Manifest } from './types';

export interface Options {
    outputType: 'manifest' | 'fs-manifest';
    package: { name: string; version: string };
    packageAlias: Record<string, string>;
    contentHashLength?: number;
    exposeNamespaceMapping: boolean;
    generateNamedExports(compId: string, meta: StylableMeta): string | void;
    resolveNamespace(namespace: string, filePath: string): string;
    filterComponents(resourcePath: string): boolean;
    getCompId(resourcePath: string): string;
    getOutputFileName(contentHash: string): string;
}

const defaultOptions: Options = {
    package: {
        name: 'default-name',
        version: '0.0.0-default',
    },
    outputType: 'manifest',
    packageAlias: {},
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
    generateNamedExports() {
        return void 0;
    },
};

export function generateCssVarsNamedExports(name: string, meta: StylableMeta) {
    return Object.keys(meta.cssVars)
        .map((varName) => `${varName} as --${name}-${varName.slice(2)}`)
        .join(',');
}

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
            resolverCache: new Map(),
            resolveNamespace: this.options.resolveNamespace,
        });

        compiler.hooks.done.tap(this.constructor.name + ' stylable.initCache', () =>
            stylable.initCache()
        );

        let metadataList: MetadataList;
        compiler.hooks.compilation.tap(this.constructor.name, (compilation) => {
            compilation.hooks.optimizeModules.tap(this.constructor.name, (modules) => {
                metadataList = this.createModulesMetadata(compiler, stylable, [...modules]);
            });

            compiler.hooks.emit.tap(this.constructor.name, (compilation) =>
                this.emitManifest(metadataList, compilation)
            );
        });

        compiler.hooks.emit.tap(this.constructor.name, (compilation) =>
            this.emitManifest(metadataList, compilation)
        );
    }
    private emitManifest(metadataList: MetadataList, compilation: webpack.compilation.Compilation) {
        const manifest = metadataList.reduce<Manifest>(
            (manifest, { meta, compId, metadata }) => {
                const cssVars = this.options.generateNamedExports(compId, meta);
                Object.assign(manifest.stylesheetMapping, metadata.stylesheetMapping);
                Object.assign(manifest.namespaceMapping, metadata.namespaceMapping);
                manifest.componentsEntries[compId] = metadata.entry;
                manifest.componentsIndex += `:import{-st-from: ${JSON.stringify(
                    metadata.entry
                )};-st-default: ${compId};${
                    cssVars ? `-st-named:${cssVars};` : ``
                }} ${compId}{}${EOL}`;
                return manifest;
            },
            {
                name: this.options.package.name,
                version: this.options.package.version,
                componentsIndex: '',
                componentsEntries: {},
                stylesheetMapping: {},
                namespaceMapping: {},
            }
        );

        if (this.options.outputType === 'fs-manifest') {
            this.emitJSONAsset(
                convertToFsMetadata(manifest, this.options.packageAlias),
                compilation
            );
        } else {
            this.emitJSONAsset(manifest, compilation);
        }
    }

    private emitJSONAsset(
        manifest: Manifest | ComponentsMetadata,
        compilation: webpack.compilation.Compilation
    ) {
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
    ): MetadataList {
        const stylableComps = modules.filter((module) => {
            const resource = (module as any).resource;
            return resource && this.options.filterComponents(resource);
        });

        return stylableComps.map((module) => {
            const resource = (module as any).resource;
            const source = compiler.inputFileSystem.readFileSync(resource).toString();
            const meta = stylable.fileProcessor.processContent(source, resource);
            return {
                meta,
                compId: this.options.getCompId(resource),
                metadata: createMetadataForStylesheet(
                    stylable,
                    source,
                    resource,
                    this.options.exposeNamespaceMapping,
                    meta
                ),
            };
        });
    }
}

/* This supports the output of previous version of the metadata plugin */
const convertToFsMetadata = (
    manifest: Manifest,
    packages: Record<string, string>
): ComponentsMetadata => {
    const pkg = { name: manifest.name, version: manifest.version };

    const normalizedMetadata: ComponentsMetadata = {
        ...pkg,
        fs: {
            [`/${manifest.name}/index.st.css`]: {
                metadata: {
                    /* naive package name to css class might need to support more characters */
                    namespace: manifest.name.replace(/[@/]/g, '_'),
                },
                content: manifest.componentsIndex,
            },
        },
        components: {},
        packages,
    };
    Object.keys(manifest.stylesheetMapping).forEach((filePath) => {
        normalizedMetadata.fs[filePath] = {
            metadata: {
                namespace: manifest.namespaceMapping[filePath],
            },
            content: manifest.stylesheetMapping[filePath],
        };
    });
    Object.keys(manifest.componentsEntries).forEach((id) => {
        const stylesheetPath = manifest.componentsEntries[id];
        const namespace = manifest.namespaceMapping[stylesheetPath];
        normalizedMetadata.components[id] = {
            id,
            stylesheetPath,
            namespace,
        };
    });
    return normalizedMetadata;
};
