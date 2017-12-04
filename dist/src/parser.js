"use strict";
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
var postcss = require("postcss");
var postcssJS = require('postcss-js');
var postcssNested = require('postcss-nested');
var safeParser = require('postcss-safe-parser');
var postcssConfig = { parser: postcssJS };
var processor = postcss([postcssNested]);
function cssObjectToAst(cssObject, sourceFile) {
    if (sourceFile === void 0) { sourceFile = ''; }
    return processor.process(cssObject, __assign({ from: sourceFile }, postcssConfig));
}
exports.cssObjectToAst = cssObjectToAst;
function safeParse(css, options) {
    if (options === void 0) { options = { from: 'style.css' }; }
    return safeParser(css, options);
}
exports.safeParse = safeParse;
//# sourceMappingURL=parser.js.map