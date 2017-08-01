import * as postcss from 'postcss';
import { parseSelector, traverseNode, SelectorAstNode, createSimpleSelectorChecker, createRootAfterSpaceChecker } from './selector-utils';
import { basename } from 'path';
import { Diagnostics } from "./diagnostics";
import { filename2varname, stripQuotation } from "./utils";
import { valueMapping, SBTypesParsers, stValues } from "./stylable-value-parsers";
import { findImportForSymbol, Import } from "./import";
import { matchValue, valueReplacer } from "./value-template";
import { Pojo } from "./types";
const hash = require('murmurhash');

const parseNamed = SBTypesParsers[valueMapping.named];
const parseMixin = SBTypesParsers[valueMapping.mixin];


export function process(root: postcss.Root, diagnostics = new Diagnostics()) {
    const source = root.source.input.file || '';

    if (!source) {
        diagnostics.error(root, 'missing source filename');
    }

    const stylableMeta: StyleableMeta = {
        namespace: '',
        source,
        imports: [],
        vars: [],
        mappedVars: {},
        directives: {},
        keyframes: [],
        classes: [],
        diagnostics
    };

    handleAtRules(root, stylableMeta, diagnostics);

    root.walkRules((rule: SRule) => {
        rule.selectorAst = parseSelector(rule.selector);
        rule.isSimpleSelector = true;

        handleSelector(rule, stylableMeta, diagnostics);
        handleMappedVars(stylableMeta, diagnostics);
        handleDeclarations(rule, stylableMeta, diagnostics);
    });

    return stylableMeta;

}

function handleSelector(rule: SRule, stylableMeta: StyleableMeta, diagnostics: Diagnostics) {

    const checker = createSimpleSelectorChecker();
    const isValidRootUsage = createRootAfterSpaceChecker();

    traverseNode(rule.selectorAst, function (node) {
        isValidRootUsage(node);
        if (!checker(node)) { rule.isSimpleSelector = false; }
        const { name, type } = node;
        if (type === 'pseudo-class') {
            if (name === 'import') {
                stylableMeta.imports.push(handleImport(rule, diagnostics));
                if (rule.selector !== ':import') {
                    diagnostics.warning(rule, 'cannot define ":import" inside a complex selector');
                }
                return false;
            } else if (name === 'vars') {
                stylableMeta.vars.push(rule);
                if (rule.selector !== ':vars') {
                    diagnostics.warning(rule, 'cannot define ":vars" inside a complex selector');
                }
                return false;
            }
        } else if (type === 'class') {
            stylableMeta.classes.push(name);
        }
        return void 0;
    });

    if (!isValidRootUsage()) {
        diagnostics.warning(rule, '.root class cannot be used after spacing');
    }

}

function handleMappedVars(stylableMeta: StyleableMeta, diagnostics: Diagnostics) {
    stylableMeta.vars.forEach((rule) => {
        rule.walkDecls((decl) => {
            stylableMeta.mappedVars[decl.prop] = valueReplacer(decl.value, stylableMeta.mappedVars, (value, name, match) => {
                if (value === undefined) {
                    diagnostics.warning(decl, `cannot resolve variable value for "${name}"`, { word: match });
                }
                return value;
            });
        });
    });
}

function handleDeclarations(rule: SRule, stylableMeta: StyleableMeta, diagnostics: Diagnostics) {

    // Transform each rule here
    rule.walkDecls(decl => {
        if (stValues.indexOf(decl.prop) !== -1) {
            if (decl.prop === valueMapping.states) {
                if (!rule.isSimpleSelector) {
                    diagnostics.warning(decl, 'cannot define pseudo states inside complex selectors');
                }
            } else if (decl.prop === valueMapping.extends) {
                if (!rule.isSimpleSelector) {
                    diagnostics.warning(decl, 'cannot define "' + valueMapping.extends + '" inside a complex selector');
                }
            } else if (decl.prop === valueMapping.mixin) {
                var mixins = parseMixin(decl.value);

                mixins.forEach((mix) => {
                    var _import = findImportForSymbol(stylableMeta.imports, mix.type);
                    if (!_import) {
                        diagnostics.warning(decl, `unknown mixin: "${mix.type}"`, { word: mix.type });
                    }
                    return mix.type;
                });
            }

            stylableMeta.directives[decl.prop] || (stylableMeta.directives[decl.prop] = []);
            stylableMeta.directives[decl.prop].push(decl);
        }

        decl.value.replace(matchValue, (match, varName) => {
            if (!stylableMeta.mappedVars[varName] && match) {
                diagnostics.warning(decl, `unknown var "${varName}"`, { word: varName });
            }
            return match;
        });

    });

}

function handleAtRules(root: postcss.Root, stylableMeta: StyleableMeta, diagnostics: Diagnostics) {
    let namespace = '';
    root.walkAtRules((atRule) => {
        switch (atRule.name) {
            case 'namespace':
                const match = atRule.params.match(/["'](.*?)['"]/);
                match ? (namespace = match[1]) : diagnostics.error(atRule, 'invalid namespace');
                break;
            case 'keyframes':
                stylableMeta.keyframes.push(atRule);
                break;
        }
    });

    namespace = namespace || filename2varname(basename(stylableMeta.source)) || 's';
    stylableMeta.namespace = processNamespace(namespace, stylableMeta.source);
}

function handleImport(rule: postcss.Rule, diagnostics: Diagnostics) {

    var importObj: Imported = { rule, from: '', defaultExport: '', named: {} };

    var notValidProps: postcss.Declaration[] = [];

    rule.walkDecls((decl) => {
        switch (decl.prop) {
            case valueMapping.from:
                importObj.from = stripQuotation(decl.value);
                break;
            case valueMapping.default:
                importObj.defaultExport = decl.value;
                break;
            case valueMapping.named:
                importObj.named = parseNamed(decl.value);
                break;
            default:
                notValidProps.push(decl);
                break;
        }
    });


    notValidProps.forEach((decl) => {
        diagnostics.warning(decl, `"${decl.prop}" css attribute cannot be used inside :import block`, { word: decl.prop });
    });


    if (!importObj.from) {
        diagnostics.error(rule, '"-st-from" is missing in :import block');
    }

    return importObj;

}

export function processNamespace(namespace: string, source: string) {
    return namespace + hash.v3(source).toString(36);
}

export interface Imported extends Import {
    rule: postcss.Rule;
}


export interface StyleableMeta {
    source: string
    namespace: string;
    imports: Imported[];
    vars: postcss.Rule[];
    mappedVars: Pojo<string>;
    keyframes: postcss.AtRule[];
    directives: { [key: string]: postcss.Declaration[] };
    classes: string[];
    diagnostics: Diagnostics;
}

export interface SRule extends postcss.Rule {
    selectorAst: SelectorAstNode;
    isSimpleSelector: boolean;
}