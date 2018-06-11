import * as postcss from 'postcss';
import { parseSelector, SelectorAstNode, traverseNode } from '../selector-utils';
import { StylableMeta } from '../stylable-processor';
import { StylableResults } from '../stylable-transformer';
import { Pojo } from '../types';
import { StylableClassNameOptimizer } from './classname-optimizer';
import { StylableNamespaceOptimizer } from './namespace-optimizer';

const CleanCSS = require('clean-css');

export interface OptimizeConfig {
    removeComments?: boolean;
    removeStylableDirectives?: boolean;
    removeUnusedComponents?: boolean;
    classNameOptimizations?: boolean;
    removeEmptyNodes?: boolean;
}

export class StylableOptimizer {
    constructor(
        public classNameOptimizer = new StylableClassNameOptimizer(),
        public namespaceOptimizer = new StylableNamespaceOptimizer()
    ) {}

    public minifyCSS(css: string) {
        return new CleanCSS({}).minify(css).styles;
    }
    public optimize(
        config: OptimizeConfig,
        stylableResults: StylableResults,
        delimiter?: string,
        usageMapping?: Pojo<boolean>
    ) {
        const { meta, exports: jsExports } = stylableResults;
        const outputAst = meta.outputAst!;

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
            this.classNameOptimizer.optimizeAstAndExports(
                outputAst,
                jsExports,
                Object.keys(meta.classes)
            );
        }
    }
    public removeStylableDirectives(root: postcss.Root, shouldComment: boolean = false) {
        const toRemove: postcss.Node[] = [];
        root.walkDecls(
            (decl: postcss.Declaration) => decl.prop.startsWith('-st-') && toRemove.push(decl)
        );
        toRemove.forEach(
            shouldComment
                ? node => {
                      node.replaceWith(...createLineByLineComment(node));
                  }
                : node => {
                      node.remove();
                  }
        );
    }
    private removeEmptyNodes(root: postcss.Root) {
        removeEmptyNodes(root);
    }
    private removeComments(root: postcss.Root) {
        removeCommentNodes(root);
    }
    private removeUnusedComponents(
        delimiter: string,
        outputAst: postcss.Root,
        usageMapping: Pojo<boolean>,
        shouldComment: boolean = false
    ) {
        const matchNamespace = new RegExp(`(.+)${delimiter}(.+)`);
        outputAst.walkRules(rule => {
            const outputSelectors = rule.selectors!.filter(selector => {
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
        usageMapping: Pojo<boolean>,
        matchNamespace: RegExp
    ) {
        // TODO: !!-!-!! last working point
        let isContainsUnusedParts = false;
        traverseNode(selectorAst, node => {
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

export function removeCommentNodes(root: postcss.Root) {
    root.walkComments(comment => comment.remove());
    root.walkDecls(decl => {
        const r: any = decl.raws;
        if (r.value) {
            r.value.raw = decl.value;
        }
    });
}

export function removeEmptyNodes(root: postcss.Root) {
    const toRemove: postcss.Node[] = [];

    root.walkRules((rule: postcss.Rule) => {
        const shouldRemove =
            (rule.nodes && rule.nodes.length === 0) ||
            (rule.nodes && rule.nodes.filter(node => node.type !== 'comment').length === 0);
        if (shouldRemove) {
            toRemove.push(rule);
        }
    });

    toRemove.forEach(node => {
        removeRecursiveUpIfEmpty(node);
    });
}

export function removeSTDirective(root: postcss.Root, shouldComment = false) {
    const toRemove: postcss.Node[] = [];

    root.walkRules((rule: postcss.Rule) => {
        if (rule.nodes && rule.nodes.length === 0) {
            toRemove.push(rule);
            return;
        }
        rule.walkDecls((decl: postcss.Declaration) => {
            if (decl.prop.startsWith('-st-')) {
                toRemove.push(decl);
            }
        });
        if (rule.raws) {
            rule.raws = {
                after: '\n'
            };
        }
    });

    if (root.raws) {
        root.raws = {};
    }

    toRemove.forEach(node => {
        if (!shouldComment) {
            removeRecursiveUpIfEmpty(node);
        } else if (node.type === 'decl') {
            replaceRecursiveUpIfEmpty('STYLABLE_DIRECTIVE', node);
        } else {
            replaceRecursiveUpIfEmpty('EMPTY_NODE', node);
        }
    });
}

export function createCommentFromNode(label: string, node: postcss.Node) {
    return [
        postcss.comment({
            text: label + ':'
        }),
        ...createLineByLineComment(node)
    ];
}

export function createLineByLineComment(node: postcss.Node) {
    return node
        .toString()
        .split(/\r?\n/)
        .map(x => {
            if (x.trim() === '') {
                return undefined;
            }
            let c;
            if (x.trim().startsWith('/*') && x.trim().endsWith('*/')) {
                c = postcss.comment({ text: x.replace(/\*\//gm, '').replace(/\/\*/gm, '') });
                // c = postcss.comment({ text: x.replace(/\*\//gm, '').replace(/\/\*/gm, '') });
            } else {
                c = postcss.comment({ text: x.replace(/\*\//gm, '*//*') });
            }
            return c;
        })
        .filter(Boolean) as postcss.Comment[];
}

export function removeRecursiveUpIfEmpty(node: postcss.Node) {
    const parent = node.parent;
    node.remove();
    if (parent && parent.nodes && parent.nodes.length === 0) {
        removeRecursiveUpIfEmpty(parent);
    }
}

export function replaceRecursiveUpIfEmpty(label: string, node: postcss.Node) {
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
        parent.nodes.filter(node => node.type !== 'comment').length === 0
    ) {
        replaceRecursiveUpIfEmpty('EMPTY_NODE', parent);
    }
}
