import { getImports, getReplacementToken as rt } from './loader-utils';
import type { StylableLoaderContext } from './types';
import { emitDiagnostics } from '@stylable/core';
import { generateStylableJSModuleSource } from '@stylable/module-utils';

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
    emitDiagnostics(this, meta, this.diagnosticsMode, this.resourcePath);

    const varType = this.target === 'oldie' ? 'var' : 'const';

    this.flagStylableModule({
        css: meta.outputAst!.toString(),
        globals: meta.globals,
        exports,
        namespace: meta.namespace,
        urls,
        unusedImports,
    });

    return generateStylableJSModuleSource(
        {
            namespace: rt('namespace'),
            jsExports: {
                classes: rt('classes'),
                keyframes: rt('keyframes'),
                layers: rt('layers'),
                stVars: rt('stVars'),
                vars: rt('vars'),
            },
            header: imports.join('\n'),
            footer: `if(import.meta.webpackHot /* HMR */) { import.meta.webpackHot.accept();}`,
            format: 'esm',
            varType,
        },
        this.cssInjection === 'js'
            ? {
                  css: rt('css'),
                  depth: rt('depth'),
                  runtimeId: rt('runtimeId'),
                  id: rt('id'),
              }
            : undefined
    );
}
