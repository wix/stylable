import { addBuildDependencies, getImports } from './loader-utils';
import { StylableLoaderContext } from './types';
import { emitDiagnostics } from '@stylable/core';

export default function (this: StylableLoaderContext, source: string) {
    const { meta, exports } = this.stylable.transform(source, this.resourcePath);

    const { urls, imports, cssDepth, buildDependencies, unusedImports } = getImports(
        this.stylable,
        meta,
        this.stylable.projectRoot,
        this.assetsMode
    );

    this.flagStylableModule({
        css: meta.outputAst!.toString(),
        globals: meta.globals,
        exports,
        namespace: meta.namespace,
        urls,
        cssDepth,
        unusedImports,
    });
    addBuildDependencies(this, buildDependencies);
    emitDiagnostics(this, meta, this.diagnosticsMode);

    return `
${imports.join('\n')}
export const namespace = {__namespace__:true};
export const classes = {__classes__:true};
export const keyframes = ${JSON.stringify(exports.keyframes)}; 
export const stVars = ${JSON.stringify(exports.stVars)}; 
export const vars = ${JSON.stringify(exports.vars)}; 
export const cssStates = /*#__PURE__*/ __webpack_require__.stc.bind(null, namespace);
export const style = /*#__PURE__*/ __webpack_require__.sts.bind(null, namespace);
export const st = style;
if(import.meta.webpackHot /* HMR */) {
  import.meta.webpackHot.accept();
}
`;
}
