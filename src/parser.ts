import * as postcss from "postcss";
const postcssJS = require("postcss-js");
const postcssNested = require("postcss-nested");
const safeParser = require("postcss-safe-parser");

const postcssConfig = { parser: postcssJS };
const processor = postcss([postcssNested]);

export function cssObjectToAst(cssObject: Stylable.CSSObject, sourceFile = '') {
    return processor.process(cssObject, {from: sourceFile, ...postcssConfig});
}

export function safeParse(css: string, options: postcss.ProcessOptions = {from: 'style.css'}) {
    return safeParser(css, options);
}
