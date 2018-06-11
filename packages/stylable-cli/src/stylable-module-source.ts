const deindent = require('deindent');
import { StylableResults } from 'stylable';

const runtimePath = require.resolve('stylable-runtime/cjs/css-runtime-stylesheet');

export function generateModuleSource(
    stylableResult: StylableResults,
    injectCSS: boolean
): string {
    const { exports, meta } = stylableResult;
    const localsExports = JSON.stringify(exports);
    const root = JSON.stringify(meta.root);
    const namespace = JSON.stringify(meta.namespace);
    const css = injectCSS ? JSON.stringify(meta.outputAst!.toString()) : 'null';
    // const imports: string[] = meta.imports.map(
    //     i => (i.fromRelative.match(/\.st\.css$/) ? `require("${i.fromRelative}");` : '')
    // );
    return deindent`
        module.exports = require("${runtimePath}").create(
            ${root},
            ${namespace},
            ${localsExports},
            ${css},
            -1,
            module.id
        );
    `;
}
