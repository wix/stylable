import { findFiles } from '@stylable/node';
import { dirname, join } from 'path';
import type { Compilation, Compiler } from 'webpack';
import { sources } from 'webpack';
import { compileAsEntry, exec } from './compile-as-entry';
import { ComponentConfig, ComponentMetadataBuilder } from './component-metadata-builder';

import { getCSSViewModules, isStylableModule, uniqueFilterMap } from '@stylable/webpack-plugin';
import { hashContent } from './hash-content-util';

const RawSource = sources.RawSource;

export interface MetadataOptions {
    name: string;
    useContentHashFileName?: boolean;
    contentHashLength?: number;
    version: string;
    configExtension?: string;
    context?: string;
    normalizeModulePath?: (resource: string, builder: ComponentMetadataBuilder) => string;
    renderSnapshot?: (
        moduleExports: any,
        component: any,
        componentConfig: ComponentConfig
    ) => string;
    mode?: 'json' | 'cjs' | 'amd:static' | 'amd:factory';
}

export class StylableMetadataPlugin {
    constructor(private options: MetadataOptions) {}
    public apply(compiler: Compiler) {
        compiler.hooks.thisCompilation.tap('StylableMetadataPlugin', (compilation) => {
            compilation.hooks.processAssets.tapPromise('StylableMetadataPlugin', async () => {
                await this.createMetadataAssets(compilation);
            });
        });
    }
    public loadComponentConfig(compilation: Compilation, component: any) {
        return this.loadJSON<ComponentConfig>(
            compilation.inputFileSystem as any,
            component.resource.replace(
                /\.[^.]+$/,
                this.options.configExtension || '.component.json'
            )
        );
    }
    private loadJSON<T>(fs: { readFileSync(path: string): Buffer }, resource: string): T | null {
        try {
            return JSON.parse(fs.readFileSync(resource).toString());
        } catch (e) {
            if (e instanceof SyntaxError) {
                throw new SyntaxError(`${e.message} in ${resource}`);
            }
            return null;
        }
    }
    private async createMetadataAssets(compilation: Compilation) {
        const stylableModules = uniqueFilterMap(compilation.modules, (m) =>
            isStylableModule(m) ? m : null
        );

        const builder = new ComponentMetadataBuilder(
            this.options.context || compilation.compiler.options.context || process.cwd(),
            this.options.name,
            this.options.version
        );

        for (const module of stylableModules) {
            const namespace = module.buildInfo.stylableMeta.namespace;
            const depth = module.buildInfo.runtimeInfo.depth;
            const resource = this.options.normalizeModulePath
                ? this.options.normalizeModulePath(module.resource, builder)
                : module.resource;

            builder.addSource(
                resource,
                (compilation.inputFileSystem as any).readFileSync(resource).toString(),
                { namespace, depth }
            );

            const component = getCSSViewModules(module, compilation.moduleGraph);
            if (!component) {
                continue;
            }

            const componentConfig = this.loadComponentConfig(compilation, component);

            if (!componentConfig) {
                continue;
            }

            builder.addComponent(resource, componentConfig, namespace);

            this.handleVariants(
                componentConfig,
                dirname(resource),
                compilation,
                builder,
                namespace,
                depth
            );

            if (this.options.renderSnapshot) {
                const source = await compileAsEntry(
                    compilation,
                    component.context,
                    component.resource,
                    []
                );

                const componentModule = exec(source, component.resource, component.context);

                const html = this.options.renderSnapshot(
                    componentModule,
                    component,
                    componentConfig
                );
                builder.addComponentSnapshot(componentConfig.id, html);
            }
        }

        if (builder.hasPackages()) {
            builder.createIndex();
            const jsonMode = !this.options.mode || this.options.mode === 'json';
            const jsonSource = JSON.stringify(builder.build(), null, 2);

            let fileContent = jsonSource;
            switch (this.options.mode) {
                case 'cjs':
                    fileContent = `module.exports = ${fileContent}`;
                    break;
                case 'amd:static':
                    fileContent = `define(${fileContent});`;
                    break;
                case 'amd:factory':
                    fileContent = `define(() => { return ${fileContent}; });`;
                    break;
            }
            const fileName = `${this.options.name}${
                this.options.useContentHashFileName
                    ? `.${hashContent(fileContent, this.options.contentHashLength)}`
                    : ''
            }.metadata.json${!jsonMode ? '.js' : ''}`;
            compilation.emitAsset(fileName, new RawSource(fileContent, false));
        }
    }

    private handleVariants(
        componentConfig: ComponentConfig,
        componentDir: string,
        compilation: Compilation,
        builder: ComponentMetadataBuilder,
        namespace: any,
        depth: any
    ) {
        if (componentConfig.variantsPath) {
            const variantsDir = join(componentDir, componentConfig.variantsPath);

            const { result: variants, errors } = findFiles(
                compilation.inputFileSystem,
                variantsDir,
                '.st.css',
                new Set(),
                true
            );
            if (errors.length) {
                throw new Error(
                    `Error while reading variants for: ${componentConfig.id} in ${variantsDir}\nOriginal Errors:\n${errors}`
                );
            }

            variants.forEach((name: string) => {
                if (!name.match(/\.st\.css/)) {
                    return;
                }
                const variantPath = join(variantsDir, name);
                let content;
                try {
                    content = (compilation.inputFileSystem as any)
                        .readFileSync(variantPath)
                        .toString();
                } catch (e) {
                    throw new Error(
                        `Error while reading variant: ${variantPath}\nOriginal Error:\n${e}`
                    );
                }
                if (name.includes('_')) {
                    throw new Error(
                        `Error variant name or folder cannot contain "_" found in: ${name}`
                    );
                }
                builder.addSource(variantPath, content, {
                    namespace:
                        name.replace(/\\/g, '/').replace(/\//g, '_').replace('.st.css', '') +
                        '-' +
                        namespace,
                    variant: true,
                    depth,
                });
            });
        }
    }
}
