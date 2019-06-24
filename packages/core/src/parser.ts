import postcss from 'postcss';
import postcssNested from 'postcss-nested';
import { CSSObject } from './types';
const postcssJS = require('postcss-js');
const safeParser = require('postcss-safe-parser');

const postcssConfig = { parser: postcssJS };
const processor = postcss([postcssNested]);

export function cssObjectToAst(cssObject: CSSObject, sourceFile = '') {
    return processor.process(cssObject, { from: sourceFile, ...postcssConfig });
}

export function safeParse(
    css: string,
    options: postcss.ProcessOptions = { from: '/style.css' }
): postcss.Root {
    const parsedAST = safeParser(css, options);
    const { from } = options;

    if (from && parsedAST.source) {
        const { input } = parsedAST.source;

        // postcss runs path.resolve, which messes up posix style paths when running on windows
        Object.defineProperty(input, 'from', { value: from });
        parsedAST.source.input.file = from;
    }
    return parsedAST;
}
