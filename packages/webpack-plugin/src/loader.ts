import { getImports, getReplacementToken as rt } from './loader-utils.js';
import type { StylableLoaderContext } from './types.js';
import { emitDiagnostics } from '@stylable/core/dist/index-internal';
import { generateStylableJSModuleSource } from '@stylable/core';

export default function StylableWebpackLoader(this: StylableLoaderContext, source: string) {
    const { meta, exports } = this.stylable.transform(
        this.stylable.analyze(this.resourcePath, source),
    );

    const { urls, imports, buildDependencies, unusedImports, cssDepth } = getImports(
        this.stylable,
        meta,
        this.stylable.projectRoot,
        this.assetFilter,
        this.assetsMode,
        this.includeGlobalSideEffects,
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

    return generateStylableJSModuleSource(
        {
            namespace: rt('namespace'),
            jsExports: {
                containers: rt('containers'),
                classes: rt('classes'),
                keyframes: rt('keyframes'),
                layers: rt('layers'),
                stVars: rt('stVars'),
                vars: rt('vars'),
            },
            header: imports.join('\n'),
            footer: `if(import.meta.webpackHot /* HMR */) { import.meta.webpackHot.accept();}`,
            moduleType: 'esm',
            varType,
        },
        this.cssInjection === 'js'
            ? {
                  css: rt('css'),
                  depth: rt('depth'),
                  runtimeId: rt('runtimeId'),
                  id: rt('id'),
              }
            : undefined,
    );
}
