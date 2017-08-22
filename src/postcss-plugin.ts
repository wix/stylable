import * as postcss from 'postcss';
import { StylableTransformer } from "./stylable-transformer";
import { Diagnostics } from "./diagnostics";
import { safeParse } from "./parser";
import { cachedProcessFile, FileProcessor, MinimalFS } from "./cached-process-file";
import { create } from "./runtime";
import { StylableMeta, process } from "./postcss-process";
import { readFileSync, statSync } from "fs";

export interface PluginOptions { }


export function createGenerator(fileProcessor: FileProcessor<StylableMeta>, fs: MinimalFS) {
    fs = fs || {
        readFileSync,
        statSync
    };

    fileProcessor = fileProcessor || cachedProcessFile<StylableMeta>((from, content) => {
        return process(postcss.parse(content, { from }));
    }, fs)


    return function generate(source: string, path: string) {

        const root = safeParse(source, { from: path });

        const meta = process(root);

        fileProcessor.add(meta.source, meta);

        const transformer = new StylableTransformer({
            fileProcessor,
            requireModule: require,
            diagnostics: new Diagnostics()
        });

        const { exports } = transformer.transform(meta);

        create(meta.root, meta.namespace, exports, source, meta.source)

    }

}

// export const postcssStylable = postcss.plugin('stylable', (options: PluginOptions) => {
//     // return (root) => generate(root, options);
// });
