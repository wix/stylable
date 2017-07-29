import * as postcss from 'postcss';
import { process, StyleableMeta } from './postcss-process';

export interface Options {
    loadFile?: (fullpath: string) => StyleableMeta
}

export default postcss.plugin('stylable', (options: Options) => {
    return (root) => {
        generate(root, options);
    };
});

export function generate(root: postcss.Root, options: Options) {
    const meta = process(root);
    const loadFile = options.loadFile;
    if (meta.imports.length && !loadFile) {
        throw meta.imports[0].rule.error('missing loadFile option');
    } else if (options.loadFile) {
        // meta.imports.map((rule) => {

        // });
    }
}
