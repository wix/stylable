import { Import } from './import';
import { createSimpleSelectorChecker, parseSelector, PseudoSelectorAstNode, matchAtKeyframes, traverseNode } from './selector-utils';
import { SBTypesParsers, valueMapping } from './stylable-value-parsers';
import { Stylesheet } from './stylesheet';
import { CSSRulesObject } from './types';
import { hasOwn } from './utils';

const mixMixin = SBTypesParsers[valueMapping.mixin];

export function process(sheet: Stylesheet) {
    for (const selector in sheet.cssDefinition) {
        processDefinition(sheet, selector, sheet.cssDefinition[selector]);
    }
    if (!sheet.typedClasses[sheet.root]) {
        sheet.classes.root = sheet.root;
        sheet.typedClasses.root = { [valueMapping.root]: true };
    }
}

function processDefinition(sheet: Stylesheet, selector: string, rules: CSSRulesObject) {
    addMixins(sheet, selector, rules);
    const keyframesMatch = matchAtKeyframes(selector);
    if (keyframesMatch) {
        // for (var k in rules) {
        //     addMixins(sheet, selector + '{' + k + '}', rules[k]);
        // }
        keyframesMatch[1] && sheet.keyframes.push(keyframesMatch[1]);
        return;
    }
    const ast = parseSelector(selector);
    const checker = createSimpleSelectorChecker();
    let isSimpleSelector = true;
    traverseNode(ast, (node) => {
        if (!checker(node)) { isSimpleSelector = false; }
        const { type, name } = node;
        if (type === "pseudo-class") {
            if (name === 'import') {
                const { content } = <PseudoSelectorAstNode>node;
                const importRes = Import.fromImportObject(content, rules);
                importRes && sheet.imports.push(importRes);
            } else if (name === 'vars') {
                Object.assign(sheet.vars, rules);
            }
        } else if (type === 'class') {
            sheet.classes[node.name] = node.name;
        } else if (type === 'nested-pseudo-class') {
            if (name === 'global') {
                return true;
            }
        }
        return undefined;
    });
    addTypedClasses(sheet, selector, rules, isSimpleSelector);
}

function addTypedClasses(sheet: Stylesheet, selector: string, rules: CSSRulesObject, isSimpleSelector: boolean) {
    if(isSimpleSelector && selector.match(/^[A-Z]\w+$/)){
        const importWithRef = sheet.imports.find(_import => _import.containsSymbol(selector));
        if(importWithRef){
            const ExtendsRef = importWithRef.defaultExport || importWithRef.named[selector];
            Array.isArray(rules) ? rules.forEach((rules) => {
                mergeTypedClass(sheet, selector, rules, isSimpleSelector, valueMapping.extends, ExtendsRef);
            }) : mergeTypedClass(sheet, selector, rules, isSimpleSelector, valueMapping.extends, ExtendsRef);
        } else {
            // warn for component Tag selector with no reference ?
        }
    }
    addTypedClass(sheet, selector, rules, isSimpleSelector, valueMapping.root);
    addTypedClass(sheet, selector, rules, isSimpleSelector, valueMapping.states);
    addTypedClass(sheet, selector, rules, isSimpleSelector, valueMapping.extends);
}

function addTypedClass(sheet: Stylesheet, selector: string, rules: CSSRulesObject, isSimpleSelector: boolean, typedRule: keyof typeof SBTypesParsers) {
    Array.isArray(rules) ? rules.forEach((rules) => {
        mergeTypedClass(sheet, selector, rules, isSimpleSelector, typedRule);
    }) : mergeTypedClass(sheet, selector, rules, isSimpleSelector, typedRule);
}

function mergeTypedClass(sheet: Stylesheet, selector: string, rules: CSSRulesObject, isSimpleSelector: boolean, typedRule: keyof typeof SBTypesParsers, value?:any) {
    if (!value && !hasOwn(rules, typedRule)) { return; }
    if (!isSimpleSelector) { throw new Error(typedRule + ' on complex selector: ' + selector); }
    const name = selector.replace('.', '');
    sheet.typedClasses[name] = {
        ...sheet.typedClasses[name],
        [typedRule]: value || SBTypesParsers[typedRule](rules[typedRule])
    };
}

function addMixins(sheet: Stylesheet, selector: string, rules: CSSRulesObject) {
    let mixin: string | string[] = rules[valueMapping.mixin];
    if (mixin && !Array.isArray(mixin)) { mixin = [mixin]; }
    if (mixin) {
        sheet.mixinSelectors[selector] = mixMixin(mixin[mixin.length - 1]);
    }
}

export function processNamespace(strongNamespace = "", weakNamespace: string | string[] = "") {
    if (strongNamespace) { return strongNamespace.replace(/'|"/g, ''); }
    if (Array.isArray(weakNamespace)) {
        return weakNamespace[weakNamespace.length - 1].replace(/'|"/g, '');
    } else if (weakNamespace) {
        return weakNamespace.replace(/'|"/g, '');
    } else {
        return 's' + Stylesheet.globalCounter++;
    }
}