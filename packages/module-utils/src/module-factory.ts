import { Stylable, StylableConfig, generateStylableJSModuleSource } from '@stylable/core';

export interface Options {
    injectCSS: boolean;
    staticImports: string[];
    runtimePath: string;
    runtimeStylesheetId: 'module' | 'namespace';
    moduleType: 'esm' | 'cjs';
    runtimeId: string;
    /**@deprecated not in use */
    renderableOnly: boolean;
}

export function stylableModuleFactory(
    stylableOptions: StylableConfig,
    {
        runtimePath,
        runtimeStylesheetId = 'module',
        injectCSS = true,
        staticImports = [],
        moduleType = 'cjs',
        runtimeId = '0',
    }: Partial<Options> = {}
) {
    const stylable = new Stylable(stylableOptions);
    return function stylableToModule(source: string, path: string) {
        const { meta, exports } = stylable.transform(stylable.analyze(path, source));
        return generateStylableJSModuleSource(
            {
                moduleType: moduleType,
                imports: staticImports.map((from) => ({ from })),
                jsExports: exports,
                namespace: meta.namespace,
                runtimeRequest: runtimePath,
                varType: 'var',
            },
            {
                id: runtimeStylesheetId === 'module' ? undefined : meta.namespace,
                css: injectCSS ? meta.targetAst!.toString() : '',
                depth: -1,
                runtimeId,
            }
        );
    };
}
