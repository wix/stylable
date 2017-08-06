import * as postcss from 'postcss';
import { parseSelector, traverseNode, SelectorAstNode, createSimpleSelectorChecker, createRootAfterSpaceChecker } from './selector-utils';
import * as path from 'path';
import { Diagnostics } from "./diagnostics";
import { filename2varname, stripQuotation } from "./utils";
import { valueMapping, SBTypesParsers, stValues, MixinValue } from "./stylable-value-parsers";
import { Import } from "./import";
import { matchValue, valueReplacer } from "./value-template";
import { Pojo } from "./types";
const hash = require('murmurhash');

const parseNamed = SBTypesParsers[valueMapping.named];
const parseMixin = SBTypesParsers[valueMapping.mixin];
const parseStates = SBTypesParsers[valueMapping.states];


export function process(root: postcss.Root, diagnostics = new Diagnostics()) {
    const reservedRootName = 'root';
    const stylableMeta: StylableMeta = {
        ast: root,
        root: reservedRootName,
        source: getSourcePath(root, diagnostics),
        namespace: '',
        imports: [],
        vars: [],
        mappedSymbols: {},
        keyframes: [],
        classes: {
            [reservedRootName]: { 
                type: 'class',
                name: 'root', 
                [valueMapping.root]: true 
            }
        },
        elements: {},
        diagnostics
    };

    handleAtRules(root, stylableMeta, diagnostics);

    root.walkRules((rule: SRule) => {
        handleRule(rule, stylableMeta, diagnostics);
        handleDeclarations(rule, stylableMeta, diagnostics);
    });

    return stylableMeta;

}

function getSourcePath(root: postcss.Root, diagnostics: Diagnostics) {
    const source = root.source.input.file || '';
    if (!source) {
        diagnostics.error(root, 'missing source filename');
    } else if (!path.isAbsolute(source)) {
        //TODO: rethink this error
        throw new Error('source filename is not absolute path');
    }
    return source;
}

function handleAtRules(root: postcss.Root, stylableMeta: StylableMeta, diagnostics: Diagnostics) {
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

    namespace = namespace || filename2varname(path.basename(stylableMeta.source)) || 's';
    stylableMeta.namespace = processNamespace(namespace, stylableMeta.source);
}

function handleRule(rule: SRule, stylableMeta: StylableMeta, diagnostics: Diagnostics) {
    rule.selectorAst = parseSelector(rule.selector);

    const checker = createSimpleSelectorChecker();
    const isValidRootUsage = createRootAfterSpaceChecker();

    traverseNode(rule.selectorAst, function (node, index, nodes) {
        isValidRootUsage(node);
        if (!checker(node)) {
            rule.isSimpleSelector = false;
        }
        const { name, type } = node;
        if (type === 'pseudo-class') {
            if (name === 'import') {
                if (rule.selector === ':import') {
                    const _import = handleImport(rule, stylableMeta, diagnostics);
                    stylableMeta.imports.push(_import);
                    addImportSymbols(_import, stylableMeta, diagnostics);
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
            if (!stylableMeta.classes[name]) {
                stylableMeta.classes[name] = { type: 'class', name };
            }
        } else if (type === 'element') {
            if (name.charAt(0).match(/[A-Z]/) && !stylableMeta.elements[name]) {
                const prev = nodes[index - 1];
                if (prev) { /*TODO: maybe warn on element with no direct child*/ }
                stylableMeta.elements[name] = { type: 'element', name };
            }
        }
        return void 0;
    });

    if (rule.isSimpleSelector !== false) {
        rule.isSimpleSelector = true;
        rule.selectorType = rule.selector.match(/^\./) ? 'class' : 'element';
    };

    if (!isValidRootUsage()) {
        diagnostics.warn(rule, '.root class cannot be used after spacing');
    }

}

function checkRedeclareSymbol(symbolName: string, node: postcss.Node, styleableMeta: StylableMeta, diagnostics: Diagnostics) {
    const symbol = styleableMeta.mappedSymbols[symbolName];
    if (symbol) {
        //TODO: can output match better error;
        diagnostics.warn(node, `redeclare symbol "${symbolName}"`, { word: symbolName })
    }
}

function addImportSymbols(_import: Imported, stylableMeta: StylableMeta, diagnostics: Diagnostics) {

    if (_import.defaultExport) {
        checkRedeclareSymbol(_import.defaultExport, _import.rule, stylableMeta, diagnostics);
        stylableMeta.mappedSymbols[_import.defaultExport] = {
            _kind: 'import',
            type: 'default',
            export: 'default',
            import: _import
        };
    }
    Object.keys(_import.named).forEach((name) => {
        checkRedeclareSymbol(name, _import.rule, stylableMeta, diagnostics);
        stylableMeta.mappedSymbols[name] = {
            _kind: 'import',
            type: 'named',
            export: _import.named[name],
            import: _import
        };
    });
}

function addVarSymbols(rule: postcss.Rule, stylableMeta: StylableMeta, diagnostics: Diagnostics) {

    rule.walkDecls((decl) => {
        checkRedeclareSymbol(decl.prop, decl, stylableMeta, diagnostics);
        const varSymbol: VarSymbol = {
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
        stylableMeta.mappedSymbols[decl.prop] = varSymbol;
    });
    rule.remove();
}

function handleDeclarations(rule: SRule, stylableMeta: StylableMeta, diagnostics: Diagnostics) {

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

function handleDirectives(rule: SRule, decl: postcss.Declaration, stylableMeta: StylableMeta, diagnostics: Diagnostics) {

    if (decl.prop === valueMapping.states) {
        if (rule.isSimpleSelector) {
            extendTypedClass(
                decl,
                rule.selector,
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
                    rule.selector,
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
        const mixins: RefedMixin[] = [];
        parseMixin(decl.value).forEach((mixin) => {
            const mixinRefSymbol = stylableMeta.mappedSymbols[mixin.type];
            if (mixinRefSymbol && mixinRefSymbol._kind === 'import') {
                mixins.push({
                    mixin,
                    ref: mixinRefSymbol
                });
            } else {
                diagnostics.warn(decl, `unknown mixin: "${mixin.type}"`, { word: mixin.type });
            }
        });

        if (rule.mixins) {
            //TODO: add test
            diagnostics.warn(decl, `override mixin on same rule`);
        }

        rule.mixins = mixins;
    }


}

function extendTypedClass(node: postcss.Node, selector: string, key: keyof TypedRule, value: any, stylableMeta: StylableMeta, diagnostics: Diagnostics) {
    const name = selector.replace('.', '');
    const typedClass = name === selector ? stylableMeta.elements[name] : stylableMeta.classes[name];

    if (typedClass[key]) {
        diagnostics.warn(node, `override ${key} value`);
    }
    typedClass[key] = value;
}

function handleImport(rule: postcss.Rule, styleableMeta: StylableMeta, diagnostics: Diagnostics) {

    const importObj: Imported = { rule, fromRelative: '', from: '', defaultExport: '', named: {} };

    const notValidProps: postcss.Declaration[] = [];

    rule.walkDecls((decl) => {
        switch (decl.prop) {
            case valueMapping.from:
                importObj.fromRelative = stripQuotation(decl.value);
                importObj.from = path.resolve(path.dirname(styleableMeta.source), importObj.fromRelative); //stripQuotation(decl.value);
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
        diagnostics.error(rule, `"${valueMapping.from}" is missing in :import block`);
    }

    rule.remove();

    return importObj;

}

export function processNamespace(namespace: string, source: string) {
    return namespace + hash.v3(source).toString(36);
}

export interface Imported extends Import {
    rule: postcss.Rule;
    fromRelative: string;
}


export interface StylableMeta {
    ast: postcss.Root;
    root: 'root';
    source: string;
    namespace: string;
    imports: Imported[];
    vars: postcss.Rule[];
    keyframes: postcss.AtRule[];
    classes: Pojo<TypedRule>;
    elements: Pojo<TypedRule>;
    mappedSymbols: Pojo<ImportSymbol | VarSymbol>;
    diagnostics: Diagnostics;
}

//TODO: fix type
export interface TypedRule {
    type: 'element' | 'class';
    name: string;
    "-st-root"?: boolean;
    "-st-states"?: any;
    "-st-extends"?: any;
}

export interface ImportSymbol {
    _kind: 'import'
    type: 'named' | 'default'
    export: string;
    import: Imported;
}

export interface VarSymbol {
    _kind: 'var';
    value: string;
}

export interface RefedMixin {
    mixin: MixinValue<any>,
    ref: ImportSymbol
}


//TODO: maybe put under stylable namespace object
export interface SRule extends postcss.Rule {
    selectorAst: SelectorAstNode;
    isSimpleSelector: boolean;
    selectorType: 'class' | 'element' | 'complex';
    mixins?: RefedMixin[];
}