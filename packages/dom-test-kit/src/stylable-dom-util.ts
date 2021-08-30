import { parseSelector, pseudoStates, stringifySelector, traverseNode } from '@stylable/core';
import type { RuntimeStylesheet, StateValue } from '@stylable/runtime';

export interface PartialElement {
    querySelector: Element['querySelector'];
    querySelectorAll: Element['querySelectorAll'];
    className: Element['className'];
    classList: Element['classList'];
}

export type StylesheetHost = {
    classes: RuntimeStylesheet['classes'];
    namespace: RuntimeStylesheet['namespace'];
};

export class StylableDOMUtil {
    constructor(private stylesheet: StylesheetHost, private root?: Element) {}
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
        const namespace = this.stylesheet.namespace;
        if (!selector) {
            return this.scopeSelector('.root');
        }
        const ast = parseSelector(selector);
        traverseNode(ast, (node) => {
            if (node.type === 'class') {
                const className: string = this.stylesheet.classes[node.name] || node.name;
                node.name = className.includes(' ') ? className.split(' ')[0] : className;
            } else if (node.type === 'pseudo-class') {
                const param = node.content;
                if (!param) {
                    node.type = 'class';
                    node.name = pseudoStates.createBooleanStateClassName(node.name, namespace);
                } else {
                    node.type = 'class';
                    node.name = pseudoStates.createStateWithParamClassName(
                        node.name,
                        namespace,
                        param
                    );
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
        const namespace = this.stylesheet.namespace;

        if (typeof param === 'boolean') {
            return element.classList.contains(
                pseudoStates.createBooleanStateClassName(stateName, namespace)
            );
        }

        return element.classList.contains(
            pseudoStates.createStateWithParamClassName(stateName, namespace, String(param))
        );
    }

    public getStyleState(element: PartialElement, stateName: string): string | boolean | null {
        if (!element.className.includes(stateName)) {
            return null;
        }

        const booleanState = pseudoStates.createBooleanStateClassName(
            stateName,
            this.stylesheet.namespace
        );
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
        return pseudoStates
            .createStateWithParamClassName(stateName, this.stylesheet.namespace, singleCharState)
            .slice(0, -3);
    }
}
