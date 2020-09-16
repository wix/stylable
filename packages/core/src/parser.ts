import postcss, { ProcessOptions, Root } from 'postcss';
import postcssNested from 'postcss-nested';
import postcssJS from 'postcss-js';
import safeParser from 'postcss-safe-parser';
import { CSSObject } from './types';

const processor = postcss([postcssNested()]);

export function cssObjectToAst(cssObject: CSSObject, sourceFile = '') {
    return processor.process(cssObject, { from: sourceFile, parser: postcssJS });
}

export function safeParse(css: string, options: ProcessOptions = { from: 'style.css' }): Root {
    try {
        return safeParser(css, options);
    } catch (e) {
        console.error(
            `postcss-safe-parser FAILED for ${options.from ?? 'style.css'} with content:\n${css}`
        );
        throw e;
    }
}
