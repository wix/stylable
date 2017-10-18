import { StylableTransformer } from "./stylable-transformer";
import { Diagnostics } from "./diagnostics";
import { safeParse } from "./parser";
import { cachedProcessFile, MinimalFS, FileProcessor } from "./cached-process-file";
import { create } from "./runtime";
import { StylableMeta, process } from "./stylable-processor";

export function createGenerator(
    fs: MinimalFS = {
        readFileSync(_path: string) { return '' },
        statSync(_path: string) { return { mtime: new Date(0) } }
    },
    requireModule: (moduleId: string) => any = function (_path: string): any { return {} },
    delimiter: string = '--') {


    const fileProcessor: FileProcessor<StylableMeta> = cachedProcessFile<StylableMeta>((from, content) => {
        return process(safeParse(content, { from }));
    }, fs);

    function output(meta: StylableMeta) {
        const diagnostics = new Diagnostics();

        const transformer = new StylableTransformer({
            fileProcessor,
            requireModule,
            diagnostics,
            delimiter
        });

        const { exports } = transformer.transform(meta);

        return {
            meta,
            transformer,
            diagnostics,
            runtime: create(meta.root, meta.namespace, exports, '', meta.source)
        };
    }

    return {
        fileProcessor,
        delimiter,
        scope: StylableTransformer.prototype.scope,
        fromCSS(source: string, path: string = '/unknown.st.css') {
            const root = safeParse(source, { from: path });
            const meta = process(root);
            fileProcessor.add(meta.source, meta);
            return output(meta);
        },
        fromFile(path: string) {
            const meta = fileProcessor.process(path);
            return output(meta);
        }
    }

}
