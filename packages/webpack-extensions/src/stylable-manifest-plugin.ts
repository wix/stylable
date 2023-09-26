import { Stylable, StylableMeta, createLegacyResolver } from '@stylable/core';
import { STSymbol } from '@stylable/core/dist/index-internal';
import { resolveNamespace } from '@stylable/node';
import { createMetadataForStylesheet } from './create-metadata-stylesheet';
import { hashContent } from './hash-content-util';
import { basename } from 'path';
import { EOL } from 'os';
import type { Compilation, Compiler, Module } from 'webpack';
import type { ComponentsMetadata } from './component-metadata-builder';
import type { Manifest, MetadataList } from './types';

export interface Options {
    outputType: 'manifest' | 'fs-manifest';
    package: { name: string; version: string };
    packageAlias: Record<string, string>;
    contentHashLength?: number;
    exposeNamespaceMapping: boolean;
    generateCSSVarsExports: boolean;
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
    generateCSSVarsExports: false,
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

function generateCssVarsNamedExports(name: string, meta: StylableMeta) {
    return Object.keys(STSymbol.getAllByType(meta, `cssVar`))
        .map((varName) => `${varName} as --${name}-${varName.slice(2)}`)
        .join(',');
}

export class StylableManifestPlugin {
    private options: Options;
    constructor(options: Partial<Options> = {}) {
        this.options = Object.assign({}, defaultOptions, options);
    }
    public apply(compiler: Compiler) {
        const fs = {
            readlinkSync: (filePath: string) =>
                (compiler.inputFileSystem as any).readlinkSync(filePath),
            statSync: (filePath: string) => (compiler.inputFileSystem as any).statSync(filePath),
            readFileSync: (filePath: string) =>
                (compiler.inputFileSystem as any).readFileSync(filePath).toString(),
        };
        const resolveModule = createLegacyResolver(fs, {
            ...compiler.options.resolve,
            extensions: [],
        });
        const stylable = new Stylable({
            projectRoot: compiler.context,
            fileSystem: {
                readlinkSync: (filePath) =>
                    (compiler.inputFileSystem as any).readlinkSync(filePath),
                statSync: (filePath) => (compiler.inputFileSystem as any).statSync(filePath),
                readFileSync: (filePath) =>
                    (compiler.inputFileSystem as any).readFileSync(filePath).toString(),
            },
            mode: compiler.options.mode === 'development' ? 'development' : 'production',
            resolveModule,
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

            compilation.hooks.processAssets.tap(this.constructor.name, () =>
                this.emitManifest(metadataList, compilation)
            );
        });
    }
    private emitManifest(metadataList: MetadataList, compilation: Compilation) {
        const manifest = metadataList.reduce<Manifest>(
            (manifest, { meta, compId, metadata }) => {
                const cssVars = this.options.generateCSSVarsExports
                    ? generateCssVarsNamedExports(compId, meta)
                    : null;
                Object.assign(manifest.stylesheetMapping, metadata.stylesheetMapping);
                Object.assign(manifest.namespaceMapping, metadata.namespaceMapping);
                manifest.componentsEntries[compId] = metadata.entry;
                manifest.componentsIndex += `:import{-st-from: ${JSON.stringify(
                    metadata.entry
                )};-st-default: ${compId};${
                    cssVars ? `-st-named:${cssVars};` : ``
                }} .root ${compId}{}${EOL}`;
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

    private emitJSONAsset(manifest: Manifest | ComponentsMetadata, compilation: Compilation) {
        const manifestContent = JSON.stringify(manifest);

        const contentHash = hashContent(manifestContent, this.options.contentHashLength);
        compilation.emitAsset(
            this.options.getOutputFileName(contentHash),
            new compilation.compiler.webpack.sources.RawSource(manifestContent, false)
        );
    }

    private createModulesMetadata(
        compiler: Compiler,
        stylable: Stylable,
        modules: Module[]
    ): MetadataList {
        const stylableComps = modules
            .filter((module) => {
                const resource = (module as any).resource;
                return resource && this.options.filterComponents(resource);
            })
            .sort((m1, m2) => {
                const r = (m1 as any).resource;
                const r2 = (m2 as any).resource;
                return r.localeCompare(r2);
            });

        return stylableComps.map((module) => {
            const resource = (module as any).resource;
            const source = (compiler.inputFileSystem as any).readFileSync(resource).toString();
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
