import {
    isValidClassName,
    parseSelector,
    pseudoStates,
    stringifySelector,
    traverseNode,
} from '@stylable/core';
import type { RuntimeStylesheet, StateValue } from '@stylable/runtime';

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
                const className: string = this.stylesheet.classes[node.name] || node.name;
                node.name = className.includes(' ') ? className.split(' ')[0] : className;
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
        element.classList.forEach((cls) => {
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
