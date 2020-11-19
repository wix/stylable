import postcss, { ProcessOptions, Root } from 'postcss';
import postcssNested from 'postcss-nested';
import postcssJS from 'postcss-js';
import safeParser from 'postcss-safe-parser';
import { CSSObject } from './types';

const processor = postcss([postcssNested()]);

export function cssObjectToAst(cssObject: CSSObject, sourceFile = '') {
    return processor.process(cssObject, { from: sourceFile, parser: postcssJS });
}

export type CssParser = typeof safeParser;

export function safeParse(css: string, options: ProcessOptions = { from: 'style.css' }, parser = safeParser ): Root {
    return parser(css, options);
}
