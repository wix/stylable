import * as postcss from 'postcss';
import { CSSObject } from './types';
export declare function cssObjectToAst(cssObject: CSSObject, sourceFile?: string): postcss.LazyResult;
export declare function safeParse(css: string, options?: postcss.ProcessOptions): any;
