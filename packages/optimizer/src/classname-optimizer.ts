import { parseSelector, Pojo, pseudoStates, stringifySelector, traverseNode } from '@stylable/core';
import * as postcss from 'postcss';

export class StylableClassNameOptimizer {
    public context: { names: Pojo<string> };
    constructor() {
        this.context = {
            names: {}
        };
    }
    public rewriteSelector(selector: string, namespace: string) {
        const ast = parseSelector(selector);
        traverseNode(ast, node => {
            if (node.type === 'class') {
                if (!node.name.startsWith(`${namespace}${pseudoStates.booleanStateDelimiter}`)) {
                    // is not a state
                    if (!this.context.names[node.name]) {
                        this.generateName(node.name);
                    }
                    node.name = this.context.names[node.name];
                }
            }
        });
        return stringifySelector(ast);
    }
    public generateName(name: string) {
        return (this.context.names[name] = 's' + Object.keys(this.context.names).length);
    }
    public optimizeAstAndExports(
        ast: postcss.Root,
        exported: Pojo<string>,
        classes = Object.keys(exported),
        namespace: string
    ) {
        ast.walkRules(rule => {
            rule.selector = this.rewriteSelector(rule.selector, namespace);
        });
        classes.forEach(originName => {
            if (exported[originName]) {
                exported[originName] = exported[originName]
                    .split(' ')
                    .map(renderedNamed => {
                        return (
                            this.context.names[renderedNamed] || this.generateName(renderedNamed)
                        );
                    })
                    .join(' ');
            }
        });
    }
}
