import { PartialObject, Pojo } from './types';
import { stringifyCSSObject } from './parser';
import { Resolver } from './resolver';
import { Stylesheet } from './stylesheet';
import { SelectorAstNode, parseSelector, traverseNode, stringifySelector, isImport, matchAtKeyframes, matchAtMedia } from "./selector-utils";
import { valueTemplate } from "./value-template";
import { valueMapping, TypedClass, STYLABLE_VALUE_MATCHER } from "./stylable-value-parsers";
import { hasKeys, hasOwn } from "./utils";
const cssflat = require('../modules/flat-css');

export declare type NestedRules = Pojo<string | string[] | Pojo<string | string[]>>

export interface ExtendedSelector {
    selector: string,
    rules: Pojo<string>
}

export enum Mode {
    DEV,
    PROD
}

export const DEFAULT_CONFIG = {
    namespaceDivider: "💠",
    resolver: new Resolver({}),
    mode: Mode.DEV
}

export declare type Config = typeof DEFAULT_CONFIG

export class Generator {
    private generated: Set<Stylesheet>;
    private namespaceDivider: string;
    private resolver: Resolver;
    private mode: Mode;
    constructor(config: PartialObject<Config>, public buffer: string[] = []) {
        this.namespaceDivider = config.namespaceDivider || DEFAULT_CONFIG.namespaceDivider;
        this.resolver = config.resolver || DEFAULT_CONFIG.resolver;
        this.mode = config.mode || DEFAULT_CONFIG.mode;
        this.generated = new Set();
    }
    static generate(styles: Stylesheet | Stylesheet[], generator: Generator = new Generator({})) {
        if (!Array.isArray(styles)) { styles = [styles]; }
        styles.forEach((style) => generator.addEntry(style));
        return generator.buffer;
    }
    addEntry(sheet: Stylesheet, addImports: boolean = true) {
        //prevent duplicates
        if (!this.generated.has(sheet)) {
            this.generated.add(sheet);
            const resolvedSymbols = this.resolver.resolveSymbols(sheet);
            if (addImports) {
                this.addImports(resolvedSymbols);
            }
            this.addSheet(sheet, resolvedSymbols);
        }
    }
    //TODO: replace Pojo with "ModuleMap"
    addImports(resolvedSymbols: Pojo) {
        for (const symbol in resolvedSymbols) {
            const exportValue = resolvedSymbols[symbol];
            if (Stylesheet.isStylesheet(exportValue)) {
                this.addEntry(exportValue);
            }
        }
    }
    addSheet(sheet: Stylesheet, resolvedSymbols: Pojo) {
        const stack = Object.keys(sheet.cssDefinition).reverse();
        while (stack.length) {
            const selector = stack.pop()!;
            const selectorObject = this.prepareSelector(sheet, selector, resolvedSymbols, stack);
            if (!selectorObject) { continue; }
            this.buffer.push(stringifyCSSObject(selectorObject));
        }
        if (!sheet.cssDefinition['.' + sheet.root]) {
            sheet.classes[sheet.root] = this.scope(sheet.root, sheet.namespace);
        }
    }
    prepareSelector(sheet: Stylesheet, selector: string | ExtendedSelector, resolvedSymbols: Pojo, stack: Array<string | ExtendedSelector> = []) {
        let rules: Pojo, aSelector: string, processedRules: NestedRules;

        if (typeof selector === 'string') {
            rules = sheet.cssDefinition[selector];
            aSelector = selector;
            const mixins = sheet.mixinSelectors[aSelector];
            if (mixins) {
                this.applyMixins(aSelector, rules, mixins, resolvedSymbols, stack);
                return null;
            }
        } else {
            rules = selector.rules;
            aSelector = selector.selector;
        }

        /* don't emit */
        if (selector === '@namespace') { return null; }
        if (selector === ':vars') { return null; }

        if (matchAtMedia(aSelector)) {
            processedRules = {}
            for(var k in rules){
                const d = this.prepareSelector(sheet, k, resolvedSymbols, []);
                d && Object.assign(processedRules, d);
            }
            return {
                [aSelector]: processedRules
            };
        } else {
            processedRules = this.processRules(rules, resolvedSymbols, sheet);
        }


        //don't emit empty selectors in production
        if (this.mode === Mode.PROD && !hasKeys(processedRules)) { return null; }

        const ast = parseSelector(aSelector);

        //don't emit imports
        if (isImport(ast)) { return null; }

        return {
            [this.scopeSelector(sheet, ast, aSelector)]: processedRules
        };

    }
    applyMixins(aSelector: string, rules: NestedRules, mixins: any[], resolvedSymbols: Pojo, stack: Array<string | ExtendedSelector>) {
        mixins.forEach((mixin) => {
            const mixinFunction = resolvedSymbols[mixin.type];
            const cssMixin = cssflat({
                [aSelector]: {
                    ...rules,
                    ...mixinFunction(mixin.options.map((option: string) => valueTemplate(option, resolvedSymbols, this.mode === Mode.DEV)))
                }
            });
            for (var key in cssMixin) {
                stack.push({ selector: key, rules: cssMixin[key] });
            }
        });
    }
    processRules(rules: NestedRules, resolvedSymbols: Pojo, sheet: Stylesheet) {
        const processedRules: NestedRules = {};
        for (let key in rules) {
            if (key.match(STYLABLE_VALUE_MATCHER)) { continue; }
            const value: string | string[] | Pojo<string | string[]> = rules[key];
            if (Array.isArray(value)) {
                processedRules[key] = value.map((value: string) => this.scopeValue(key, value, resolvedSymbols, sheet));
            } else if (value && typeof value === 'object') {
                processedRules[key] = this.processRules(value, resolvedSymbols, sheet) as Pojo<string | string[]>
            } else {
                processedRules[key] = this.scopeValue(key, value, resolvedSymbols, sheet);
            }
        }
        return processedRules;
    }
    scopeValue(key: string, value: string, resolvedSymbols: Pojo, sheet: Stylesheet) {
        var value = valueTemplate(value, resolvedSymbols);
        if (key === 'animation' || key === 'animationName') {
            value = sheet.keyframes.reduce((value: string, keyframe: string) => {
                return value.replace(new RegExp('\\b'+keyframe+'\\b', 'g'), this.scope(keyframe, sheet.namespace));
            }, value);
        }
        return value;
    }
    scopeSelector(sheet: Stylesheet, ast: SelectorAstNode, selector: string): string {
        let current = sheet;
        let classname: string;
        let element: string;

        const keyframeMatch = matchAtKeyframes(selector);
        if(keyframeMatch){
            return selector.replace(keyframeMatch[1], this.scope(keyframeMatch[1], sheet.namespace));
        }

        traverseNode(ast, (node) => {
            const { name, type } = node;
            if (type === 'selector') {
                current = sheet;
                classname = sheet.root;
            } else if (type === 'class') {
                classname = name;
                current = this.handleClass(current, node, name);
            } else if (type === 'element') {
                current = this.handleElement(current, node, name);
            } else if (type === 'pseudo-element') {
                element = name;
                current = this.handlePseudoElement(current, node, name);
            } else if (type === 'pseudo-class') {
                current = this.handlePseudoClass(current, node, name, sheet, classname, element);
            } else if (type === 'nested-pseudo-class') {
                if (name === 'global') {
                    node.type = 'selector';
                    return true;
                }
            }
            /* do nothing */
            return undefined;
        });

        return stringifySelector(ast);
    }
    handleClass(sheet: Stylesheet, node: SelectorAstNode, name: string) {
        const next = this.resolver.resolve(sheet, name);
        const localName = this.scope(name, sheet.namespace);
        sheet.classes[name] = localName;
        if (next !== sheet) {
            //root to root
            node.before = '.' + localName;
            node.name = this.scope(next.root, next.namespace);
            sheet = next;
        } else {
            //not type
            node.name = localName;
        }
        return sheet;
    }
    handleElement(sheet: Stylesheet, node: SelectorAstNode, name: string) {
        const next = this.resolver.resolve(sheet, name);
        if (next !== sheet) {
            //element selector root to root
            node.before = '.' + this.scope(sheet.root, sheet.namespace) + ' ';
            node.name = this.scope(next.root, next.namespace);
            node.type = 'class';
        }
        return next;
    }
    handlePseudoElement(sheet: Stylesheet, node: SelectorAstNode, name: string) {
        //TODO: only transform what is found
        if (sheet.classes[name]) {
            node.type = 'class';
            node.before = ' ';
            node.name = this.scope(name, sheet.namespace);
        }
        return this.resolver.resolve(sheet, name);
    }
    handlePseudoClass(sheet: Stylesheet, node: SelectorAstNode, name: string, sheetOrigin: Stylesheet, typedClassName: string, element: string) {
        let current = element ? sheet : sheetOrigin;
        let localName = element ? element : typedClassName;
        while (current) {
            const typedClass = current.typedClasses[localName];
            const stateValue = getState(typedClass, name);
            if (stateValue) {
                if(typeof stateValue === 'string') { // mapped value
                    node.type = 'invalid';// simply concat global mapped selector - ToDo: maybe change to 'selector'
                    node.value = stateValue;
                } else {
                    node.type = 'attribute';
                    node.content = current.stateAttr(name);
                }
                break;
            }
            const next = this.resolver.resolve(current, localName);
            if (next !== current) {
                current = next;
                localName = current.root;
            } else {
                break;
            }
        }
        return sheet;
    }
    scope(name: string, namespace: string, separator: string = this.namespaceDivider) {
        return namespace ? namespace + separator + name : name;
    }
}

function getState(typedClass: TypedClass, name: string):string | boolean {
    const states = typedClass && typedClass[valueMapping.states];
    if(Array.isArray(states)){
        return states.indexOf(name) !== -1;
    } else if(states && hasOwn(states, name)){
        return states[name] || true;
    }
    return false;
}

