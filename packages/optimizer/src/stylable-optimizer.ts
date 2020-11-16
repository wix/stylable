import {
    IStylableOptimizer,
    OptimizeConfig,
    parseSelector,
    SelectorAstNode,
    stringifySelector,
    StylableExports,
    StylableResults,
    traverseNode,
} from '@stylable/core';
import csso from 'csso';
import { booleanStateDelimiter } from 'packages/core/src/pseudo-states';
import postcss, { Declaration, Root, Rule, Node, Comment } from 'postcss';
import { NameMapper } from './name-mapper';

export class StylableOptimizer implements IStylableOptimizer {
    names = new NameMapper();
    classPrefix = 's';
    namespacePrefix = 'o';
    public minifyCSS(css: string): string {
        // disabling restructuring as it breaks production mode by disappearing classes
        return csso.minify(css, { restructure: false }).css;
    }
    public optimize(
        config: OptimizeConfig,
        stylableResults: StylableResults,
        usageMapping: Record<string, boolean>,
        delimiter?: string
    ) {
        const {
            meta: { globals, outputAst: _outputAst },
            exports: jsExports,
        } = stylableResults;
        const outputAst = _outputAst!;

        this.optimizeAst(config, outputAst, usageMapping, delimiter, jsExports, globals);
    }
    public getNamespace(namespace: string) {
        return this.names.get(namespace, this.namespacePrefix);
    }
    public optimizeAst(
        config: OptimizeConfig,
        outputAst: Root,
        usageMapping: Record<string, boolean>,
        delimiter: string | undefined,
        jsExports: StylableExports,
        globals: Record<string, boolean>
    ) {
        if (config.removeComments) {
            this.removeComments(outputAst);
        }
        if (config.removeStylableDirectives) {
            this.removeStylableDirectives(outputAst);
        }
        if (config.removeUnusedComponents && usageMapping && delimiter) {
            this.removeUnusedComponents(delimiter, outputAst, usageMapping);
        }
        if (config.removeEmptyNodes) {
            this.removeEmptyNodes(outputAst);
        }
        if (config.classNameOptimizations) {
            this.optimizeAstAndExports(
                outputAst,
                jsExports.classes,
                undefined,
                usageMapping || {},
                globals,
                config.shortNamespaces
            );
        }
    }

    public rewriteSelector(
        selector: string,
        usageMapping: Record<string, boolean>,
        globals: Record<string, boolean> = {},
        shortNamespaces = false
    ) {
        const ast = parseSelector(selector);
        traverseNode(ast, (node) => {
            if (node.type === 'class' && !globals[node.name]) {
                const stateRegexp = new RegExp(`^(.*?)${booleanStateDelimiter}`);
                const possibleStateNamespace = node.name.match(stateRegexp);
                let isState;
                if (possibleStateNamespace) {
                    if (usageMapping[possibleStateNamespace[1]]) {
                        isState = true;
                        if (shortNamespaces) {
                            node.name = node.name.replace(
                                stateRegexp,
                                `${this.getNamespace(
                                    possibleStateNamespace[1]
                                )}${booleanStateDelimiter}`
                            );
                        }
                    }
                }

                if (!isState) {
                    node.name = this.names.get(node.name, this.classPrefix);
                }
            }
        });
        return stringifySelector(ast);
    }

    public optimizeAstAndExports(
        ast: Root,
        exported: Record<string, string>,
        classes = Object.keys(exported),
        usageMapping: Record<string, boolean>,
        globals?: Record<string, boolean>,
        stateClassNamespaceOptimizations = false
    ) {
        ast.walkRules((rule) => {
            rule.selector = this.rewriteSelector(
                rule.selector,
                usageMapping,
                globals,
                stateClassNamespaceOptimizations
            );
        });
        classes.forEach((originName) => {
            if (exported[originName]) {
                exported[originName] = exported[originName]
                    .split(' ')
                    .map((renderedNamed) => this.names.get(renderedNamed, this.classPrefix))
                    .join(' ');
            }
        });
    }

    public removeStylableDirectives(root: Root, shouldComment = false) {
        const toRemove: Node[] = [];
        root.walkDecls((decl: Declaration) => {
            if (decl.prop.startsWith('-st-')) {
                toRemove.push(decl);
            }
        });
        toRemove.forEach(
            shouldComment
                ? (node) => {
                      node.replaceWith(...createLineByLineComment(node));
                  }
                : (node) => {
                      node.remove();
                  }
        );
    }
    private removeEmptyNodes(root: Root) {
        removeEmptyNodes(root);
    }
    private removeComments(root: Root) {
        removeCommentNodes(root);
    }
    private removeUnusedComponents(
        delimiter: string,
        outputAst: Root,
        usageMapping: Record<string, boolean>,
        shouldComment = false
    ) {
        const matchNamespace = new RegExp(`(.+)${delimiter}(.+)`);
        outputAst.walkRules((rule) => {
            const outputSelectors = rule.selectors.filter((selector) => {
                const selectorAst = parseSelector(selector);
                return !this.isContainsUnusedParts(selectorAst, usageMapping, matchNamespace);
            });
            if (outputSelectors.length) {
                rule.selector = outputSelectors.join();
            } else {
                if (shouldComment) {
                    replaceRecursiveUpIfEmpty('NOT_IN_USE', rule);
                } else {
                    rule.remove();
                }
            }
        });
    }
    private isContainsUnusedParts(
        selectorAst: SelectorAstNode,
        usageMapping: Record<string, boolean>,
        matchNamespace: RegExp
    ) {
        // TODO: !!-!-!! last working point
        let isContainsUnusedParts = false;
        traverseNode(selectorAst, (node) => {
            if (isContainsUnusedParts) {
                return false;
            }
            if (node.type === 'class') {
                const parts = matchNamespace.exec(node.name);
                if (parts) {
                    if (usageMapping[parts[1]] === false) {
                        isContainsUnusedParts = true;
                    }
                }
            } else if (node.type === 'nested-pseudo-element') {
                return false;
            }
            return undefined;
        });
        return isContainsUnusedParts;
    }
}

export function removeCommentNodes(root: Root) {
    root.walkComments((comment) => comment.remove());
    root.walkDecls((decl) => {
        const r: any = decl.raws;
        if (r.value) {
            r.value.raw = decl.value;
        }
    });
}

export function removeEmptyNodes(root: Root) {
    const toRemove: Node[] = [];

    root.walkRules((rule: Rule) => {
        const shouldRemove =
            (rule.nodes && rule.nodes.length === 0) ||
            (rule.nodes && rule.nodes.filter((node) => node.type !== 'comment').length === 0);
        if (shouldRemove) {
            toRemove.push(rule);
        }
    });

    toRemove.forEach((node) => {
        removeRecursiveUpIfEmpty(node);
    });
}

export function createCommentFromNode(label: string, node: Node) {
    return [
        postcss.comment({
            text: label + ':',
        }),
        ...createLineByLineComment(node),
    ];
}

export function createLineByLineComment(node: Node) {
    return node
        .toString()
        .split(/\r?\n/)
        .map((x) => {
            if (x.trim() === '') {
                return undefined;
            }
            let c;
            if (x.trim().startsWith('/*') && x.trim().endsWith('*/')) {
                c = postcss.comment({ text: x.replace(/\*\//gm, '').replace(/\/\*/gm, '') });
                // c = comment({ text: x.replace(/\*\//gm, '').replace(/\/\*/gm, '') });
            } else {
                c = postcss.comment({ text: x.replace(/\*\//gm, '*//*') });
            }
            return c;
        })
        .filter(Boolean) as Comment[];
}

export function removeRecursiveUpIfEmpty(node: Node) {
    const parent = node.parent;
    node.remove();
    if (parent && parent.nodes && parent.nodes.length === 0) {
        removeRecursiveUpIfEmpty(parent);
    }
}

export function replaceRecursiveUpIfEmpty(label: string, node: Node) {
    const parent = node.parent;
    node.raws = {};
    node.replaceWith(
        ...(node.type === 'decl'
            ? createLineByLineComment(node)
            : createCommentFromNode(label, node))
    );
    if (
        parent &&
        parent.nodes &&
        parent.nodes.filter((node) => node.type !== 'comment').length === 0
    ) {
        replaceRecursiveUpIfEmpty('EMPTY_NODE', parent);
    }
}
