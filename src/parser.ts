import { CSSObject } from "./types";
import { STYLABLE_VALUE_MATCHER } from "./stylable-value-parsers";

import * as postcss from "postcss";

const objectify = require("../modules/post-css-objectify");

const postcssJS = require("postcss-js");
const postcssNested = require("postcss-nested");
const safeParser = require("postcss-safe-parser");



const stylableObjectifyConfig = {
    noCamel: [STYLABLE_VALUE_MATCHER],
    noCamelSelector: [/^:vars$/],
    mergeSame: false
};


const postcssConfig = { parser: postcssJS };
const processor = postcss([postcssNested]);

export function cssObjectToAst(cssObject: CSSObject, sourceFile = '') {
    return processor.process(cssObject, {from: sourceFile, ...postcssConfig});
}

export function stringifyCSSObject(cssObject: CSSObject): string {
    return cssObjectToAst(cssObject).css;
}


export function objectifyCSS(css: string): CSSObject {
    // return stylis('', css);
    return objectify(safeParser(css), stylableObjectifyConfig);
}

export function fromCSS(_css: string, _namespace?: string, _source?: string) {
    throw "TODO: implement";
}

export function safeParse(css: string, options: postcss.ProcessOptions = {from: 'style.css'}) {
    return safeParser(css, options);
}
