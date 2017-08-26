import { Pojo } from "../../src/types";
import { cachedProcessFile } from "../../src/cached-process-file";
import { StylableMeta, process, SDecl, Imported } from "../../src/stylable-processor";
import * as postcss from 'postcss';
import { StylableTransformer, StylableResults } from "../../src/stylable-transformer";
import { StylableResolver } from "../../src/postcss-resolver";
import { Diagnostics } from "../../src/diagnostics";
import { removeUnusedRules } from "../../src/stylable-utils";
import { valueReplacer } from "../../src/value-template";
import { createMinimalFS } from "../../src/memory-minimal-fs";
import { isAbsolute } from "path";
// const deindent = require('deindent');
export interface File { content: string; mtime?: Date; namespace?: string }
export interface Config { entry: string, files: Pojo<File>, usedFiles?: string[] }

export function generateInfra(config:Config){
    const { fs, requireModule } = createMinimalFS(config);
    
    const fileProcessor = cachedProcessFile<StylableMeta>((from, content) => {
        const meta = process(postcss.parse(content, { from }));
        meta.namespace = config.files[from].namespace || meta.namespace;
        return meta;
    }, fs);

    return { fs, requireModule, fileProcessor };
}

export function generateFromMock(config: Config, resolver?:StylableResolver) {
    if (!isAbsolute(config.entry)) {
        throw new Error('entry must be absolute path: ' + config.entry)
    }
    const entry = config.entry;
    
    const { requireModule, fileProcessor } = generateInfra(config);

    const t = new StylableTransformer({
        fileProcessor,
        requireModule,
        diagnostics: new Diagnostics(),
        keepValues: false
    });
    resolver && t.setResolver(resolver); /*ToDo: pass through options... */

    const result = t.transform(fileProcessor.process(entry));

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

    const { requireModule, fileProcessor } = generateInfra(config);
    const resolver = new StylableResolver(fileProcessor, requireModule);

    return generateStylableBundle(config.usedFiles, resolver, (entry) => {
        return generateFromMock({ ...config, entry }, resolver);
    });
}

type OverrideVars = Pojo<string>;
type OverrideDef = { overrideRoot: StylableMeta, overrideVars: OverrideVars };
interface ThemeOverrideData {
    index: number;
    themeMeta: StylableMeta;
    overrideDefs: OverrideDef[];
}
type ThemeEntries = Pojo<ThemeOverrideData>; // ToDo: change name to indicate path
export type Generate = (entry: string) => StylableResults;

export function generateStylableBundle(usedFiles: string[], resolver:StylableResolver, generate: Generate) {

    const themeAcc:ThemeEntries  = {};
    const outputCSS: StylableMeta[] = [];

    // aggregate used files: insert used files to output, collect theme files, remove unused imports CSS
    usedFiles.map((path, entryIndex) => {
        const { meta:entryMeta } = generate(path);

        function aggragateDependencies(srcMeta:StylableMeta, overrideVars:OverrideVars){
            walkImports(srcMeta, metaImport => {
                removeUnusedRules(srcMeta, metaImport, usedFiles);

                const isImportTheme = !!metaImport.theme;
                let themeOverrideData = themeAcc[metaImport.from]; // some entry already imported as theme

                if(isImportTheme){ // collect and search sub-themes
                    // if (usedFiles.indexOf(_import.from) !== -1) { // theme cannot be used in JS - can we fix this?
                    //     throw new Error('theme should not be imported from JS')
                    // }
                    const { meta: themeMeta } = generate(metaImport.from);
                    themeOverrideData = themeAcc[metaImport.from] = themeOverrideData || { index:entryIndex, themeMeta: themeMeta, overrideDefs: []};
                    let themeOverrideVars = generateThemeOverrideVars(srcMeta, metaImport, overrideVars);

                    if(themeOverrideVars){
                        themeOverrideData.overrideDefs.unshift({ overrideRoot:entryMeta, overrideVars: themeOverrideVars });
                    }

                    aggragateDependencies(themeMeta, themeOverrideVars || {});
                    
                }
                if(themeOverrideData){ // push theme above import
                    themeOverrideData.index = entryIndex;
                }
            });
        }

        aggragateDependencies(entryMeta, {});
        
        outputCSS.push(entryMeta);
    });

    // insert theme to output
    const themePaths = Object.keys(themeAcc);
    themePaths.reverse().forEach(themePath => {
        const { index, themeMeta } = themeAcc[themePath];
        outputCSS.splice(index + 1, 0, themeMeta);
    });

    // apply theme
    applyTheme(outputCSS, themeAcc, resolver);

    // emit output CSS
    return outputCSS.reverse()
                    .map(meta => meta.ast.toString())
                    .filter(entryCSS => !!entryCSS)
                    .join('\n');
}

function getSheetNSRootSelector(meta:StylableMeta):string {
    return meta.namespace + '--' + meta.root;
}

function walkImports(meta:StylableMeta, visit:(_import:Imported) => void):void{
    meta.imports.forEach(visit);
}

function generateThemeOverrideVars(
    srcMeta:StylableMeta, 
    {overrides:srcImportOverrides, from:themePath}:Imported, 
    overrides:OverrideVars):OverrideVars|null {
    // get override vars from import
    let importOverrides = srcImportOverrides.reduce<OverrideVars>((acc, dec) => {
        acc[dec.prop] = dec.value;
        return acc;
    }, {});
    // add context override ? there is a bug in here...
    for(let overrideProp in overrides){
        const symbol = srcMeta.mappedSymbols[overrideProp];
        if(symbol._kind === 'import' && symbol.import.from === themePath && !importOverrides[overrideProp]){
            importOverrides[overrideProp] = overrides[overrideProp];
        }
    }
    return Object.keys(importOverrides).length ? importOverrides : null;
}

function applyTheme(outputCSS:StylableMeta[], themeAcc:ThemeEntries, resolver:StylableResolver) {
    // index each output entry position
    const pathToIndex = outputCSS.reduce<Pojo<number>>((acc, meta, index) => {
        acc[meta.source] = index;
        return acc;
    }, {})

    // 
    for(let i = outputCSS.length - 1; i >= 0; --i) {
        const outputMeta = outputCSS[i];
        const outputAST = outputMeta.ast;
        const outputRootSelector = getSheetNSRootSelector(outputMeta);

        // get overrides from each overridden stylesheet 
        const overrideInstructions = Object.keys(outputMeta.mappedSymbols).reduce<{ overrideDefs:OverrideDef[], overrideVarsPerDef:Pojo<OverrideVars> }>((acc, symbolId) => {
            const symbol = outputMeta.mappedSymbols[symbolId];
            const isLocalVar = (symbol._kind === 'var');
            const resolve = resolver.deepResolve(symbol);
            
            const originMeta = isLocalVar ? outputMeta : resolve && resolve.meta;
            if(originMeta) {
                const overridePath = originMeta.source;
                const themeEntry = themeAcc[overridePath];
                if(themeEntry){
                    themeEntry.overrideDefs.forEach(overrideDef => {
                        if(overrideDef.overrideVars[symbolId]){
                            const overridePath = overrideDef.overrideRoot.source;
                            const overrideIndex = pathToIndex[overridePath];
                            if(!acc.overrideVarsPerDef[overridePath]){
                                acc.overrideVarsPerDef[overridePath] = { [symbolId]: overrideDef.overrideVars[symbolId] };
                            } else {
                                acc.overrideVarsPerDef[overridePath][symbolId] = overrideDef.overrideVars[symbolId];
                            }
                            acc.overrideDefs[overrideIndex] = overrideDef;
                        }
                    });
                }
            }
            return acc;
        }, { overrideDefs:[], overrideVarsPerDef:{} });

        // sort override instructions according to insertion order
        const sortedOverrides:{ rootSelector:string, overrideVars:OverrideVars }[] = [];
        for(let i = 0; i < overrideInstructions.overrideDefs.length; ++i) {
            const overrideDef = overrideInstructions.overrideDefs[i];
            if(overrideDef){
                const rootSelector = getSheetNSRootSelector(overrideDef.overrideRoot);
                const overrideVars = overrideInstructions.overrideVarsPerDef[overrideDef.overrideRoot.source];
                sortedOverrides.push({ rootSelector , overrideVars });
            }
        }

        // generate override rulesets
        const overrideRulesets:{ruleOverride:postcss.Rule, srcRule:postcss.Rule}[] = [];
        outputAST.walkRules(srcRule => {
            sortedOverrides.forEach(({rootSelector, overrideVars}) => {
                let overrideSelector = srcRule.selector;
                if(rootSelector !== outputRootSelector) {
                    overrideSelector = overrideSelector.replace(new RegExp(outputRootSelector), rootSelector); // scope override
                    overrideSelector = (overrideSelector === srcRule.selector) ? '.' + rootSelector + ' ' + overrideSelector : overrideSelector; // scope globals
                }
                let ruleOverride = postcss.rule({selector:overrideSelector});
                srcRule.walkDecls((decl: SDecl) => {
                    const overriddenValue = valueReplacer(decl.sourceValue, overrideVars, (value) => {
                        return value;
                    });
                    if (decl.value !== overriddenValue) {
                        ruleOverride.append(postcss.decl({prop:decl.prop, value:overriddenValue}));
                    }
                });
                if(ruleOverride.nodes && ruleOverride.nodes.length){
                    overrideRulesets.push({ruleOverride, srcRule});
                }
            });
        });
        
        overrideRulesets.reverse().forEach(({ruleOverride, srcRule}) => {
            outputAST.insertAfter(srcRule, ruleOverride);
        });
    }
}

//createAllModulesRelations
//expendRelationsToDeepImports
//forEachRelationsExtractOverrides
//forEachRelationsPrintWithOverrides
