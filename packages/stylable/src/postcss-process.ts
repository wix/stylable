import * as postcss from 'postcss';
import { parseSelector, traverseNode, SelectorAstNode, createSimpleSelectorChecker, createRootAfterSpaceChecker } from './selector-utils';
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
const parseStates = SBTypesParsers[valueMapping.states];


export function process(root: postcss.Root, diagnostics = new Diagnostics()) {

    const stylableMeta: StyleableMeta = {
        source: getSourcePath(root, diagnostics),
        namespace: '',
        imports: [],
        vars: [],
        typedClasses: {},
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

function getSourcePath(root: postcss.Root, diagnostics: Diagnostics) {
    const source = root.source.input.file || '';
    if (!source) {
        diagnostics.error(root, 'missing source filename');
    }
    return source;
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
                    diagnostics.warn(rule, 'cannot define ":import" inside a complex selector');
                }
            } else if (name === 'vars') {
                if (rule.selector === ':vars') {
                    stylableMeta.vars.push(rule);
                    addVarSymbols(rule, stylableMeta, diagnostics);
                    return false;
                } else {
                    diagnostics.warn(rule, 'cannot define ":vars" inside a complex selector');
                }
            }
        } else if (type === 'class') {
            stylableMeta.classes.push(name);
        }
        return void 0;
    });

    if (!isValidRootUsage()) {
        diagnostics.warn(rule, '.root class cannot be used after spacing');
    }

}

function checkRedeclareSymbol(symbolName: string, node: postcss.Node, styleableMeta: StyleableMeta, diagnostics: Diagnostics) {
    const symbol = styleableMeta.mappedSymbols[symbolName];
    if (symbol) {
        //TODO: can output match better error;
        diagnostics.warn(node, `redeclare symbol "${symbolName}"`, { word: symbolName })
    }
}

function addImportSymbols(rule: postcss.Rule, stylableMeta: StyleableMeta, diagnostics: Diagnostics) {
    const _import = handleImport(rule, diagnostics);
    //TODO: handle error;
    if (_import.defaultExport) {
        checkRedeclareSymbol(_import.defaultExport, _import.rule, stylableMeta, diagnostics);
        stylableMeta.mappedSymbols[_import.defaultExport] = {
            _kind: 'import',
            type: 'default',
            import: _import
        };
    }
    Object.keys(_import.named).forEach((name) => {
        checkRedeclareSymbol(name, _import.rule, stylableMeta, diagnostics);
        stylableMeta.mappedSymbols[name] = {
            _kind: 'import',
            type: 'named',
            import: _import
        };
    });
}

function addVarSymbols(rule: postcss.Rule, stylableMeta: StyleableMeta, diagnostics: Diagnostics) {
    rule.walkDecls((decl) => {
        checkRedeclareSymbol(decl.prop, decl, stylableMeta, diagnostics);
        stylableMeta.mappedSymbols[decl.prop] = {
            _kind: 'var',
            value: valueReplacer(decl.value, {}, (value, name, match) => {
                value;
                const symbol = stylableMeta.mappedSymbols[name];
                if (!symbol) {
                    diagnostics.warn(decl, `cannot resolve variable value for "${name}"`, { word: match });
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

        decl.value.replace(matchValue, (match, varName) => {
            if (match && !stylableMeta.mappedSymbols[varName]) {
                diagnostics.warn(decl, `unknown var "${varName}"`, { word: varName });
            }
            return match;
        });

        if (stValues.indexOf(decl.prop) !== -1) {
            handleDirectives(rule, decl, stylableMeta, diagnostics);
        }

    });

}

function handleDirectives(rule: SRule, decl: postcss.Declaration, stylableMeta: StyleableMeta, diagnostics: Diagnostics) {

    stylableMeta.directives[decl.prop] || (stylableMeta.directives[decl.prop] = []);
    const selectorName = rule.selector.replace('.', '');

    if (decl.prop === valueMapping.states) {
        if (rule.isSimpleSelector) {
            extendTypedClass(
                decl,
                selectorName,
                valueMapping.states,
                parseStates(decl.value),
                stylableMeta,
                diagnostics
            );
        } else {
            diagnostics.warn(decl, 'cannot define pseudo states inside complex selectors');
        }
    } else if (decl.prop === valueMapping.extends) {
        if (rule.isSimpleSelector) {
            const extendsRefSymbol = stylableMeta.mappedSymbols[decl.value];
            if (extendsRefSymbol && extendsRefSymbol._kind === 'import') {
                extendTypedClass(
                    decl,
                    selectorName,
                    valueMapping.extends,
                    extendsRefSymbol,
                    stylableMeta,
                    diagnostics
                );
            } else {
                diagnostics.warn(decl, `cannot resolve extends type for "${decl.value}"`, { word: decl.value });
            }
        } else {
            diagnostics.warn(decl, 'cannot define "' + valueMapping.extends + '" inside a complex selector');
        }

    } else if (decl.prop === valueMapping.mixin) {
        const mixins = parseMixin(decl.value);

        mixins.forEach((mix) => {
            const mixinRefSymbol = stylableMeta.mappedSymbols[mix.type];
            if (!mixinRefSymbol || mixinRefSymbol._kind !== 'import') {
                diagnostics.warn(decl, `unknown mixin: "${mix.type}"`, { word: mix.type });
            }
        });
    }

    stylableMeta.directives[decl.prop].push(decl);

}

function extendTypedClass(node: postcss.Node, name: string, key: keyof TypedClass, value: any, stylableMeta: StyleableMeta, diagnostics: Diagnostics) {
    const typedClass = stylableMeta.typedClasses[name] || (stylableMeta.typedClasses[name] = {});
    if (typedClass[key]) {
        diagnostics.warn(node, `override ${key} value`);
    }
    typedClass[key] = value;
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
        diagnostics.warn(decl, `"${decl.prop}" css attribute cannot be used inside :import block`, { word: decl.prop });
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
    typedClasses: Pojo<TypedClass>;
    diagnostics: Diagnostics;
}

export interface TypedClass {
    "-st-states"?: any;
    "-st-extends"?: any;
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