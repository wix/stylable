import { isAsset, makeAbsolute, processDeclarationUrls, Stylable, StylableMeta } from '@stylable/core';
import { EOL } from 'os';
import path from 'path';
import postcss from 'postcss';
import webpack from 'webpack';
import { OriginalSource, ReplaceSource } from 'webpack-sources';
import { WEBPACK_STYLABLE } from './runtime-dependencies';
import { StylableModule, StylableWebpackPluginOptions } from './types';

export class StylableGenerator {
    constructor(
        private stylable: Stylable,
        private compilation: webpack.compilation.Compilation,
        private options: Partial<StylableWebpackPluginOptions>
    ) { }

    public generate(module: StylableModule, _dependencyTemplates: any, runtimeTemplate: any) {
        if (module.type === 'stylable-raw' || !module.buildInfo.stylableMeta) {
            return module.originalSource();
        }
        const { meta, exports } = this.transform(module);
        const isImportedByNonStylable = module.buildInfo.isImportedByNonStylable;
        const imports: string[] = [];

        const css = this.options.includeCSSInJS
            ? this.getCSSInJSWithAssets(
                meta.outputAst!,
                module =>
                    `" + __webpack_require__(${runtimeTemplate.moduleId({
                        module,
                        request: module.request
                    })}) + "`,
                (this.compilation as any).options.context,
                module.resource,
                true,
                module.buildInfo.optimize.minify
            )
            : `""`;

        this.reportDiagnostics(meta);

        const depth = module.buildInfo.runtimeInfo.depth;
        const id = runtimeTemplate.moduleId({
            module,
            request: module.request
        });

        const originalSource = isImportedByNonStylable
            ? this.createModuleSource(module, imports, 'create', [
                JSON.stringify(meta.root),
                JSON.stringify(meta.namespace),
                JSON.stringify(exports),
                css,
                depth,
                id
            ])
            : this.createModuleSource(module, imports, 'createTheme', [css, depth, id]);
        return new ReplaceSource(originalSource);
    }
    public transform(module: StylableModule) {

        const results = this.stylable.createTransformer().transform(module.buildInfo.stylableMeta);
        const outputAst = results.meta.outputAst;

        if (this.stylable.optimizer) {
            this.stylable.optimizer.optimize(
                module.buildInfo.optimize,
                results,
                this.stylable.delimiter,
                module.buildInfo.usageMapping
            );
        }

        if (this.options.afterTransform) {
            this.options.afterTransform(results, module, this.stylable);
        }

        return results;
    }
    public toCSS(module: StylableModule, onAsset: (module: StylableModule) => string) {
        const { meta } = this.transform(module);
        return this.getCSSInJSWithAssets(
            meta.outputAst!,
            onAsset,
            (this.compilation as any).options.context,
            module.resource,
            false,
            module.buildInfo.optimize.minify
        );
    }
    public reportDiagnostics(meta: StylableMeta) {
        const transformReports = meta.transformDiagnostics ? meta.transformDiagnostics.reports : [];
        meta.diagnostics.reports.concat(transformReports).forEach(report => {
            if (report.node) {
                this.compilation.warnings.push(
                    report.node
                        .error(report.message, report.options)
                        .toString()
                        .replace('CssSyntaxError', 'Stylable')
                );
            } else {
                this.compilation.warnings.push(report.message);
            }
        });
    }
    public createModuleSource(module: StylableModule, imports: string[], _createMethod: any, args: string[]) {
        return new OriginalSource(
            [
                `Object.defineProperty(${module.exportsArgument}, "__esModule", { value: true })`,
                imports.join(EOL),
                `${module.exportsArgument}.default = ${WEBPACK_STYLABLE}.create(`,
                args.map(_ => '  ' + _).join(',' + EOL),
                `);`,
                this.options.includeCSSInJS
                    ? `${WEBPACK_STYLABLE}.$.register(${module.exportsArgument}.default)`
                    : '',
                this.options.experimentalHMR
                    ? `
                    // Webpack HMR
                    if (module && module.hot) {
                        module.hot.accept();
                    }
                    `
                    : ''
            ].join(EOL),
            module.resource
        );
    }
    public getCSSInJSWithAssets(
        outputAst: postcss.Root,
        onAsset: (module: StylableModule) => string,
        root: string,
        moduleResource: string,
        asJS: boolean,
        minify: boolean
    ) {
        const replacements: StylableModule[] = [];
        const moduleDir = path.dirname(moduleResource);
        const onUrl = (node: any) => {
            if (isAsset(node.url)) {
                const resourcePath = makeAbsolute(node.url, root, moduleDir);
                const module = this.compilation.modules.find(_ => _.resource === resourcePath);
                if (module) {
                    replacements.push(module);
                    this.rewriteUrl(node, replacements.length - 1);
                } else {
                    node.url = resourcePath;
                    this.compilation.warnings.push(`Stylable missing asset: ${resourcePath}`);
                }
            }
        };
        outputAst.walkDecls(decl => processDeclarationUrls(decl, onUrl, true));
        let targetCSS = outputAst.toString();
        if (minify && this.stylable.optimizer) {
            targetCSS = this.stylable.optimizer.minifyCSS(targetCSS);
        }
        const css = asJS ? JSON.stringify(targetCSS) : targetCSS;

        return css.replace(/__css_asset_placeholder__(.*?)__/g, (_$0, $1) => {
            return onAsset(replacements[$1]); // `" + __webpack_require__(${replacements[$1]}) + "`;
        });
    }

    public rewriteUrl(node: any, replacementIndex: number) {
        node.stringType = '';
        delete node.innerSpacingBefore;
        delete node.innerSpacingAfter;
        node.url = `__css_asset_placeholder__${replacementIndex}__`;
    }
}
