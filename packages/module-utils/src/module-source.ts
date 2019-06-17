import { StylableResults } from '@stylable/core';

export function generateModuleSource(
    stylableResult: StylableResults,
    moduleId: string,
    beforeModule: string[],
    renderer: string,
    createFunction: string,
    createRenderableFunction: string,
    css: string,
    depth: string,
    exportsArgument: string,
    afterModule: string,
    renderableOnly: boolean = false
): string {
    const { exports, meta } = stylableResult;
    const localsExports = JSON.stringify(exports);
    const namespace = JSON.stringify(meta.namespace);
    if (renderableOnly) {
        return `${createRenderableFunction}(${css}, ${depth}, ${moduleId});`;
    }
    return `
${beforeModule.join('\n')}
${exportsArgument} = ${createFunction}(
    ${namespace},
    ${localsExports},
    ${css},
    ${depth},
    ${moduleId},
    ${renderer}
);
${afterModule}
`;
}

export function createModuleSource(
    stylableResult: StylableResults,
    moduleFormat: string = 'cjs',
    includeCSSInJS: boolean,
    moduleId = JSON.stringify(stylableResult.meta.namespace),
    renderableOnly = false,
    depth: string | number = '-1',
    staticRequests: string[] = []
) {
    // TODO: calc depth for node as well
    depth = typeof depth === 'number' ? depth.toString() : depth;

    if (renderableOnly && !includeCSSInJS) {
        // TODO: better error
        throw new Error('Configuration conflict (renderableOnly && !includeCSSInJS)');
    }

    switch (moduleFormat) {
        case 'dts':
            return generateTypescriptDefinition();
        case 'esm':
            const importKey = renderableOnly ? 'createRenderable' : 'create';
            return generateModuleSource(
                stylableResult,
                moduleId,
                [
                    ...staticRequests.map(request => `import ${JSON.stringify(request)}`),
                    `import { $, ${importKey} } from ${JSON.stringify('@stylable/runtime')}`
                ],
                `$`,
                `create`,
                `createRenderable`,
                includeCSSInJS ? JSON.stringify(stylableResult.meta.outputAst!.toString()) : '""',
                depth,
                'const { classes, keyframes, vars, stVars, cssStates, style, st, $depth, $id, $css }',
                `export { classes, keyframes, vars, stVars, cssStates, style, st, $depth, $id, $css };`,
                renderableOnly
            );
        case 'cjs':
            return generateModuleSource(
                stylableResult,
                moduleId,
                [
                    ...staticRequests.map(request => `require(${JSON.stringify(request)})`),
                    `const runtime = require(${JSON.stringify('@stylable/runtime')})`
                ],
                `runtime.$`,
                `runtime.create`,
                `runtime.createRenderable`,
                includeCSSInJS ? JSON.stringify(stylableResult.meta.outputAst!.toString()) : '""',
                depth,
                'module.exports',
                '',
                renderableOnly
            );
    }
    throw new Error('Unknown module format ' + moduleFormat);
}

function generateTypescriptDefinition() {
    throw new Error('Not implemented');
}
