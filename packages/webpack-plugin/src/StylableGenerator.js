const { EOL } = require('os');
const path = require('path');
const { ReplaceSource, OriginalSource } = require('webpack-sources');
const { StylableImportDependency } = require('./StylableDependencies');
const { WEBPACK_STYLABLE } = require('./runtime-dependencies');
const { processDeclarationUrls, makeAbsolute, isAsset } = require('@stylable/core');

class StylableGenerator {
    constructor(stylable, compilation, options) {
        this.stylable = stylable;
        this.compilation = compilation;
        this.options = options;
    }
    generate(module, dependencyTemplates, runtimeTemplate) {
        if (module.type === 'stylable-raw' || !module.buildInfo.stylableMeta) {
            return module.originalSource();
        }
        const { meta, exports } = this.transform(module);
        const isImportedByNonStylable = module.buildInfo.isImportedByNonStylable;
        const imports = []

        const css = this.options.includeCSSInJS
            ? this.getCSSInJSWithAssets(
                  meta.outputAst,
                  module =>
                      `" + __webpack_require__(${runtimeTemplate.moduleId({
                          module,
                          request: module.request
                      })}) + "`,
                  this.compilation.options.context,
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
    transform(module) {

        const results = this.stylable.createTransformer().transform(module.buildInfo.stylableMeta);
        const outputAst = results.meta.outputAst;

        this.stylable.optimizer.optimize(
            module.buildInfo.optimize,
            results,
            this.stylable.delimiter,
            module.buildInfo.usageMapping
        );

        if (this.options.afterTransform) {
            this.options.afterTransform(results, module, this.stylable);
        }

        return results;
    }
    toCSS(module, onAsset) {
        const { meta } = this.transform(module);
        return this.getCSSInJSWithAssets(
            meta.outputAst,
            onAsset,
            this.compilation.options.context,
            module.resource,
            false,
            module.buildInfo.optimize.minify
        );
    }
    reportDiagnostics(meta) {
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
    createModuleSource(module, imports, createMethod, args) {
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
    getCSSInJSWithAssets(outputAst, onAsset, root, moduleResource, asJS, minify) {
        const replacements = [];
        const moduleDir = path.dirname(moduleResource);
        const onUrl = node => {
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
        if (minify) {
            targetCSS = this.stylable.optimizer.minifyCSS(targetCSS);
        }
        const css = asJS ? JSON.stringify(targetCSS) : targetCSS;

        return css.replace(/__css_asset_placeholder__(.*?)__/g, ($0, $1) => {
            return onAsset(replacements[$1]); //`" + __webpack_require__(${replacements[$1]}) + "`;
        });
    }
    rewriteUrl(node, replacementIndex) {
        node.stringType = '';
        delete node.innerSpacingBefore;
        delete node.innerSpacingAfter;
        node.url = `__css_asset_placeholder__${replacementIndex}__`;
    }
}

module.exports = StylableGenerator;
