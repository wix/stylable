import { EOL } from 'os';
import webpack from 'webpack';
import { RawSource } from 'webpack-sources';
import { WEBPACK_STYLABLE } from './runtime-dependencies';
import { StylableImportDependency } from './stylable-dependencies';
import { getStylableModulesFromDependencies, renderStaticCSS } from './stylable-module-helpers';
import { StylableModule, StylableWebpackPluginOptions } from './types';
const Module = require('webpack/lib/Module');

export class StylableBootstrapModule extends Module {
    constructor(
        context: any,
        public chunk: webpack.compilation.Chunk | null,
        public runtimeRenderer: any,
        private options: StylableWebpackPluginOptions['bootstrap'] = {
            autoInit: true,
            globalInjection(symbol: string) {
                return `window.__stylable_renderer__ = ${symbol}`;
            }
        },
        public dependencies: StylableImportDependency[] = [],
        name = 'stylable-bootstrap-module',
        type = 'stylable-bootstrap'
    ) {
        super('javascript/auto', context);
        // from plugin
        this.name = name;
        this.type = type;
        this.built = true;
        this.hash = '';
        this.buildMeta = {};
        this.buildInfo = {};
        this.usedExports = [];
    }

    public identifier() {
        return `stylable-bootstrap ${this.name}`;
    }

    public readableIdentifier() {
        return this.identifier();
    }

    public build(_options: any, _compilation: any, _resolver: any, _fs: any, callback: any) {
        return callback();
    }
    public source(_m: any, runtimeTemplate: any) {
        const imports: string[] = [];
        this.dependencies.forEach(dependency => {
            const id = runtimeTemplate.moduleId({
                module: dependency.module,
                request: dependency.request
            });
            imports.push(`__webpack_require__(${id});`);
        });

        const renderingCode = [];
        if (this.options.autoInit) {
            if (this.options.globalInjection) {
                renderingCode.push(this.options.globalInjection(`${WEBPACK_STYLABLE}.$`));
            }

            renderingCode.push(...imports);

            renderingCode.push(
                `if(typeof window !== 'undefined') { ${WEBPACK_STYLABLE}.$.init(window); }`
            );
        }
        this.__source = new RawSource(renderingCode.join(EOL));

        return this.__source;
    }

    public needRebuild() {
        return false;
    }

    public size() {
        return this.__source ? this.__source.size() : 1;
    }
    public updateHash(hash: any) {
        hash.update(this.identifier());
        super.updateHash(hash || '');
    }
    public addStylableModuleDependency(module: StylableModule) {
        const dep = new StylableImportDependency(module.request, {
            defaultImport: `style_${this.dependencies.length}`,
            names: []
        });
        dep.module = module;
        this.dependencies.push(dep);
    }
    public renderStaticCSS(mainTemplate: any, hash: any, filter = Boolean) {
        return renderStaticCSS(
            getStylableModulesFromDependencies(this.dependencies),
            mainTemplate,
            hash,
            filter
        );
    }
}
