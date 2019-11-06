import postcss from 'postcss';
import postcssNested from 'postcss-nested';
import { CSSObject } from './types';
const postcssJS = require('postcss-js');
const safeParser = require('postcss-safe-parser');

const postcssConfig = { parser: postcssJS };
// any until issue resolved: https://github.com/postcss/postcss-nested/issues/88
const processor = postcss([postcssNested as any]);

export function cssObjectToAst(cssObject: CSSObject, sourceFile = '') {
    return processor.process(cssObject, { from: sourceFile, ...postcssConfig });
}

export function safeParse(
    css: string,
    options: postcss.ProcessOptions = { from: 'style.css' }
): postcss.Root {
    return safeParser(css, options);
}
