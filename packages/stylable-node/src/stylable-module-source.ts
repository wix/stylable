import { StylableResults } from 'stylable';

export function generateModuleSource(
    stylableResult: StylableResults,
    injectCSS: boolean,
    runtimePath: string = 'stylable-runtime'): string {
    const { exports, meta } = stylableResult;
    const localsExports = JSON.stringify(exports);
    const root = JSON.stringify(meta.root);
    const namespace = JSON.stringify(meta.namespace);
    const css = injectCSS ? JSON.stringify(meta.outputAst!.toString()) : 'null';
    const depth = '-1';
    // const imports: string[] = meta.imports.map(
    //     i => (i.fromRelative.match(/\.st\.css$/) ? `require("${i.fromRelative}");` : '')
    // );
    return `
Object.defineProperty(module, "__esModule", { value: true })
module.exports.default = require(${JSON.stringify(runtimePath)}).create(
    ${root},
    ${namespace},
    ${localsExports},
    ${css},
    ${depth},
    module.id
);
`;
}
