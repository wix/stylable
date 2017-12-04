import { FileProcessor } from './cached-process-file';
import { StylableMeta, StylableSymbol } from './stylable-processor';
export interface CSSResolve {
    _kind: 'css';
    symbol: StylableSymbol;
    meta: StylableMeta;
}
export interface JSResolve {
    _kind: 'js';
    symbol: any;
    meta: null;
}
export declare class StylableResolver {
    protected fileProcessor: FileProcessor<StylableMeta>;
    protected requireModule: (modulePath: string) => any;
    constructor(fileProcessor: FileProcessor<StylableMeta>, requireModule: (modulePath: string) => any);
    resolveVarValue(meta: StylableMeta, name: string): string | null;
    resolveVarValueDeep(meta: StylableMeta, name: string): {
        value: string | null;
        next: CSSResolve | JSResolve | null | undefined;
    };
    resolveClass(meta: StylableMeta, symbol: StylableSymbol): CSSResolve | null;
    resolveElement(meta: StylableMeta, symbol: StylableSymbol): CSSResolve | null;
    resolveName(meta: StylableMeta, symbol: StylableSymbol, isElement: boolean): CSSResolve | null;
    resolve(maybeImport: StylableSymbol | undefined): CSSResolve | JSResolve | null;
    deepResolve(maybeImport: StylableSymbol | undefined): CSSResolve | JSResolve | null;
    resolveExtends(meta: StylableMeta, className: string, isElement?: boolean): CSSResolve[];
}
