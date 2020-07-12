import type { Stylable, StylableMeta, StylableResults } from '@stylable/core';
import { generateModuleSource } from '@stylable/module-utils';
import type webpack from 'webpack';
import { OriginalSource, ReplaceSource } from 'webpack-sources';
import { WEBPACK_STYLABLE } from './runtime-dependencies';
import type { StylableGeneratorOptions, StylableModule, WebpackAssetModule } from './types';
export class StylableGenerator {
    constructor(
        private stylable: Stylable,
        private compilation: webpack.compilation.Compilation,
        private normalModuleFactory: any,
        private options: StylableGeneratorOptions
    ) {}

    public generate(module: StylableModule, _dependencyTemplates: any, runtimeTemplate: any) {
        if (module.type === 'stylable-raw' || !module.buildInfo.stylableMeta) {
            const targetModule = this.normalModuleFactory
                .getGenerator('javascript/auto')
                .generate(module, _dependencyTemplates, runtimeTemplate);
            return targetModule;
        }
        const stylableResult = this.afterTransform(module);
        const { meta } = stylableResult;
        const isImportedByNonStylable = module.buildInfo.isImportedByNonStylable;
        const css = this.options.includeCSSInJS
            ? this.stringifyCSS(
                  module,
                  (module) =>
                      `" + (function(m){return m.default || m})(__webpack_require__(${runtimeTemplate.moduleId(
                          {
                              module,
                              request: module.request,
                          }
                      )})) + "`,
                  true,
                  module.buildInfo.optimize.minify
              )
            : `""`;

        this.reportDiagnostics(meta);

        const depth = module.buildInfo.runtimeInfo.depth;
        const id =
            this.options.runtimeStylesheetId === 'namespace'
                ? JSON.stringify(module.buildInfo.stylableMeta.namespace)
                : runtimeTemplate.moduleId({
                      module,
                      request: module.request,
                  });

        return new ReplaceSource(
            this.createModuleSource(
                module,
                id,
                stylableResult,
                css,
                depth,
                !isImportedByNonStylable
            )
        );
    }
    public toCSS(module: StylableModule, onAsset: (module: WebpackAssetModule) => string) {
        this.afterTransform(module);
        return this.stringifyCSS(module, onAsset, false, module.buildInfo.optimize.minify);
    }
    private afterTransform(module: StylableModule) {
        const results = {
            meta: module.buildInfo.stylableMeta,
            exports: module.buildInfo.stylableTransformedExports,
        };

        if (module.buildInfo.stylableTransformed) {
            return results;
        }

        module.buildInfo.stylableTransformed = true;

        if (this.stylable.optimizer) {
            this.stylable.optimizer.optimize(
                module.buildInfo.optimize,
                results,
                module.buildInfo.usageMapping,
                this.stylable.delimiter
            );
        }

        if (this.options.afterTransform) {
            this.options.afterTransform(results, module, this.stylable);
        }

        return results;
    }
    private reportDiagnostics(meta: StylableMeta) {
        const transformReports = meta.transformDiagnostics ? meta.transformDiagnostics.reports : [];
        meta.diagnostics.reports.concat(transformReports).forEach((report) => {
            const mode = this.options.diagnosticsMode;

            let bucket = report.type === 'warning' ? ('warnings' as const) : ('errors' as const);

            if (mode === 'loose') {
                bucket = 'warnings';
            } else if (mode === 'strict') {
                bucket = 'errors';
            }

            if (report.node) {
                this.compilation[bucket].push(
                    report.node
                        .error(report.message, report.options)
                        .toString()
                        .replace('CssSyntaxError', 'Stylable')
                );
            } else {
                this.compilation[bucket].push(report.message);
            }
        });
    }
    private createModuleSource(
        module: StylableModule,
        moduleId: string,
        stylableResult: StylableResults,
        css: string,
        depth: string | number,
        renderableOnly = false
    ) {
        const moduleSource = generateModuleSource(
            stylableResult,
            moduleId,
            [],
            this.options.includeCSSInJS ? `${WEBPACK_STYLABLE}.$` : 'null',
            `${WEBPACK_STYLABLE}.create`,
            `${WEBPACK_STYLABLE}.createRenderable`,
            css,
            typeof depth === 'number' ? depth.toString() : depth,
            'module.' + module.exportsArgument,
            this.options.experimentalHMR
                ? `/* Webpack HMR */ if (module && module.hot) { module.hot.accept(); }`
                : '',
            renderableOnly
        );

        return new OriginalSource(moduleSource, module.resource);
    }
    private stringifyCSS(
        module: StylableModule,
        onAsset: (module: WebpackAssetModule) => string,
        asJS: boolean,
        minify: boolean
    ) {
        const outputAst = module.buildInfo.stylableTransformedAst;
        const replacements = module.buildInfo.stylableAssetReplacement;
        let targetCSS = outputAst.toString();
        if (minify && this.stylable.optimizer) {
            targetCSS = this.stylable.optimizer.minifyCSS(targetCSS);
        }
        const css = asJS ? JSON.stringify(targetCSS) : targetCSS;

        return css.replace(/__css_asset_placeholder__(.*?)__/g, (_$0, $1) => {
            return onAsset(replacements[$1]); // `" + __webpack_require__(${replacements[$1]}) + "`;
        });
    }
}
