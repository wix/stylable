import * as postcss from 'postcss';
import { parseSelector, traverseNode, SelectorAstNode, createSimpleSelectorChecker, createRootAfterSpaceChecker, matchAtKeyframes } from './selector-utils';
import { basename } from 'path';
import { Diagnostics } from "./diagnostics";
import { filename2varname, stripQuotation } from "./utils";
import { valueMapping, SBTypesParsers, stValues } from "./stylable-value-parsers";
import { Import } from "./import";
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
        mappedSymbols: {},
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
                if (rule.selector === ':import') {
                    stylableMeta.imports.push(rule);
                    addImportSymbols(rule, stylableMeta, diagnostics);
                    return false;
                } else {
                    diagnostics.warning(rule, 'cannot define ":import" inside a complex selector');
                }
            } else if (name === 'vars') {
                if (rule.selector === ':vars') {
                    stylableMeta.vars.push(rule);
                    addVarSymbols(rule, stylableMeta, diagnostics);
                    return false;
                } else {
                    diagnostics.warning(rule, 'cannot define ":vars" inside a complex selector');
                }
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

function checkRedeclare(styleableMeta: StyleableMeta, symbolName: string, node: postcss.Node, diagnostics: Diagnostics) {
    const symbol = styleableMeta.mappedSymbols[symbolName];
    if (symbol) {
        //TODO: can output match better error;
        diagnostics.warning(node, `redeclare symbol "${symbolName}"`, { word: symbolName })
    }
}

function addImportSymbols(rule: postcss.Rule, stylableMeta: StyleableMeta, diagnostics: Diagnostics) {
    const _import = handleImport(rule, diagnostics);
    //TODO: handle error;
    if (_import.defaultExport) {
        checkRedeclare(stylableMeta, _import.defaultExport, _import.rule, diagnostics);
        stylableMeta.mappedSymbols[_import.defaultExport] = {
            _kind: 'import',
            type: 'default',
            import: _import
        };
    }
    Object.keys(_import.named).forEach((name) => {
        checkRedeclare(stylableMeta, name, _import.rule, diagnostics);
        stylableMeta.mappedSymbols[name] = {
            _kind: 'import',
            type: 'named',
            import: _import
        };
    });
}

function addVarSymbols(rule: postcss.Rule, stylableMeta: StyleableMeta, diagnostics: Diagnostics) {
    rule.walkDecls((decl) => {
        checkRedeclare(stylableMeta, decl.prop, decl, diagnostics);
        stylableMeta.mappedSymbols[decl.prop] = {
            _kind: 'var',
            value: valueReplacer(decl.value, {}, (value, name, match) => {
                value;
                const symbol = stylableMeta.mappedSymbols[name];
                if (!symbol) {
                    diagnostics.warning(decl, `cannot resolve variable value for "${name}"`, { word: match });
                    return match;
                }
                return symbol._kind === 'var' ? symbol.value : match;
            })
        }
    });
    rule.remove();
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
                const extendsSymbol = stylableMeta.mappedSymbols[decl.value];
                if (!extendsSymbol || extendsSymbol._kind !== 'import') {
                    diagnostics.warning(decl, `cannot resolve extends type for "${decl.value}"`, { word: decl.value });
                }

            } else if (decl.prop === valueMapping.mixin) {
                const mixins = parseMixin(decl.value);

                mixins.forEach((mix) => {
                    const symbol = stylableMeta.mappedSymbols[mix.type];
                    if (!symbol || symbol._kind !== 'import') {
                        diagnostics.warning(decl, `unknown mixin: "${mix.type}"`, { word: mix.type });
                    }
                });
            }

            stylableMeta.directives[decl.prop] || (stylableMeta.directives[decl.prop] = []);
            stylableMeta.directives[decl.prop].push(decl);

        }



        decl.value.replace(matchValue, (match, varName) => {
            if (match && !stylableMeta.mappedSymbols[varName]) {
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

    const importObj: Imported = { rule, from: '', defaultExport: '', named: {} };

    const notValidProps: postcss.Declaration[] = [];

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

    rule.remove();

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
    imports: postcss.Rule[];
    vars: postcss.Rule[];
    keyframes: postcss.AtRule[];
    directives: { [key: string]: postcss.Declaration[] };
    classes: string[];
    mappedSymbols: Pojo<ImportSymbol | VarSymbol>;

    diagnostics: Diagnostics;
}

export interface ImportSymbol {
    _kind: 'import'
    type: 'named' | 'default'
    import: Imported;
}

export interface VarSymbol {
    _kind: 'var';
    value: string;
}


export interface SRule extends postcss.Rule {
    selectorAst: SelectorAstNode;
    isSimpleSelector: boolean;
}