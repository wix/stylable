import { Import } from './import';
import { createSimpleSelectorChecker, parseSelector, PseudoSelectorAstNode, matchAtKeyframes, traverseNode } from './selector-utils';
import { SBTypesParsers, valueMapping } from './stylable-value-parsers';
import { Stylesheet } from './stylesheet';
import { CSSRulesObject, Pojo } from './types';
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
    let importedElements: Pojo<boolean> = {};
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
        } else if (type === 'element') {
            if (name.match(/^[A-Z]\w+$/)) {
                importedElements[name] = true;
            }
        }
        return undefined;
    });
    addImportedElements(sheet, importedElements);
    addTypedClasses(sheet, selector, rules, isSimpleSelector);
}

function addImportedElements(sheet: Stylesheet, importedElements: Pojo<boolean>) {
    for (var element in importedElements) {
        const importWithRef = Import.findImportForSymbol(sheet.imports, element)
        if (importWithRef) {
            mergeTypedClass(sheet, element, element, valueMapping.extends);
        } else {
            // warn for component Tag selector with no reference ?
        }
    }
}

function addTypedClasses(sheet: Stylesheet, selector: string, rules: CSSRulesObject, isSimpleSelector: boolean) {
    if (rules[valueMapping.variant] && selector.match(/^\.[\w]+$/)) { // ToDo: warn if variant not on class
        if (!rules[valueMapping.extends]) {
            rules = { [valueMapping.extends]: 'root', ...rules };
        }
        addTypedClass(sheet, selector, rules, isSimpleSelector, valueMapping.variant);
    }
    addTypedClass(sheet, selector, rules, isSimpleSelector, valueMapping.root);
    addTypedClass(sheet, selector, rules, isSimpleSelector, valueMapping.states);
    addTypedClass(sheet, selector, rules, isSimpleSelector, valueMapping.extends);
}

function addTypedClass(sheet: Stylesheet, selector: string, rules: CSSRulesObject, isSimpleSelector: boolean, typedRule: keyof typeof SBTypesParsers) {
    const name = selector.replace('.', '');
    const merge = (rules: Pojo) => {
        if (!hasOwn(rules, typedRule)) { return; }
        if (!isSimpleSelector) { throw new Error(typedRule + ' on complex selector: ' + selector); }
        const value = SBTypesParsers[typedRule](rules[typedRule]);
        mergeTypedClass(sheet, name, value, typedRule);
    }
    Array.isArray(rules) ? rules.forEach(merge) : merge(rules)
}


function mergeTypedClass(sheet: Stylesheet, name: string, value: any, typedRule: keyof typeof SBTypesParsers) {
    sheet.typedClasses[name] = {
        ...sheet.typedClasses[name],
        [typedRule]: value
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





export function walkClassPrefix(cssObject: Pojo, className: string, visitor: (selector: string, index: number) => void) {
    var i = 0;
    for (var selector in cssObject) {
        if (selector.match(new RegExp('^\s*' + className))) {
            visitor(selector, i++);
        }
    }

}