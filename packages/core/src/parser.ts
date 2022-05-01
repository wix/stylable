import postcss, { ProcessOptions, Root, parse as cssParse } from 'postcss';
import postcssNested from 'postcss-nested';
import postcssJS from 'postcss-js';
import safeParser from 'postcss-safe-parser';

export type CSSObject = any & object;

const processor = postcss([postcssNested()]);

export function cssObjectToAst(cssObject: CSSObject, sourceFile = '') {
    return processor.process(cssObject, { from: sourceFile, parser: postcssJS });
}

export type CssParser = typeof safeParse;

export function safeParse(css: string, options: ProcessOptions = { from: 'style.css' }): Root {
    return safeParser(css, options);
}

export { cssParse };
