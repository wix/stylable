import * as postcss from 'postcss';
import { parseSelector, stringifySelector, traverseNode } from '../selector-utils';
import { Pojo } from '../types';

export class StylableClassNameOptimizer {
    public context: { names: Pojo<string> };
    constructor() {
        this.context = {
            names: {}
        };
    }
    public rewriteSelector(selector: string, globals: Pojo<boolean> = {}) {
        const ast = parseSelector(selector);
        traverseNode(ast, node => {
            if (node.type === 'class' && !globals[node.name]) {
                if (!this.context.names[node.name]) {
                    this.generateName(node.name);
                }
                node.name = this.context.names[node.name];
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
        globals: Pojo<boolean> = {}
    ) {
        ast.walkRules(rule => {
            rule.selector = this.rewriteSelector(rule.selector, globals);
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
