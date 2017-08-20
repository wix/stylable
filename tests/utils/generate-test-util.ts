import { Pojo } from "../../src/types";
import { cachedProcessFile } from "../../src/cached-process-file";
import { StylableMeta, process, SDecl } from "../../src/postcss-process";
import * as postcss from 'postcss';
import { StylableTransformer, StylableResults } from "../../src/stylable-transformer";
import { Diagnostics } from "../../src/diagnostics";
import { removeUnusedRules } from "../../src/stylable-utils";
import { valueReplacer } from "../../src/value-template";
const deindent = require('deindent');
export interface File { content: string; mtime?: Date; namespace?: string }
export interface Config { entry: string, files: Pojo<File>, usedFiles?: string[] }

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
                return deindent(files[path].content).trim()
            },
            statSync(path) {
                return {
                    mtime: files[path].mtime!
                };
            }
        }
    )

    function requireModule(path: string) {
        if (!path.match(/\.js$/)) {
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

    const result = t.transform(fileProcessor.process(config.entry));

    return result
}

export function generateStylableRoot(config: Config) {
    return generateFromMock(config).meta.ast;
}


export function generateStylableExports(config: Config) {
    return generateFromMock(config).exports;
}


export function generateStylableOutput(config: Config) {
    if (!config.usedFiles) {
        throw new Error('usedFiles is not optional in generateStylableOutput');
    }

    return generateStylableBundle(config.usedFiles, (entry) => {
        return generateFromMock({ ...config, entry });
    });
}




export function generateStylableBundle(usedFiles: string[], generate: (entry: string) => StylableResults) {

    // interface ExtraModule {
    //     id: string
    //     imports: string[]
    // }

    // const extraEntries: ExtraModule[] = [];
    interface ThemeEntry {
        index: number;
        themeMeta: StylableMeta;
        overrides: Array<{ srcMeta: StylableMeta, declarations: postcss.Declaration[] }>;
    }
    const themeEntries: { [s: string]: ThemeEntry } = {};

    const outputCSS = usedFiles.map((entry, index) => {

        // const moduleImports: ExtraModule = { id: entry, imports: [] };
        const { meta } = generate(entry);
        meta.imports.forEach((_import) => {
            if (_import.theme || themeEntries[_import.from]) {

                if (usedFiles.indexOf(_import.from) !== -1) {
                    throw new Error('theme should not be imported from JS')
                } else if (themeEntries[_import.from]) {
                    themeEntries[_import.from].index = index;
                    if(_import.overrides.length) {
                        themeEntries[_import.from].overrides.unshift({ srcMeta: meta, declarations: _import.overrides });
                    }
                } else {
                    const { meta: depMeta } = generate(_import.from);
                    themeEntries[_import.from] = { index, themeMeta: depMeta, overrides: _import.overrides.length ? [{ srcMeta: meta, declarations: _import.overrides }] : [] };
                }
                // moduleImports.imports.push(_import.from);
            }
            removeUnusedRules(meta, _import, usedFiles);
        });
        // extraEntries.push(moduleImports);
        return meta.ast.toString();

    });

    Object.keys(themeEntries).reverse().forEach(themePath => {
        const { index, themeMeta, overrides } = themeEntries[themePath];


        themeMeta.imports.forEach((_import) => {
            removeUnusedRules(themeMeta, _import, usedFiles);
        });

        const themeEntry = [themeMeta.ast.toString()];
        
        overrides.forEach(({ srcMeta, declarations }) => {
            const clone = themeMeta.ast.clone();
            var data: Pojo<string> = {}
            declarations.forEach((declOverride) => {
                data[declOverride.prop] = declOverride.value;
            });
            const toRemove: postcss.Declaration[] = [];

            clone.walkRules((rule) => {
                rule.selector = rule.selector.replace(new RegExp(themeMeta.namespace + '--' + themeMeta.root), srcMeta.namespace + '--' + srcMeta.root);
                rule.walkDecls((decl: SDecl) => {

                    const output = valueReplacer(decl.sourceValue, data, (value) => {
                        return value;
                    });

                    if (decl.value === output) {
                        toRemove.push(decl);
                    } else {
                        decl.value = output;
                    }
                });

            });

            toRemove.forEach((decl)=>{
                const parent = decl.parent;
                decl.remove();
                if(parent && parent.nodes && parent.nodes.length === 0){
                    parent.remove();
                }
            })

            themeEntry.unshift(clone.toString());
        });

        outputCSS.splice(index + 1, 0, ...themeEntry);
    });

    // extraEntries.forEach((mod) => {
    //     if (mod.imports.length) {
    //         outputCSS.push(generateStylableBundle(mod.imports, generate));
    //     }
    // })


    return outputCSS.reverse().join('\n');

}



//