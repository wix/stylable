import * as postcss from 'postcss';
import { parseSelector, traverseNode, SelectorAstNode, createSimpleSelectorChecker } from './selector-utils';
import { basename } from 'path';
import { Diagnostics } from "./diagnostics";
import { filename2varname, stripQ } from "./utils";
import { valueMapping, SBTypesParsers } from "./stylable-value-parsers";
import { Pojo } from "./types";
// const hash = require('murmurhash');

const parseNamed = SBTypesParsers[valueMapping.named];
const parseMixin = SBTypesParsers[valueMapping.mixin];

const stylableVendor = /^-st-/;


export function process(root: postcss.Root, diagnostics = new Diagnostics()) {

    const source = root.source.input.file || '';

    if (!source) {
        diagnostics.error(root, 'missing source filename');
    }

    const stylableMeta: StyleableMeta = {
        namespace: filename2varname(basename(source)),
        source,
        imports: [],
        vars: [],
        directives: {},
        keyframes: [],
        classes: [],
        diagnostics
    };

    root.walkAtRules((atRule) => {
        switch (atRule.name) {
            case 'namespace':
                const match = atRule.params.match(/["'](.*?)['"]/);
                match ? (stylableMeta.namespace = match[1]) : diagnostics.error(atRule, 'invalid namespace');
                break;
            case 'keyframes':
                stylableMeta.keyframes.push(atRule);
                break;
        }
    });

    // const namespace = stylableMeta.namespace + hash.v3(stylableMeta.source);

    root.walkRules((rule: SRule) => {

        rule.selectorAst = parseSelector(rule.selector);
        let isSimpleSelector = true;
        const checker = createSimpleSelectorChecker();
        traverseNode(rule.selectorAst, function (node) {
            if (!checker(node)) { isSimpleSelector = false; }
            const { name, type } = node;
            if (type === 'pseudo-class') {
                if (name === 'import') {
                    stylableMeta.imports.push(handleImport(rule, diagnostics));
                    if (rule.selector !== ':import') {
                        //TODO: add warn test;
                    }
                    return false;
                } else if (name === 'vars') {
                    stylableMeta.vars.push(rule);
                    if (rule.selector !== ':vars') {
                        //TODO: add warn test;
                    }
                    return false;
                }
            } else if (type === 'class') {
                stylableMeta.classes.push(name);
            }
            return void 0;
        });

        // Transform each rule here
        rule.walkDecls(stylableVendor, decl => {
            if (decl.prop === valueMapping.states) {
                if (!isSimpleSelector) {
                    diagnostics.warning(decl, 'cannot define pseudo states inside complex selectors');
                }
            }
            if (decl.prop === valueMapping.mixin) {
                // var mixins = parseMixin(decl.value);
                // var imported = mixins.some((mix) => {
                //     stylableMeta.imports.
                //     return mix.type;
                // })
                // if(!imported){
                //     diagnostics.warning(decl, 'cannot define pseudo states inside complex selectors');
                // }
            }

            stylableMeta.directives[decl.prop] || (stylableMeta.directives[decl.prop] = []);
            stylableMeta.directives[decl.prop].push(decl);
        });

    });

    return stylableMeta;

}

function handleImport(rule: postcss.Rule, diagnostics: Diagnostics) {

    var importObj: Import = { rule, from: '', default: '', named: {} };

    var notValidProps: postcss.Declaration[] = [];

    rule.walkDecls((decl) => {
        switch (decl.prop) {
            case valueMapping.from:
                importObj.from = stripQ(decl.value);
                break;
            case valueMapping.default:
                importObj.default = decl.value;
                break;
            case valueMapping.named:
                importObj.named = parseNamed(decl.value);
                break;
            default:
                notValidProps.push(decl);
                break;
        }
    });

    if (notValidProps.length) {
        diagnostics.warning(rule, 'unknown :import declarations: "' + notValidProps.join('", "') + '"');
    }

    if (!importObj.from) {
        diagnostics.error(rule, 'missing :import -st-from declaration');
    }

    return importObj;

}


export interface Import {
    rule: postcss.Rule;
    from?: string;
    named?: Pojo<string>;
    default?: string;
}


export interface StyleableMeta {
    source: string
    namespace: string;
    imports: Import[];
    vars: postcss.Rule[];
    keyframes: postcss.AtRule[];
    directives: { [key: string]: postcss.Declaration[] };
    classes: string[];
    diagnostics: Diagnostics;
}

export interface SRule extends postcss.Rule {
    selectorAst: SelectorAstNode;
}