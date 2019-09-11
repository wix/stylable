import {
    isValidClassName,
    parseSelector,
    pseudoStates,
    stringifySelector,
    traverseNode
} from '@stylable/core';
import { RuntimeStylesheet, StateValue } from '@stylable/runtime';
import { getStylesheetMode, CommonStylesheet } from './legacy-types';
import { StylableDOMUtilLegacy } from './stylable-dom-util-legacy';

export interface PartialElement {
    querySelector: Element['querySelector'];
    querySelectorAll: Element['querySelectorAll'];
    className: Element['className'];
    classList: Element['classList'];
}

export class StylableDOMUtil {
    constructor(private stylesheet: RuntimeStylesheet, private root?: Element) {}
    public select(selector?: string, element?: PartialElement): Element | null {
        const el = element || this.root;
        return el ? el.querySelector(this.scopeSelector(selector)) : null;
    }
    public selectAll(selector?: string, element?: PartialElement): Element[] | null {
        const el = element || this.root;
        return el
            ? Array.prototype.slice.call(el.querySelectorAll(this.scopeSelector(selector)))
            : [];
    }
    public scopeSelector(selector?: string): string {
        if (!selector) {
            return this.scopeSelector('.root');
        }
        const ast = parseSelector(selector);
        traverseNode(ast, (node: any) => {
            if (node.type === 'class') {
                node.name = this.stylesheet.classes[node.name] || node.name;
            } else if (node.type === 'pseudo-class') {
                const param = node.content;
                if (!param) {
                    node.type = 'class';
                    node.name = this.stylesheet.cssStates({ [node.name]: true });
                } else {
                    const state = this.stylesheet.cssStates({ [node.name]: param });
                    if (isValidClassName(param)) {
                        node.type = 'class';
                        node.name = state;
                    } else {
                        node.type = 'attribute';
                        node.content = state;
                    }
                }
            } else if (
                node.type === 'pseudo-element' ||
                node.type === 'element' ||
                node.type === 'nested-pseudo-class'
            ) {
                throw new Error(`selector with ${node.type} is not supported yet.`);
            }
        });
        return stringifySelector(ast);
    }

    public hasStyleState(
        element: PartialElement,
        stateName: string,
        param: StateValue = true
    ): boolean {
        const stateClass = this.stylesheet.cssStates({ [stateName]: param });
        return element.classList.contains(stateClass);
    }

    public getStyleState(element: PartialElement, stateName: string): string | boolean | null {
        if (!element.className.includes(stateName)) {
            return null;
        }

        const booleanState = this.stylesheet.cssStates({ [stateName]: true });
        if (element.classList.contains(booleanState)) {
            return true;
        }

        const baseState = this.getBaseStateWithParam(stateName);

        let paramValue = '';
        element.classList.forEach(cls => {
            if (!paramValue) {
                paramValue = this.getStateValueFromClassName(cls, baseState);
            }
        });

        return paramValue ? paramValue : null;
    }

    public getStateValueFromClassName(cls: string, baseState: string) {
        if (cls.startsWith(baseState)) {
            const param = cls.slice(baseState.length);
            const paramIndex = param.indexOf(pseudoStates.stateMiddleDelimiter);

            if (paramIndex !== -1) {
                return param.slice(paramIndex + 1);
            }
        }

        return '';
    }

    public getBaseStateWithParam(stateName: string) {
        const singleCharState = 'x';
        return this.stylesheet.cssStates({ [stateName]: singleCharState }).slice(0, -3);
    }
}

export class StylableDOMUtilCompat {
    private internal: any;
    constructor(private stylesheet: CommonStylesheet, private root?: Element) {
        const mode = getStylesheetMode(stylesheet);

        if (mode === 'legacy') {
            this.internal = new StylableDOMUtilLegacy(this.stylesheet, this.root);
        } else if (mode === 'compat') {
            this.internal = new StylableDOMUtil(
                (this.stylesheet as any).originStylesheet,
                this.root
            );
        } else {
            this.internal = new StylableDOMUtil(this.stylesheet as RuntimeStylesheet, this.root);
        }
    }
    public select(selector?: string, element?: PartialElement): Element | null {
        return this.internal.select(selector, element);
    }
    public selectAll(selector?: string, element?: PartialElement): Element[] | null {
        return this.internal.selectAll(selector, element);
    }
    public scopeSelector(selector?: string): string {
        return this.internal.scopeSelector(selector);
    }

    public hasStyleState(
        element: PartialElement,
        stateName: string,
        param: StateValue = true
    ): boolean {
        return this.internal.hasStyleState(element, stateName, param);
    }

    public getStyleState(element: PartialElement, stateName: string): string | boolean | null {
        return this.internal.getStyleState(element, stateName);
    }

    public getStateValueFromClassName(cls: string, baseState: string) {
        return this.internal.getStateValueFromClassName(cls, baseState);
    }

    public getBaseStateWithParam(stateName: string) {
        return this.internal.getBaseStateWithParam(stateName);
    }
}
