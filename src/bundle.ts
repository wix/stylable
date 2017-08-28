import * as postcss from 'postcss';

import { Pojo } from "./types";
import { removeUnusedRules } from "./stylable-utils";
import { StylableMeta, SDecl, Imported } from "./stylable-processor";
import { StylableResults } from "./stylable-transformer";
import { StylableResolver } from "./postcss-resolver";
import { valueReplacer } from "./value-template";

type OverrideVars = Pojo<string>;
type OverrideDef = { overrideRoot: StylableMeta, overrideVars: OverrideVars };
interface ThemeOverrideData {
    index: number;
    themeMeta: StylableMeta;
    overrideDefs: OverrideDef[];
}
type ThemeEntries = Pojo<ThemeOverrideData>; // ToDo: change name to indicate path
export type Generate = (entry: string) => StylableResults;

export function bundle(usedFiles:string[], resolver:StylableResolver, generate:Generate):{css:string} {
    const bundler = new Bundler(resolver, generate);

    usedFiles.forEach(path => bundler.addUsedFile(path));

    return {
        css: bundler.generateCSS()
    };
}
export class Bundler {
    private themeAcc: ThemeEntries = {};
    private outputCSS: StylableMeta[] = [];
    constructor(
        private resolver:StylableResolver, 
        private generate:Generate
    ){}

    public addUsedFile(path:string):void {
        const entryIndex = this.outputCSS.length;
        const { meta:entryMeta } = this.generate(path);
        const aggragateDependencies = (srcMeta:StylableMeta, overrideVars:OverrideVars) => {
            srcMeta.imports.forEach(importRequest => {
                if(!importRequest.from.match(/.css$/)){
                    return;
                }       

                const isImportTheme = !!importRequest.theme;
                let themeOverrideData = this.themeAcc[importRequest.from]; // some entry already imported as theme

                const { meta: importMeta } = this.generate(importRequest.from);
                let themeOverrideVars;

                if(isImportTheme){ // collect and search sub-themes
                    // if (usedFiles.indexOf(_import.from) !== -1) { // theme cannot be used in JS - can we fix this?
                    //     throw new Error('theme should not be imported from JS')
                    // }
                    themeOverrideData = this.themeAcc[importRequest.from] = themeOverrideData || { index:entryIndex, themeMeta: importMeta, overrideDefs: []};
                    themeOverrideVars = generateThemeOverrideVars(srcMeta, importRequest, overrideVars);

                    if(themeOverrideVars){
                        themeOverrideData.overrideDefs.unshift({ overrideRoot:entryMeta, overrideVars: themeOverrideVars });
                    }
                }
                if(themeOverrideData){ // push theme above import
                    themeOverrideData.index = entryIndex;
                }
                aggragateDependencies(importMeta, themeOverrideVars || {});
            });
        }

        aggragateDependencies(entryMeta, {});
        
        this.outputCSS.push(entryMeta);
    }

    public getDependencyPaths():string[] {
        const results = this.outputCSS.map(meta => meta.source);
        const themePaths = Object.keys(this.themeAcc);
        themePaths.reverse().forEach(themePath => {
            const { index, themeMeta } = this.themeAcc[themePath];
            results.splice(index + 1, 0, themeMeta.source);
        });
        return results;
    }

    public generateCSS(usedSheetPaths:string[] = this.outputCSS.map(meta => meta.source)):string {
        let outputMetaList = this.outputCSS.concat();

        // insert theme to output
        const themePaths = Object.keys(this.themeAcc);
        themePaths.reverse().forEach(themePath => {
            const { index, themeMeta } = this.themeAcc[themePath];
            outputMetaList.splice(index + 1, 0, themeMeta);
        });

        // index each output entry position
        const pathToIndex = outputMetaList.reduce<Pojo<number>>((acc, meta, index) => {
            acc[meta.source] = index;
            return acc;
        }, {})

        // clean unused and add overrides
        outputMetaList = outputMetaList.map(entryMeta => {
            entryMeta = {...entryMeta, ast:entryMeta.ast.clone()};
            this.cleanUnused(entryMeta, usedSheetPaths);
            this.applyOverrides(entryMeta, pathToIndex);
            return entryMeta;
        });         

        // emit output CSS
        return outputMetaList.reverse()
                .map(meta => meta.ast.toString())
                .filter(entryCSS => !!entryCSS)
                .join('\n');
    }

    private cleanUnused(meta:StylableMeta, usedPaths:string[]):void {
        meta.imports.forEach(importRequest => removeUnusedRules(meta, importRequest, usedPaths));
    }

    private applyOverrides(entryMeta:StylableMeta, pathToIndex:Pojo<number>):void {
        const outputAST = entryMeta.ast;
        const outputRootSelector = getSheetNSRootSelector(entryMeta);

        // get overrides from each overridden stylesheet 
        const overrideInstructions = Object.keys(entryMeta.mappedSymbols).reduce<{ overrideDefs:OverrideDef[], overrideVarsPerDef:Pojo<OverrideVars> }>((acc, symbolId) => {
            const symbol = entryMeta.mappedSymbols[symbolId];
            const isLocalVar = (symbol._kind === 'var');
            const resolve = this.resolver.deepResolve(symbol);
            const varSourceId = isLocalVar ? symbolId : resolve && resolve.symbol.name
            //ToDo: check resolve._kind === 'css'
            const originMeta = isLocalVar ? entryMeta : resolve && resolve.meta; // ToDo: filter just vars and imported vars
            if(originMeta) {
                const overridePath = originMeta.source;
                const themeEntry = this.themeAcc[overridePath];
                if(themeEntry){
                    themeEntry.overrideDefs.forEach(overrideDef => { // ToDo: check import as
                        if(overrideDef.overrideVars[varSourceId]){
                            const overridePath = overrideDef.overrideRoot.source;
                            const overrideIndex = pathToIndex[overridePath];
                            if(!acc.overrideVarsPerDef[overridePath]){
                                acc.overrideVarsPerDef[overridePath] = { [symbolId]: overrideDef.overrideVars[varSourceId] };
                            } else {
                                acc.overrideVarsPerDef[overridePath][symbolId] = overrideDef.overrideVars[varSourceId];
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

function getSheetNSRootSelector(meta:StylableMeta):string {
    return meta.namespace + '--' + meta.root;
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
    // add context override
    for(let overrideProp in overrides){
        const symbol = srcMeta.mappedSymbols[overrideProp];
        if(symbol._kind === 'import' && symbol.import.from === themePath && !importOverrides[overrideProp]){
            importOverrides[symbol.name] = overrides[overrideProp];
        }
    }
    return Object.keys(importOverrides).length ? importOverrides : null;
}

//createAllModulesRelations
//expendRelationsToDeepImports
//forEachRelationsExtractOverrides
//forEachRelationsPrintWithOverrides
