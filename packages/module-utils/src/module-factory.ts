import { Stylable, StylableConfig } from '@stylable/core';
import { generateModuleSource } from './module-source';

export interface Options {
    runtimePath: string;
    runtimeStylesheetId: 'module' | 'namespace';
    injectCSS: boolean;
    renderableOnly: boolean;
    legacyRuntime: boolean;
    staticImports: string[];
}

export function stylableModuleFactory(
    stylableOptions: StylableConfig,
    {
        runtimePath = '@stylable/runtime',
        runtimeStylesheetId = 'module',
        injectCSS = true,
        renderableOnly = false,
        legacyRuntime,
        staticImports = []
    }: Partial<Options> = {}
) {
    let afterModule = '';
    const stylable = Stylable.create(stylableOptions);
    if (legacyRuntime && runtimePath === '@stylable/runtime') {
        runtimePath = '@stylable/runtime/cjs/index-legacy';
        afterModule += 'module.exports.default = module.exports;';
    }
    return function stylableToModule(source: string, path: string) {
        const res = stylable.transform(source, path);
        return generateModuleSource(
            res,
            runtimeStylesheetId === 'module' ? 'module.id' : res.meta.namespace,
            [
                ...staticImports.map(request => `import ${JSON.stringify(request)}`),
                `const runtime = require(${JSON.stringify(runtimePath)})`
            ],
            `runtime.$`,
            `runtime.create`,
            `runtime.createRenderable`,
            injectCSS ? JSON.stringify(res.meta.outputAst!.toString()) : '""',
            '-1', // ToDo: calc depth for node as well
            'module.exports',
            afterModule,
            renderableOnly
        );
    };
}
