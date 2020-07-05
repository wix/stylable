import {
    IStylableClassNameOptimizer,
    parseSelector,
    pseudoStates,
    stringifySelector,
    traverseNode,
} from '@stylable/core';
import postcss from 'postcss';

export class StylableClassNameOptimizer implements IStylableClassNameOptimizer {
    public context: { names: Record<string, string> };
    constructor() {
        this.context = {
            names: {},
        };
    }
    public rewriteSelector(
        selector: string,
        usageMapping: Record<string, boolean>,
        globals: Record<string, boolean> = {}
    ) {
        const ast = parseSelector(selector);
        traverseNode(ast, (node) => {
            if (node.type === 'class' && !globals[node.name]) {
                const isState = Object.keys(usageMapping).some((namespace) => {
                    return node.name.startsWith(
                        '' + namespace + pseudoStates.booleanStateDelimiter
                    );
                });

                if (!isState) {
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
        exported: Record<string, string>,
        classes = Object.keys(exported),
        usageMapping: Record<string, boolean>,
        globals?: Record<string, boolean>
    ) {
        ast.walkRules((rule) => {
            rule.selector = this.rewriteSelector(rule.selector, usageMapping, globals);
        });
        classes.forEach((originName) => {
            if (exported[originName]) {
                exported[originName] = exported[originName]
                    .split(' ')
                    .map((renderedNamed) => {
                        return (
                            this.context.names[renderedNamed] || this.generateName(renderedNamed)
                        );
                    })
                    .join(' ');
            }
        });
    }
}
