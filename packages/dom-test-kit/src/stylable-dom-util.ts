import {
    parseCssSelector,
    walk,
    stringifySelectorAst,
    SelectorNode,
    Class,
} from '@tokey/css-selector-parser';
import { type RuntimeStylesheet, type StateValue, statesRuntime } from '@stylable/runtime';

export interface PartialElement {
    querySelector: Element['querySelector'];
    querySelectorAll: Element['querySelectorAll'];
    className: string;
    getAttribute: (attr: string) => string | null;
    classList: {
        forEach(callbackfn: (value: string) => void): void;
        contains: (className: string) => boolean;
        add: (className: string) => void;
        remove: (className: string) => void;
    };
}

export type StylesheetHost = {
    classes: RuntimeStylesheet['classes'];
    namespace: RuntimeStylesheet['namespace'];
};

function convertToClass(node: SelectorNode) {
    const castNode = node as Class;
    castNode.type = `class`;
    delete castNode.nodes;
    castNode.dotComments = [];
    return castNode;
}

export class StylableDOMUtil {
    private cssStates = statesRuntime.bind(null, this.stylesheet.namespace);
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
        if (!selector) {
            return this.scopeSelector('.root');
        }
        const ast = parseCssSelector(selector);
        walk(ast, (node) => {
            if (node.type === 'class') {
                const className: string = this.stylesheet.classes[node.value] || node.value;
                node.value = className.includes(' ') ? className.split(' ')[0] : className; // ToDo: handle multiple classes
            } else if (node.type === 'pseudo_class') {
                const args = node.nodes;
                if (!args) {
                    convertToClass(node).value = this.cssStates({ [node.value]: true });
                } else {
                    const nestedContent = stringifySelectorAst(args);
                    // ToDo: handle mapped states
                    convertToClass(node).value = this.cssStates({
                        [node.value]: nestedContent,
                    });
                }
            } else if (node.type === 'pseudo_element' || node.type === 'type') {
                throw new Error(
                    `selector with ${node.type.replace(/_/, `-`)} is not supported yet.`
                );
            }
        });
        return stringifySelectorAst(ast);
    }

    public hasStyleState(
        element: PartialElement,
        stateName: string,
        param: StateValue = true
    ): boolean {
        if (typeof param === 'boolean') {
            return element.classList.contains(this.cssStates({ [stateName]: true }));
        }

        return element.classList.contains(this.cssStates({ [stateName]: String(param) }));
    }

    public getStyleState(element: PartialElement, stateName: string): string | boolean | null {
        if (!element.className.includes(stateName)) {
            return null;
        }

        const booleanState = this.cssStates({ [stateName]: true });

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

            const paramIndex = param.indexOf('-');

            if (paramIndex !== -1) {
                return param.slice(paramIndex + 1);
            }
        }

        return '';
    }

    public getBaseStateWithParam(stateName: string) {
        const singleCharState = 'x';
        return this.cssStates({ [stateName]: singleCharState }).slice(0, -3/* state delimiter `---` */);
    }
}
