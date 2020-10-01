import {
    isAsset,
    makeAbsolute,
    processDeclarationUrls,
    Stylable,
    StylableMeta,
    StylableResults,
    findMetaDependencies,
} from '@stylable/core';
import { resolveNamespace } from '@stylable/node';
import { generateModuleSource } from '@stylable/module-utils';
import { StylableOptimizer } from '@stylable/optimizer';
import { nodeFs } from '@file-services/node';
import { createHash } from 'crypto';
import { Plugin, PluginContext } from 'rollup';
import { tokenizeImports } from 'toky';
import MagicString from 'magic-string';
import { getType } from 'mime';

const production = !process.env.ROLLUP_WATCH;

interface PluginOptions {
    extract?: boolean;
    minify?: boolean;
    inlineAssets?: boolean;
    cssInJS?: boolean;
}

const INIT_CODE = `import {$} from "@stylable/runtime"; if(typeof window !== 'undefined'){$.init(window);}`;

export function stylableRollupPlugin({
    extract = false,
    minify = false,
    inlineAssets = true,
    cssInJS = true,
}: PluginOptions = {}): Plugin {
    let stylable!: Stylable;
    let extracted!: Map<any, any>;
    let emittedAssets!: Map<string, string>;

    return {
        name: 'Stylable',
        buildStart(rollupOptions) {
            extracted = extracted || new Map();
            emittedAssets = emittedAssets || new Map();

            stylable =
                stylable ||
                Stylable.create({
                    fileSystem: nodeFs,
                    projectRoot: rollupOptions.context,
                    mode: production ? 'production' : 'development',
                    resolveNamespace: resolveNamespace,
                    optimizer: new StylableOptimizer(),
                });
        },
        load(id) {
            if (id.endsWith('.st.css')) {
                const code = nodeFs.readFileSync(id, 'utf8');
                return { code, moduleSideEffects: false };
            }
            return null;
        },
        transform(source, id) {
            if (this.getModuleInfo(id).isEntry) {
                return injectStylableRuntimeInit(source);
            }
            if (!id.endsWith('.st.css')) {
                return null;
            }
            const res = stylable.transform(source, id);
            const depth = '0';
            const assetsIds = emitAssets(id, this, stylable, res.meta, emittedAssets, inlineAssets);
            const css = generateCssString(res.meta, minify, stylable, assetsIds);
            const code = generateStylableModuleCode(res, css, depth);

            findMetaDependencies(
                res.meta,
                (dep) => {
                    this.addWatchFile(dep.source);
                },
                stylable.createTransformer()
            );

            if (extract) {
                extracted.set(id, css);
            }

            return {
                code,
                map: null,
            };
        },
        // async generateBundle(_, bundle) {
        // },
    };
}

function injectStylableRuntimeInit(source: string) {
    const ms = new MagicString(source);
    const imports = tokenizeImports(source);
    const lastImport = imports[imports.length - 1];
    if (lastImport) {
        ms.appendRight(lastImport.end, INIT_CODE);
    } else {
        ms.prepend(INIT_CODE);
    }
    return {
        code: ms.toString(),
        map: ms.generateMap(),
    };
}

function generateStylableModuleCode(res: StylableResults, css: string, depth: string) {
    const renderOnly = false;
    const importKey = renderOnly ? 'createRenderable' : 'create';
    const staticRequests: string[] = [];

    const cssImports = res.meta.imports.map(({ fromRelative }) => {
        return {
            request: fromRelative,
            isUsed: true,
        };
    });

    const used = cssImports.filter(({ isUsed }) => isUsed);
    const cssImportsRequests = used.map(
        ({ request }, i) => `import {classes as _${i}_} from ${JSON.stringify(request)};`
    );

    const usageVars = used.map((_, i) => `$._used = _${i}_;`).join('\n');

    return generateModuleSource(
        res,
        JSON.stringify(res.meta.namespace),
        [
            ...cssImportsRequests,
            ...staticRequests.map((request) => `import ${JSON.stringify(request)};`),
            `import { $, ${importKey} } from "@stylable/runtime";`,
        ],
        `$`,
        `create`,
        `createRenderable`,
        JSON.stringify(css),
        depth,
        'const { classes, keyframes, vars, stVars, cssStates, style, st, $depth, $id, $css }',
        `${usageVars}
        export { classes, keyframes, vars, stVars, cssStates, style, st, $depth, $id, $css };`,
        renderOnly
    );
}

function isUsed(named: Record<string, string>, res: StylableResults, defaultExport: string) {
    Object.keys(named).some((name) => {
        const symb = res.meta.mappedSymbols[name];
        if (symb?._kind === 'class') {
            return symb.alias;
        }
    });
    const symb = res.meta.mappedSymbols[defaultExport];
}

function generateCssString(
    meta: StylableMeta,
    minify: boolean,
    stylable: Stylable,
    assetsIds: string[]
) {
    const css = meta
        .outputAst!.toString()
        .replace(/__css_asset_placeholder__(.*?)__/g, (_$0, $1) =>
            JSON.stringify(assetsIds[Number($1)])
        );

    if (minify && stylable.optimizer) {
        return stylable.optimizer.minifyCSS(css);
    }
    return css;
}

function emitAssets(
    id: string,
    ctx: PluginContext,
    stylable: Stylable,
    meta: StylableMeta,
    emittedAssets: Map<string, string>,
    inlineAssets: boolean
): string[] {
    const assets = getUrlDependencies(meta, nodeFs.dirname(id), stylable.projectRoot);
    const assetsIds: string[] = [];
    for (const asset of assets) {
        if (inlineAssets) {
            const fileBuffer = nodeFs.readFileSync(asset, 'base64');
            const mimeType = getType(nodeFs.extname(asset));
            assetsIds.push(`data:${mimeType};base64,${fileBuffer}`);
        } else {
            const name = nodeFs.basename(asset);
            let hash = emittedAssets.get(asset);
            if (hash) {
                assetsIds.push(`${hash}_${name}`);
            } else {
                const fileBuffer = nodeFs.readFileSync(asset);
                hash = createHash('sha1').update(fileBuffer).digest('hex');
                const fileName = `${hash}_${name}`;
                if (emittedAssets.has(fileName)) {
                    assetsIds.push(fileName);
                } else {
                    emittedAssets.set(fileName, hash);
                    emittedAssets.set(asset, hash);
                    assetsIds.push(fileName);
                    ctx.emitFile({
                        type: 'asset',
                        fileName,
                        source: fileBuffer,
                    });
                }
            }
        }
    }
    return assetsIds;
}

function rewriteUrl(node: any, replacementIndex: number) {
    node.stringType = '';
    delete node.innerSpacingBefore;
    delete node.innerSpacingAfter;
    node.url = `__css_asset_placeholder__${replacementIndex}__`;
}

function getUrlDependencies(meta: StylableMeta, importerDir: string, rootContext: string) {
    const urls: string[] = [];
    meta.outputAst!.walkDecls((node) =>
        processDeclarationUrls(
            node,
            (node) => {
                const { url } = node;
                if (url && isAsset(url)) {
                    rewriteUrl(node, urls.length);
                    urls.push(makeAbsolute(url, rootContext, importerDir));
                }
            },
            true
        )
    );
    return urls;
}

// import path from 'path';
// import { createFilter } from 'rollup-pluginutils';
// // import Concat from 'concat-with-sourcemaps';
// import Loaders from './loaders';
// import normalizePath from './utils/normalize-path';

/**
 * Recursivly get the correct import order from rollup
 * We only process a file once
 *
 * @param {string} id
 * @param {Function} getModuleInfo
 * @param {Set<string>} seen
 */
// function getRecursiveImportOrder(id, getModuleInfo, seen = new Set()) {
//     if (seen.has(id)) {
//         return [];
//     }

//     seen.add(id);

//     const result = [id];
//     getModuleInfo(id).importedIds.forEach((importFile) => {
//         result.push(...getRecursiveImportOrder(importFile, getModuleInfo, seen));
//     });

//     return result;
// }

// export default (options = {}) => {
//     const filter = createFilter(options.include, options.exclude);
//     const postcssPlugins = Array.isArray(options.plugins)
//         ? options.plugins.filter(Boolean)
//         : options.plugins;
//     const { sourceMap } = options;
//     const postcssLoaderOptions = {
//         /** Inject CSS as `<style>` to `<head>` */
//         inject:
//             typeof options.inject === 'function' ? options.inject : inferOption(options.inject, {}),
//         /** Extract CSS */
//         extract: typeof options.extract === 'undefined' ? false : options.extract,
//         /** CSS modules */
//         onlyModules: options.modules === true,
//         modules: inferOption(options.modules, false),
//         namedExports: options.namedExports,
//         /** Automatically CSS modules for .module.xxx files */
//         autoModules: options.autoModules,
//         /** Options for cssnano */
//         minimize: inferOption(options.minimize, false),
//         /** Postcss config file */
//         config: inferOption(options.config, {}),
//         /** PostCSS target filename hint, for plugins that are relying on it */
//         to: options.to,
//         /** PostCSS options */
//         postcss: {
//             parser: options.parser,
//             plugins: postcssPlugins,
//             syntax: options.syntax,
//             stringifier: options.stringifier,
//             exec: options.exec,
//         },
//     };
//     let use = ['sass', 'stylus', 'less'];
//     if (Array.isArray(options.use)) {
//         use = options.use;
//     } else if (options.use !== null && typeof options.use === 'object') {
//         use = [
//             ['sass', options.use.sass || {}],
//             ['stylus', options.use.stylus || {}],
//             ['less', options.use.less || {}],
//         ];
//     }

//     use.unshift(['postcss', postcssLoaderOptions]);

//     const loaders = new Loaders({
//         use,
//         loaders: options.loaders,
//         extensions: options.extensions,
//     });

//     const extracted = new Map();

//     return {
//         name: 'postcss',

//         async transform(code, id) {
//             if (!filter(id) || !loaders.isSupported(id)) {
//                 return null;
//             }

//             if (typeof options.onImport === 'function') {
//                 options.onImport(id);
//             }

//             const loaderContext = {
//                 id,
//                 sourceMap,
//                 dependencies: new Set(),
//                 warn: this.warn.bind(this),
//                 plugin: this,
//             };

//             const result = await loaders.process(
//                 {
//                     code,
//                     map: undefined,
//                 },
//                 loaderContext
//             );

//             for (const dep of loaderContext.dependencies) {
//                 this.addWatchFile(dep);
//             }

//             if (postcssLoaderOptions.extract) {
//                 extracted.set(id, result.extracted);
//                 return {
//                     code: result.code,
//                     map: { mappings: '' },
//                 };
//             }

//             return {
//                 code: result.code,
//                 map: result.map || { mappings: '' },
//             };
//         },

//         augmentChunkHash() {
//             if (extracted.size === 0) return;
//             const extractedValue = [...extracted].reduce(
//                 (object, [key, value]) => ({
//                     ...object,
//                     [key]: value,
//                 }),
//                 {}
//             );
//             return JSON.stringify(extractedValue);
//         },

//         async generateBundle(options_, bundle) {
//             if (extracted.size === 0 || !(options_.dir || options_.file)) return;

//             // TODO: support `[hash]`
//             const dir = options_.dir || path.dirname(options_.file);
//             const file =
//                 options_.file ||
//                 path.join(
//                     options_.dir,
//                     Object.keys(bundle).find((fileName) => bundle[fileName].isEntry)
//                 );
//             const getExtracted = () => {
//                 let fileName = `${path.basename(file, path.extname(file))}.css`;
//                 if (typeof postcssLoaderOptions.extract === 'string') {
//                     if (path.isAbsolute(postcssLoaderOptions.extract)) {
//                         fileName = normalizePath(path.relative(dir, postcssLoaderOptions.extract));
//                     } else {
//                         fileName = normalizePath(postcssLoaderOptions.extract);
//                     }
//                 }

//                 const concat = new Concat(true, fileName, '\n');
//                 const entries = [...extracted.values()];
//                 const { modules, facadeModuleId } = bundle[normalizePath(path.relative(dir, file))];

//                 if (modules) {
//                     const moduleIds = getRecursiveImportOrder(facadeModuleId, this.getModuleInfo);
//                     entries.sort((a, b) => moduleIds.indexOf(a.id) - moduleIds.indexOf(b.id));
//                 }

//                 for (const result of entries) {
//                     const relative = normalizePath(path.relative(dir, result.id));
//                     const map = result.map || null;
//                     if (map) {
//                         map.file = fileName;
//                     }

//                     concat.add(relative, result.code, map);
//                 }

//                 let code = concat.content;

//                 if (sourceMap === 'inline') {
//                     code += `\n/*# sourceMappingURL=data:application/json;base64,${Buffer.from(
//                         concat.sourceMap,
//                         'utf8'
//                     ).toString('base64')}*/`;
//                 } else if (sourceMap === true) {
//                     code += `\n/*# sourceMappingURL=${path.basename(fileName)}.map */`;
//                 }

//                 return {
//                     code,
//                     map: sourceMap === true && concat.sourceMap,
//                     codeFileName: fileName,
//                     mapFileName: fileName + '.map',
//                 };
//             };

//             if (options.onExtract) {
//                 const shouldExtract = await options.onExtract(getExtracted);
//                 if (shouldExtract === false) {
//                     return;
//                 }
//             }

//             let { code, codeFileName, map, mapFileName } = getExtracted();
//             // Perform cssnano on the extracted file
//             if (postcssLoaderOptions.minimize) {
//                 const cssOptions = postcssLoaderOptions.minimize;
//                 cssOptions.from = codeFileName;
//                 if (sourceMap === 'inline') {
//                     cssOptions.map = { inline: true };
//                 } else if (sourceMap === true && map) {
//                     cssOptions.map = { prev: map };
//                     cssOptions.to = codeFileName;
//                 }

//                 const result = await require('cssnano').process(code, cssOptions);
//                 code = result.css;

//                 if (sourceMap === true && result.map && result.map.toString) {
//                     map = result.map.toString();
//                 }
//             }

//             this.emitFile({
//                 fileName: codeFileName,
//                 type: 'asset',
//                 source: code,
//             });
//             if (map) {
//                 this.emitFile({
//                     fileName: mapFileName,
//                     type: 'asset',
//                     source: map,
//                 });
//             }
//         },
//     };
// };
