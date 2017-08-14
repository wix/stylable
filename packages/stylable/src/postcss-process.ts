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
    const rootSymbol: ClassSymbol = {
        _kind: 'class',
        name: reservedRootName,
        [valueMapping.root]: true
    };

    const stylableMeta: StylableMeta = {
        ast: root,
        root: reservedRootName,
        source: getSourcePath(root, diagnostics),
        namespace: '',
        imports: [],
        vars: [],
        keyframes: [],
        elements: {},
        classes: {
            [reservedRootName]: rootSymbol
        },
        mappedSymbols: {
            [reservedRootName]: rootSymbol
        },
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
        throw new Error('source filename is not absolute path: "' + source + '"');
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
            addClassSymbolOnce(name, rule, stylableMeta, diagnostics);
        } else if (type === 'element') {
            addElementSymbolOnce(name, rule, stylableMeta, diagnostics);
            const prev = nodes[index - 1];
            if (prev) { /*TODO: maybe warn on element with no direct child*/ }

        }
        return void 0;
    });

    if (rule.isSimpleSelector !== false) {
        rule.isSimpleSelector = true;
        rule.selectorType = rule.selector.match(/^\./) ? 'class' : 'element';
    } else {
        rule.selectorType = 'complex';
    };

    if (!isValidRootUsage()) {
        diagnostics.warn(rule, '.root class cannot be used after spacing');
    }

}

function checkRedeclareSymbol(symbolName: string, node: postcss.Node, stylableMeta: StylableMeta, diagnostics: Diagnostics) {
    const symbol = stylableMeta.mappedSymbols[symbolName];
    if (symbol) {
        //TODO: can output match better error;
        diagnostics.warn(node, `redeclare symbol "${symbolName}"`, { word: symbolName })
    }
}

function addElementSymbolOnce(name: string, rule: postcss.Rule, stylableMeta: StylableMeta, diagnostics: Diagnostics) {
    if (name.charAt(0).match(/[A-Z]/) && !stylableMeta.elements[name]) {
        checkRedeclareSymbol(name, rule, stylableMeta, diagnostics);
        stylableMeta.elements[name] = { _kind: "element", name };
    }
}


function addClassSymbolOnce(name: string, rule: postcss.Rule, stylableMeta: StylableMeta, diagnostics: Diagnostics) {
    if (!stylableMeta.classes[name]) {
        let alias = <ImportSymbol | undefined>stylableMeta.mappedSymbols[name];
        if (alias && alias._kind !== 'import') {
            checkRedeclareSymbol(name, rule, stylableMeta, diagnostics);
            alias = undefined;
        }
        stylableMeta.classes[name] = stylableMeta.mappedSymbols[name] = { _kind: "class", name, alias: alias };
    }
}

function addImportSymbols(_import: Imported, stylableMeta: StylableMeta, diagnostics: Diagnostics) {

    if (_import.defaultExport) {
        checkRedeclareSymbol(_import.defaultExport, _import.rule, stylableMeta, diagnostics);
        stylableMeta.mappedSymbols[_import.defaultExport] = {
            _kind: 'import',
            type: 'default',
            name: 'default',
            import: _import
        };
    }
    Object.keys(_import.named).forEach((name) => {
        checkRedeclareSymbol(name, _import.rule, stylableMeta, diagnostics);
        stylableMeta.mappedSymbols[name] = {
            _kind: 'import',
            type: 'named',
            name: _import.named[name],
            import: _import
        };
    });
}

function addVarSymbols(rule: postcss.Rule, stylableMeta: StylableMeta, diagnostics: Diagnostics) {

    rule.walkDecls((decl) => {
        checkRedeclareSymbol(decl.prop, decl, stylableMeta, diagnostics);
        let importSymbol = null;

        const value = valueReplacer(decl.value, {}, (value, name, match) => {
            value;
            const symbol = stylableMeta.mappedSymbols[name];
            if (!symbol) {
                diagnostics.warn(decl, `cannot resolve variable value for "${name}"`, { word: match });
                return match;
            } else if (symbol._kind === 'import') {
                importSymbol = symbol;
            }
            return symbol._kind === 'var' ? symbol.value : match;
        });
        const varSymbol: VarSymbol = {
            _kind: 'var',
            name: decl.prop,
            value: value,
            import: importSymbol
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
            extendTypedRule(
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
            if (extendsRefSymbol && (extendsRefSymbol._kind === 'import' || extendsRefSymbol._kind === 'class') || decl.value === stylableMeta.root) {
                extendTypedRule(
                    decl,
                    rule.selector,
                    valueMapping.extends,
                    extendsRefSymbol,
                    stylableMeta,
                    diagnostics
                );
            } else {
                diagnostics.warn(decl, `cannot resolve "${valueMapping.extends}" type for "${decl.value}"`, { word: decl.value });
            }
        } else {
            diagnostics.warn(decl, 'cannot define "' + valueMapping.extends + '" inside a complex selector');
        }

    } else if (decl.prop === valueMapping.mixin) {
        const mixins: RefedMixin[] = [];
        parseMixin(decl.value).forEach((mixin) => {
            const mixinRefSymbol = stylableMeta.mappedSymbols[mixin.type];
            if (mixinRefSymbol && mixinRefSymbol._kind === 'import') {
                mixins.unshift({
                    mixin,
                    ref: mixinRefSymbol,
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
        rule.mixinEntry = decl;
    }


}

function extendTypedRule(node: postcss.Node, selector: string, key: keyof StylableDirectives, value: any, stylableMeta: StylableMeta, diagnostics: Diagnostics) {
    const name = selector.replace('.', '');
    const typedRule = <ClassSymbol | ElementSymbol>stylableMeta.mappedSymbols[name];
    if (typedRule[key]) {
        diagnostics.warn(node, `override "${key}" on typed rule "${name}"`, { word: name });
    }
    typedRule[key] = value;
}

function handleImport(rule: postcss.Rule, stylableMeta: StylableMeta, diagnostics: Diagnostics) {

    const importObj: Imported = { rule, fromRelative: '', from: '', defaultExport: '', named: {} };

    const notValidProps: postcss.Declaration[] = [];

    rule.walkDecls((decl) => {
        switch (decl.prop) {
            case valueMapping.from:
                importObj.fromRelative = stripQuotation(decl.value);
                importObj.from = path.resolve(path.dirname(stylableMeta.source), importObj.fromRelative);
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
    return namespace + hash.v3(source)//.toString(36);
}

export interface Imported extends Import {
    rule: postcss.Rule;
    fromRelative: string;
}


export interface StylableDirectives {
    "-st-root"?: boolean;
    "-st-states"?: any;
    "-st-extends"?: ImportSymbol | ClassSymbol;
}


export interface ClassSymbol extends StylableDirectives {
    _kind: 'class';
    name: string;
    alias?: ImportSymbol;
}

export interface ElementSymbol extends StylableDirectives {
    _kind: 'element';
    name: string;
}

export interface ImportSymbol {
    _kind: 'import';
    type: 'named' | 'default';
    name: string;
    import: Imported;
}


export interface VarSymbol {
    _kind: 'var';
    name: string;
    value: string;
    import: ImportSymbol | null;
}


export type StylableSymbol = ImportSymbol | VarSymbol | ClassSymbol | ElementSymbol;

export interface StylableMeta {
    ast: postcss.Root;
    root: 'root';
    source: string;
    namespace: string;
    imports: Imported[];
    vars: postcss.Rule[];
    keyframes: postcss.AtRule[];
    classes: Pojo<ClassSymbol>;
    elements: Pojo<ElementSymbol>;
    mappedSymbols: Pojo<StylableSymbol>;
    diagnostics: Diagnostics;
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
    mixinEntry: postcss.Declaration;
}

