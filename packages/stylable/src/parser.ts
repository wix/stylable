import { CSSObject } from "./types";
import { STYLABLE_VALUE_MATCHER } from "./stylable-value-parsers";  

const objectify = require("../modules/post-css-objectify");
const stylis = require("stylis");
const plugin = require("../modules/plugin");
const postcssJS = require("postcss-js");
const postcssNested = require("postcss-nested");
const postcss = require("postcss");


const stylableObjectifyConfig = {
    noCamel: [STYLABLE_VALUE_MATCHER],
    noCamelSelector: [/^:vars$/]
};

stylis.set({ compress: false, lossless: true, global: false, preserve: true });
stylis.use(false);
stylis.use(plugin(stylableObjectifyConfig));

const postcssConfig = { parser: postcssJS };
const processor = postcss([postcssNested]);

export const hasOwn = Function.prototype.call.bind(Object.prototype.hasOwnProperty);

export function stringifyCSSObject(cssObject: CSSObject): string {
    return processor.process(cssObject, postcssConfig).css;
}

export function objectifyCSSStylis(css: string): CSSObject {
    return stylis('', css);
}

export function objectifyCSS(css: string): CSSObject {
    // return stylis('', css);
    return objectify(postcss.parse(css), stylableObjectifyConfig);
}
