import { dirname, join } from 'path';
import * as webpack from 'webpack';
import { RawSource } from 'webpack-sources';
import { compileAsEntry, exec } from './compile-as-entry';
import { ComponentConfig, ComponentMetadataBuilder } from './component-metadata-builder';

const {
    getCSSComponentLogicModule
} = require('@stylable/webpack-plugin/src/stylable-module-helpers');

export interface MetadataOptions {
    name: string;
    version: string;
    configExtension?: string;
    context?: string;
    renderSnapshot?: (
        moduleExports: any,
        component: any,
        componentConfig: ComponentConfig
    ) => string;
    mode?: 'json' | 'cjs' | 'amd:static' | 'amd:factory';
}

export class StylableMetadataPlugin {
    constructor(
        private options: MetadataOptions
    ) {}
    public apply(compiler: webpack.Compiler) {
        compiler.hooks.thisCompilation.tap('StylableMetadataPlugin', compilation => {
            compilation.hooks.additionalAssets.tapPromise('StylableMetadataPlugin', async () => {
                await this.createMetadataAssets(compilation);
            });
        });
    }
    public loadComponentConfig(compilation: webpack.compilation.Compilation, component: any) {
        return this.loadJSON<ComponentConfig>(
            compilation.inputFileSystem,
            component.resource.replace(
                /\.[^.]+$/,
                this.options.configExtension || '.component.json'
            )
        );
    }
    private loadJSON<T>(
        fs: { readFileSync(path: string): Buffer },
        resource: string
    ): T | null {
        try {
            return JSON.parse(fs.readFileSync(resource).toString());
        } catch (e) {
            return null;
        }
    }
    private async createMetadataAssets(compilation: webpack.compilation.Compilation) {
        const stylableModules = compilation.modules.filter(m => m.type === 'stylable');

        const builder = new ComponentMetadataBuilder(
            this.options.context || compilation.compiler.options.context || process.cwd(),
            this.options.name,
            this.options.version
        );

        for (const module of stylableModules) {
            const namespace = module.buildInfo.stylableMeta.namespace;
            const depth = module.buildInfo.runtimeInfo.depth;

            builder.addSource(
                module.resource,
                compilation.inputFileSystem.readFileSync(module.resource).toString(),
                { namespace, depth }
            );

            const component = getCSSComponentLogicModule(module);
            if (!component) {
                continue;
            }

            const componentConfig = this.loadComponentConfig(compilation, component);

            if (!componentConfig) {
                continue;
            }

            builder.addComponent(module.resource, componentConfig, namespace);

            this.handleVariants(
                componentConfig,
                dirname(module.resource),
                compilation,
                builder,
                namespace,
                depth
            );

            if (this.options.renderSnapshot) {
                const source = await compileAsEntry(
                    compilation,
                    component.context,
                    component.resource
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
            const fileName = `${this.options.name}.metadata.json${!jsonMode ? '.js' : ''}`;
            let fileContent = jsonSource;
            switch (this.options.mode) {
                case 'cjs':         fileContent = `module.exports = ${fileContent}`; break;
                case 'amd:static':  fileContent = `define(${fileContent});`; break;
                case 'amd:factory': fileContent = `define(() => { return ${fileContent}; });`; break;
            }
            compilation.assets[fileName] = new RawSource(fileContent);
        }
    }

    private handleVariants(
        componentConfig: ComponentConfig,
        componentDir: string,
        compilation: webpack.compilation.Compilation,
        builder: ComponentMetadataBuilder,
        namespace: any,
        depth: any
    ) {
        if (componentConfig.variantsPath) {
            const variantsDir = join(componentDir, componentConfig.variantsPath);
            let variants;

            try {
                variants = compilation.inputFileSystem.readdirSync(variantsDir);
            } catch (e) {
                throw new Error(
                    `Error while reading variants for: ${
                        componentConfig.id
                    } in ${variantsDir}\nOriginal Error:\n${e}`
                );
            }

            variants.forEach((name: string) => {
                if (!name.match(/\.st\.css/)) {
                    return;
                }
                const variantPath = join(variantsDir, name);
                let content;
                try {
                    content = compilation.inputFileSystem.readFileSync(variantPath).toString();
                } catch (e) {
                    throw new Error(
                        `Error while reading variant: ${variantPath}\nOriginal Error:\n${e}`
                    );
                }
                builder.addSource(variantPath, content, {
                    namespace: name.replace('.st.css', '') + '-' + namespace,
                    variant: true,
                    depth
                });
            });
        }
    }
}
