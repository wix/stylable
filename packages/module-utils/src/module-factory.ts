import { Stylable, StylableConfig } from '@stylable/core';
import { generateStylableJSModuleSource } from './stylable-js-module-source';

export interface Options {
    injectCSS: boolean;
    staticImports: string[];
    runtimePath: string;
    runtimeStylesheetId: 'module' | 'namespace';
    /**@deprecated */
    renderableOnly: boolean;
    format: 'esm' | 'cjs';
    runtimeId: string;
}

export function stylableModuleFactory(
    stylableOptions: StylableConfig,
    {
        runtimePath,
        runtimeStylesheetId = 'module',
        injectCSS = true,
        staticImports = [],
        format = 'cjs',
        runtimeId = '0',
    }: Partial<Options> = {}
) {
    const stylable = Stylable.create(stylableOptions);
    return function stylableToModule(source: string, path: string) {
        const { meta, exports } = stylable.transform(source, path);

        return generateStylableJSModuleSource(
            {
                format,
                imports: staticImports.map((from) => ({ from })),
                jsExports: exports,
                namespace: meta.namespace,
                runtimeRequest: runtimePath,
                varType: 'var',
            },
            {
                id: runtimeStylesheetId === 'module' ? undefined : meta.namespace,
                css: injectCSS ? meta.outputAst!.toString() : '',
                depth: -1,
                runtimeId,
            }
        );
    };
}
