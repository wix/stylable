import { addBuildDependencies, getImports } from './loader-utils';
import type { StylableLoaderContext } from './types';
import { emitDiagnostics } from '@stylable/core';

export default function StylableWebpackLoader(this: StylableLoaderContext, source: string) {
    const { meta, exports } = this.stylable.transform(source, this.resourcePath);

    const { urls, imports, buildDependencies, unusedImports } = getImports(
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
        unusedImports,
    });
    addBuildDependencies(this, buildDependencies);
    emitDiagnostics(this, meta, this.diagnosticsMode);

    const varType = this.target === 'oldie' ? 'var' : 'const';

    return `
${imports.join('\n')}
export ${varType} namespace = {__namespace__:true};
export ${varType} classes = {__classes__:true};
export ${varType} keyframes = ${JSON.stringify(exports.keyframes)}; 
export ${varType} stVars = ${JSON.stringify(exports.stVars)}; 
export ${varType} vars = ${JSON.stringify(exports.vars)}; 
export ${varType} cssStates = /*#__PURE__*/ __webpack_require__.stc.bind(null, namespace);
export ${varType} style = /*#__PURE__*/ __webpack_require__.sts.bind(null, namespace);
export ${varType} st = style;
if(import.meta.webpackHot /* HMR */) {
  import.meta.webpackHot.accept();
}
`;
}
