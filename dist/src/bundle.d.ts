import { Stylable } from './stylable';
import { StylableMeta } from './stylable-processor';
import { Pojo } from './types';
export declare type OverrideVars = Pojo<string>;
export interface OverrideDef {
    overrideRoot: StylableMeta;
    overrideVars: OverrideVars;
}
export interface ThemeOverrideData {
    index: number;
    path: string;
    overrideDefs: OverrideDef[];
}
export declare type ThemeEntries = Pojo<ThemeOverrideData>;
export declare type Process = (entry: string) => StylableMeta;
export declare type Transform = (meta: StylableMeta) => StylableMeta;
export declare class Bundler {
    private stylable;
    private themeAcc;
    private outputCSS;
    constructor(stylable: Stylable);
    addUsedFile(path: string): void;
    getDependencyPaths({entries, themeEntries}?: {
        entries: string[];
        themeEntries: ThemeEntries;
    }): string[];
    getUsedFilePaths(): string[];
    generateCSS(usedSheetPaths?: string[], onBeforePrint?: (meta: StylableMeta) => void): string;
    private process(fullpath);
    private transform(meta);
    private resolvePath(ctx, path);
    private aggregateTheme(entryMeta, entryIndex, themeEntries);
    private cleanUnused(meta, usedPaths);
    private applyOverrides(entryMeta, pathToIndex, themeEntries);
}
