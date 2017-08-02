import * as postcss from 'postcss';
import { process, StyleableMeta } from './postcss-process';
import * as path from 'path';
import { Pojo } from "./types";
import { FileProcessor } from "./cached-process-file";



export interface Options {
    fileProcessor: FileProcessor<StyleableMeta>
}


// function resolveImport(_import: Imported, sourcePath: string, fileProcessor: FileProcessor<StyleableMeta>) {
//     const importPath = resolve(dirname(sourcePath), _import.from);
//     return fileProcessor.process(importPath);
// }

// function resolveImports(stylableMeta: StyleableMeta, resolvedImports: Pojo<StyleableMeta | any>, fileProcessor: FileProcessor<StyleableMeta>) {
//     stylableMeta.imports.forEach((i) => {
//         resolvedImports[i.from] = resolveImport(i, stylableMeta.source, fileProcessor);
//     });
// }


export function generate(root: postcss.Root, options: Options) {
    const fileProcessor = options.fileProcessor;
    if (!fileProcessor) {
        throw new Error('missing fileProcessor');
    }

    const meta = process(root);

    function resolve(_import) {
        const importPath = path.resolve(path.dirname(meta.source), _import.from);
        return fileProcessor.process(importPath);
    }

    const processedImports = meta.imports.reduce((imports, i) => {
        const importPath = path.resolve(path.dirname(meta.source), i.from);
        imports[i.from] = fileProcessor.process(importPath);
        return imports;
    }, {} as Pojo<StyleableMeta>);

    return root.toString();

}
