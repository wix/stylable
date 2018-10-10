import { parseSelector, stringifySelector, traverseNode } from '@stylable/core';
import { RuntimeStylesheet, StateValue } from '@stylable/runtime';

export interface PartialElement {
    querySelector: typeof Element.prototype.querySelector;
    querySelectorAll: typeof Element.prototype.querySelectorAll;
    getAttribute: typeof Element.prototype.getAttribute;
}

export class StylableDOMUtil {
    constructor(private style: RuntimeStylesheet, private root?: Element) { }
    public select(selector?: string, element?: PartialElement): Element | null {
        const el = (element || this.root);
        return el ? el.querySelector(this.scopeSelector(selector)) : null;
    }
    public selectAll(selector?: string, element?: PartialElement): Element[] | null {
        const el = (element || this.root);
        return el ? Array.prototype.slice.call(
            el.querySelectorAll(this.scopeSelector(selector))
        ) : [];
    }
    public scopeSelector(selector?: string): string {
        if (!selector) {
            return this.scopeSelector('.root');
        }
        const ast = parseSelector(selector);
        traverseNode(ast, (node: any) => {
            if (node.type === 'class') {
                node.name = this.style[node.name] || node.name;
            } else if (node.type === 'pseudo-class') {
                node.type = 'attribute';
                node.content = this.getStateDataAttr(node.name);
            } else if (
                node.type === 'pseudo-element' ||
                node.type === 'element' ||
                node.type === 'nested-pseudo-class') {

                throw new Error(`selector with ${node.type} is not supported yet.`);
            }
        });
        return stringifySelector(ast);
    }
    public hasStyleState(element: PartialElement, stateName: string, param: StateValue = true): boolean {
        const { stateKey, styleState } = this.getStateDataAttrKey(stateName, param);
        const actual = element.getAttribute(stateKey);
        return String(styleState[stateKey]) === actual;
    }

    public getStyleState(element: PartialElement, stateName: string): string | null {
        const { stateKey } = this.getStateDataAttrKey(stateName);
        return element.getAttribute(stateKey);
    }

    private getStateDataAttrKey(state: string, param: StateValue = true) {
        const styleState = this.style.$cssStates({ [state]: param });
        return { stateKey: Object.keys(styleState)[0], styleState };
    }

    private getStateDataAttr(state: string, param: StateValue = true): string {
        const { stateKey, styleState } = this.getStateDataAttrKey(state, param);
        return `${stateKey}="${styleState[stateKey]}"`;
    }
}
