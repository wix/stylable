import postcss from 'postcss';
import postcssNested from 'postcss-nested';
import { CSSObject } from './types';
import postcssJS from 'postcss-js';
import safeParser from 'postcss-safe-parser';

const processor = postcss([postcssNested()]);

export function cssObjectToAst(cssObject: CSSObject, sourceFile = '') {
    return processor.process(cssObject, { from: sourceFile, parser: postcssJS });
}

export function safeParse(
    css: string,
    options: postcss.ProcessOptions = { from: 'style.css' }
): postcss.Root {
    return safeParser(css, options);
}
