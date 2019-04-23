import { Stylable, StylableConfig } from '@stylable/core';
import { generateModuleSource } from './module-source';

interface Options {
    runtimePath: string;
    runtimeStylesheetId: 'module' | 'namespace';
    injectCSS: boolean;
    renderableOnly: boolean;
}

export function stylableModuleFactory(
    stylableOptions: StylableConfig,
    {
        runtimePath = '@stylable/runtime',
        runtimeStylesheetId = 'module',
        injectCSS = true,
        renderableOnly = false
    }: Partial<Options> = {}
) {
    const stylable = Stylable.create(stylableOptions);

    return function stylableToModule(source: string, path: string) {
        const res = stylable.transform(source, path);
        return generateModuleSource(
            res,
            runtimeStylesheetId === 'module' ? 'module.id' : res.meta.namespace,
            [`const runtime = require(${JSON.stringify(runtimePath)})`],
            `runtime.$`,
            `runtime`,
            injectCSS ? JSON.stringify(res.meta.outputAst!.toString()) : '""',
            '-1', // ToDo: calc depth for node as well
            'module.exports',
            '',
            renderableOnly
        );
    };
}
