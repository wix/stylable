import { StylableResults } from '@stylable/core';

export function generateModuleSource(
    stylableResult: StylableResults,
    moduleId: string,
    beforeModule: string[],
    renderer: string,
    createFunction: string,
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
        return `${createFunction}.createRenderable(${css}, ${depth}, ${moduleId});`;
    }
    return `
${beforeModule.join('\n')}
${exportsArgument} = ${createFunction}.create(
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
