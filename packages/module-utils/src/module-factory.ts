import { Stylable, StylableConfig } from '@stylable/core';
import { generateModuleSource } from './module-source';

export interface Options {
    runtimePath: string;
    runtimeStylesheetId: 'module' | 'namespace';
    injectCSS: boolean;
    renderableOnly: boolean;
    staticImports: string[];
}

export function stylableModuleFactory(
    stylableOptions: StylableConfig,
    {
        runtimePath = '@stylable/runtime',
        runtimeStylesheetId = 'module',
        injectCSS = true,
        renderableOnly = false,
        staticImports = [],
    }: Partial<Options> = {}
) {
    const stylable = new Stylable(stylableOptions);
    return function stylableToModule(source: string, path: string) {
        const meta = stylable.analyze(path, source);
        const res = stylable.transform(meta);
        return generateModuleSource(
            res,
            runtimeStylesheetId === 'module' ? 'module.id' : res.meta.namespace,
            [
                ...staticImports.map((request) => `import ${JSON.stringify(request)}`),
                `const runtime = require(${JSON.stringify(runtimePath)})`,
            ],
            `runtime.$`,
            `runtime.create`,
            `runtime.createRenderable`,
            injectCSS ? JSON.stringify(res.meta.targetAst!.toString()) : '""',
            '-1', // ToDo: calc depth for node as well
            'module.exports',
            '' /* afterModule */,
            renderableOnly
        );
    };
}
