import { getImports, getReplacementToken } from './loader-utils';
import type { StylableLoaderContext } from './types';
import { emitDiagnostics } from '@stylable/core';

export default function StylableWebpackLoader(this: StylableLoaderContext, source: string) {
    const { meta, exports } = this.stylable.transform(source, this.resourcePath);

    const { urls, imports, buildDependencies, unusedImports } = getImports(
        this.stylable,
        meta,
        this.stylable.projectRoot,
        this.assetFilter,
        this.assetsMode
    );

    for (const dep of buildDependencies) {
        this.addDependency(dep);
    }
    emitDiagnostics(this, meta, this.diagnosticsMode);

    const varType = this.target === 'oldie' ? 'var' : 'const';

    this.flagStylableModule({
        css: meta.outputAst!.toString(),
        globals: meta.globals,
        exports,
        namespace: meta.namespace,
        urls,
        unusedImports,
    });

    return `
${imports.join('\n')}
export ${varType} namespace = ${getReplacementToken('namespace')};
export ${varType} classes = ${getReplacementToken('classes')};
export ${varType} keyframes = ${getReplacementToken('keyframes')}; 
export ${varType} stVars = ${getReplacementToken('stVars')}; 
export ${varType} vars = ${getReplacementToken('vars')}; 
export ${varType} cssStates = ${getReplacementToken('stc')};
export ${varType} style = ${getReplacementToken('sts')};
export ${varType} st = ${getReplacementToken('st')};
/* JS_INJECT */
if(import.meta.webpackHot /* HMR */) { import.meta.webpackHot.accept();}
`;
}
