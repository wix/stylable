import { parseSelector, stringifySelector, traverseNode } from '../../src/selector-utils';
import { RuntimeStylesheet } from '../../src/types';

export interface QueryElement {
    querySelector: typeof Element.prototype.querySelector;
    querySelectorAll: typeof Element.prototype.querySelectorAll;
}

export class StylableDOMUtil {
    constructor(private style: RuntimeStylesheet, private root?: QueryElement) { }
    public select(selector?: string, element?: QueryElement): Element | null {
        const el = (element || this.root);
        return el ? el.querySelector(this.scopeSelector(selector)) : null;
    }
    public selectAll(selector?: string, element?: QueryElement): Element[] | null {
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
        traverseNode(ast, node => {
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
    private getStateDataAttr(state: string, param = true): string {
        const r = this.style.$cssStates({ [state]: param });
        const stateKey = Object.keys(r)[0];
        return `${stateKey}="${r[stateKey]}"`;
    }
}
