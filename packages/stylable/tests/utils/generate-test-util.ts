import { Pojo } from "../../src/types";
import { cachedProcessFile } from "../../src/cached-process-file";
import { StylableMeta, process } from "../../src/postcss-process";
import * as postcss from "postcss";
import { StylableTransformer } from "../../src/postcss-generate";
import { Diagnostics } from "../../src/diagnostics";

export interface File { content: string; mtime?: Date; namespace?: string }
export interface Config { entry: string, files: Pojo<File> }


export function generateFromMock(config: Config) {
    const files = config.files;

    for (var file in files) {
        if (files[file].mtime === undefined) {
            files[file].mtime = new Date();
        }
    }

    const fileProcessor = cachedProcessFile<StylableMeta>((from, content) => {
        const meta = process(postcss.parse(content, { from }));
        meta.namespace = files[from].namespace || meta.namespace;
        return meta;
    },
        {
            readFileSync(path) {
                return files[path].content.trim();
            },
            statSync(path) {
                return {
                    mtime: files[path].mtime!
                };
            }
        }
    )

    function requireModule(path: string) {
        if(!path.match(/\.js$/)) {
            path += '.js';
        }
        const fn = new Function("module", "exports", files[path].content);
        const _module = {
            id: path,
            exports: {}
        }
        fn(_module, _module.exports);
        return _module.exports;
    }

    const t = new StylableTransformer({
        fileProcessor,
        requireModule,
        diagnostics: new Diagnostics()
    });

    return t.transform(fileProcessor.process(config.entry)).meta.ast;

}
