import * as postcss from 'postcss';
import { Stylable } from './stylable';
import { StylableMeta } from './stylable-processor';
import { StylableTransformer } from './stylable-transformer';

export class StylableOptimizer {
    public removeComments(root: postcss.Root) {
        removeCommentNodes(root);
    }
    public removeStylableDirectives(root: postcss.Root) {
        removeSTDirective(root);
    }
    public optimizeClassnames() { /*TODO*/ }

    public removeUnusedComponents(stylable: Stylable, meta: StylableMeta, usedPaths: string[]) {
        const transformer = stylable.createTransformer();

        meta.ast.walkRules(rule => {
            const outputSelectors = rule.selectors!.filter(selector => {
                return this.isInUse(stylable, transformer, meta, selector, usedPaths);
            });
            if (outputSelectors.length) {
                rule.selector = outputSelectors.join();
            } else {
                rule.remove();
            }
        });
    }
    private isInUse(
        stylable: Stylable, transformer: StylableTransformer, meta: StylableMeta, selector: string, usedPaths: string[]
    ) {
        const selectorElements = transformer.resolveSelectorElements(
            meta,
            selector
        );

        // We expect to receive only one selectors at a time
        return selectorElements[0].every(res => {
            const lastChunk = res.resolved[res.resolved.length - 1];
            if (lastChunk) {
                const source = stylable.resolvePath(
                    undefined,
                    lastChunk.meta.source
                );
                return usedPaths.indexOf(source) !== -1;
            }
            return true;
        });
    }
}

export function removeCommentNodes(root: postcss.Root) {
    root.walkComments(comment => comment.remove());
}

export function removeSTDirective(root: postcss.Root) {

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
        removeRecursiveIfEmpty(node);
    });

}

function removeRecursiveIfEmpty(node: postcss.Node) {
    const parent = node.parent;
    node.remove();
    if (parent && parent.nodes && parent.nodes.length === 0) {
        removeRecursiveIfEmpty(parent);
    }
}
