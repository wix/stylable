import { getImports, getReplacementToken } from './loader-utils';
import type { StylableLoaderContext } from './types';
import { emitDiagnostics } from '@stylable/core/dist/index-internal';

export default function StylableWebpackLoader(this: StylableLoaderContext, source: string) {
    const { meta, exports } = this.stylable.transform(
        this.stylable.analyze(this.resourcePath, source)
    );

    const { urls, imports, buildDependencies, unusedImports, cssDepth } = getImports(
        this.stylable,
        meta,
        this.stylable.projectRoot,
        this.assetFilter,
        this.assetsMode,
        this.includeGlobalSideEffects
    );

    for (const dep of buildDependencies) {
        this.addDependency(dep);
    }
    emitDiagnostics(this, meta, this.diagnosticsMode, this.resourcePath);

    const varType = this.target === 'oldie' ? 'var' : 'const';

    this.flagStylableModule({
        css: meta.targetAst!.toString(),
        globals: meta.globals,
        exports,
        namespace: meta.namespace,
        urls,
        unusedImports,
        cssDepth,
        type: meta.type,
    });
    /**
     * NOTICE: order of replacements is coupled with "webpack-entities.ts"
     * replacement is done from bottom->top.
     */
    return `
${imports.join('\n')}
export ${varType} namespace = ${getReplacementToken('namespace')};
export ${varType} classes = ${getReplacementToken('classes')};
export ${varType} keyframes = ${getReplacementToken('keyframes')}; 
export ${varType} layers = ${getReplacementToken('layers')};
export ${varType} containers = ${getReplacementToken('containers')};
export ${varType} stVars = ${getReplacementToken('stVars')}; 
export ${varType} vars = ${getReplacementToken('vars')}; 
export ${varType} cssStates = ${getReplacementToken('stc')};
export ${varType} style = ${getReplacementToken('sts')};
export ${varType} st = ${getReplacementToken('st')};
/* JS_INJECT */
if(import.meta.webpackHot /* HMR */) { import.meta.webpackHot.accept();}
`;
}
