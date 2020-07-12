import postcss from 'postcss';
import postcssNested from 'postcss-nested';
import type { CSSObject } from './types';
const postcssJS = require('postcss-js');
const safeParser = require('postcss-safe-parser');

const postcssConfig = { parser: postcssJS };
const processor = postcss([postcssNested()]);

export function cssObjectToAst(cssObject: CSSObject, sourceFile = '') {
    return processor.process(cssObject, { from: sourceFile, ...postcssConfig });
}

export function safeParse(
    css: string,
    options: postcss.ProcessOptions = { from: 'style.css' }
): postcss.Root {
    return safeParser(css, options);
}
