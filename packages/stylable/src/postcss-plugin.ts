import * as postcss from 'postcss';
import { StylableTransformer } from "./stylable-transformer";
import { Diagnostics } from "./diagnostics";
import { cachedProcessFile } from "./cached-process-file";
import { StylableMeta, process } from "./postcss-process";
import { readFileSync, statSync } from "fs";

export interface PluginOptions {}

const fileProcessor = cachedProcessFile<StylableMeta>((from, content) => {
    return process(postcss.parse(content, { from }));
},
    {
        readFileSync,
        statSync
    }
)

function generate(root: postcss.Root, _options: PluginOptions) {

    const meta = process(root);

    fileProcessor.add(meta.source, meta);

    const transformer = new StylableTransformer({
        fileProcessor,
        requireModule: require,
        diagnostics: new Diagnostics()
    });

    const { exports } = transformer.transform(meta);

    console.log(exports);

}

export const postcssStylable = postcss.plugin('stylable', (options: PluginOptions) => {
    return (root) => generate(root, options);
});
