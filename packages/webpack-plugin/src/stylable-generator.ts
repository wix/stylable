import {
    isAsset,
    makeAbsolute,
    processDeclarationUrls,
    Stylable,
    StylableMeta,
    StylableResults
} from '@stylable/core';
import { generateModuleSource } from '@stylable/module-utils';
import path from 'path';
import postcss from 'postcss';
import webpack from 'webpack';
import { OriginalSource, ReplaceSource } from 'webpack-sources';
import { WEBPACK_STYLABLE } from './runtime-dependencies';
import { StylableGeneratorOptions, StylableModule } from './types';
export class StylableGenerator {
    constructor(
        private stylable: Stylable,
        private compilation: webpack.compilation.Compilation,
        private normalModuleFactory: any,
        private options: Partial<StylableGeneratorOptions>
    ) {}

    public generate(module: StylableModule, _dependencyTemplates: any, runtimeTemplate: any) {
        if (module.type === 'stylable-raw' || !module.buildInfo.stylableMeta) {
            const targetModule = this.normalModuleFactory
                .getGenerator('javascript/auto')
                .generate(module, _dependencyTemplates, runtimeTemplate);
            return targetModule;
        }
        const stylableResult = this.transform(module);
        const { meta } = stylableResult;
        const isImportedByNonStylable = module.buildInfo.isImportedByNonStylable;

        const css = this.options.includeCSSInJS
            ? this.getCSSInJSWithAssets(
                  meta.outputAst!,
                  module =>
                      `" + (function(m){return m.default || m})(__webpack_require__(${runtimeTemplate.moduleId(
                          {
                              module,
                              request: module.request
                          }
                      )})) + "`,
                  (this.compilation as any).options.context,
                  module.resource,
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
                      request: module.request
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
    public transform(module: StylableModule) {
        const results = this.stylable.createTransformer().transform(module.buildInfo.stylableMeta);

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
    public createModuleSource(
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
                    rewriteUrl(node, replacements.length - 1);
                } else {
                    node.url = resourcePath;
                    this.compilation.warnings.push(`Stylable missing asset: ${resourcePath}`);
                }
            }
        };
        outputAst.walkDecls((decl: postcss.Declaration) =>
            processDeclarationUrls(decl, onUrl, true)
        );
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

function rewriteUrl(node: any, replacementIndex: number) {
    node.stringType = '';
    delete node.innerSpacingBefore;
    delete node.innerSpacingAfter;
    node.url = `__css_asset_placeholder__${replacementIndex}__`;
}

