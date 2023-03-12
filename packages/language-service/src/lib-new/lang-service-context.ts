import { TextDocument } from 'vscode-css-languageservice';
import { Diagnostics, Stylable, StylableMeta } from '@stylable/core';
import type { StylableFile } from '../lib/service';
import { getAstNodeAt } from './ast-from-position';
import { parseForEditing, ParseReport } from './edit-time-parser';
import {
    parseSelectorWithCache,
    StylableProcessor,
    StylableTransformer,
    InferredSelector,
} from '@stylable/core/dist/index-internal';
import { URI } from 'vscode-uri';
import {
    ImmutableSelector,
    ImmutableSelectorList,
    ImmutableSelectorNode,
    SelectorList,
    stringifySelectorAst,
    walk as walkSelector,
} from '@tokey/css-selector-parser';
import type { IFileSystem } from '@file-services/types';
import * as postcss from 'postcss';

type ResolveChainItem = {
    [Type in ImmutableSelectorNode['type']]?: Extract<ImmutableSelectorNode, { type: Type }>[];
} & {
    inferred?: InferredSelector;
};

export class LangServiceContext {
    public meta: StylableMeta;
    public errorNodes: Map<any, ParseReport[]>;
    public ambiguousNodes: Map<any, ParseReport[]>;
    public location: ReturnType<typeof getAstNodeAt>;
    public document: TextDocument;
    constructor(
        public fs: IFileSystem,
        public stylable: Stylable,
        private fileData: StylableFile,
        private offset: number
    ) {
        const parseResult = parseForEditing(fileData.content, {
            from: fileData.path,
        });
        this.errorNodes = parseResult.errorNodes;
        this.ambiguousNodes = parseResult.ambiguousNodes;
        this.location = getAstNodeAt(parseResult, offset);
        this.meta = new StylableProcessor(
            new Diagnostics(),
            this.stylable.resolveNamespace
        ).process(parseResult.ast);
        this.document = TextDocument.create(
            URI.file(this.meta.source).toString(),
            'stylable',
            this.fileData.stat.mtime.getTime(),
            this.fileData.content
        );
    }
    public getPosition(offset: number = this.offset) {
        return this.document.positionAt(offset);
    }
    public isInRoot() {
        return this.location.base.node.type === 'root';
    }
    public isInSelectorAllowedSpace() {
        const where = this.location.base.where;
        return (
            this.isInSelector() ||
            where === 'root' ||
            where === 'ruleBody' ||
            where === 'atRuleBody'
        );
    }
    public isInSelector() {
        return !!this.location.selector;
    }
    public getSelectorContext() {
        if (!this.isInSelectorAllowedSpace()) {
            return null;
        }
        const nestedSelectors = this.collectSelector();
        // collect the CSS resolve chain for each selector node
        const selectorAstResolveMap = new Map<ImmutableSelectorNode, InferredSelector>();
        const selectorNestResolveMap = new Map<SelectorList, InferredSelector>();
        const transformer = (this.stylable as any).createTransformer() as StylableTransformer;
        let currentAnchor = undefined;
        for (const selector of nestedSelectors) {
            // ToDo(tech-debt): provide an internal selector resolve without the transformer
            const selectorContext = transformer.createSelectorContext(
                this.meta,
                selector as SelectorList, // doesn't mutate due to `selectorContext.transform = false`
                postcss.rule({ selector: stringifySelectorAst(selector) })
            );
            if (currentAnchor) {
                selectorContext.inferredSelector.set(currentAnchor);
                selectorContext.inferredSelectorContext.set(currentAnchor);
            }
            selectorContext.transform = false;
            selectorContext.selectorAstResolveMap = selectorAstResolveMap;
            transformer.scopeSelectorAst(selectorContext);
            currentAnchor = selectorContext.inferredMultipleSelectors;
            selectorNestResolveMap.set(selector as SelectorList, currentAnchor);
        }
        // reference interest points
        const locationSelector = this.location.selector;
        const nodeAtCursor = locationSelector?.node;
        const resolvedSelectorChain = this.aggregateResolvedChain(
            nestedSelectors,
            selectorAstResolveMap,
            selectorNestResolveMap
        );
        return {
            lastInferredSelector:
                currentAnchor /* fallback to root */ ||
                new InferredSelector(
                    transformer,
                    this.stylable.resolver.resolveExtends(this.meta, 'root')
                ),
            nodeAtCursor,
            selectorAtCursor: nodeAtCursor
                ? stringifySelectorAst(nodeAtCursor).slice(0, this.location.selector!.offsetInNode)
                : '',
            fullSelectorAtCursor: nodeAtCursor
                ? stringifySelectorAst(nestedSelectors[nestedSelectors.length - 1]).slice(
                      0,
                      nodeAtCursor.start + locationSelector.offsetInNode
                  )
                : '',
            selectorAstResolveMap,
            nestedSelectors,
            resolvedSelectorChain,
        };
    }
    /**
     * Find the selector that the caret is at and traverse back to collect
     * resolved elements with any selector information after them.
     */
    private aggregateResolvedChain(
        nestedSelectors: ImmutableSelectorList[],
        selectorAstResolveMap: Map<ImmutableSelectorNode, InferredSelector>,
        selectorNestResolveMap: Map<SelectorList, InferredSelector>
    ) {
        const resolvedChain: ResolveChainItem[] = [];

        let item: ResolveChainItem = {};
        const nestingSelectors = [...nestedSelectors];
        const addToItem = (node: ImmutableSelectorNode | SelectorList) => {
            const isSelectorList = Array.isArray(node);
            const inferred = isSelectorList
                ? selectorNestResolveMap.get(node)
                : selectorAstResolveMap.get(node);
            if (inferred) {
                item.inferred = inferred;
                resolvedChain.unshift(item);
                item = {};
            } else if (!isSelectorList && node.type) {
                item[node.type] ??= [];
                item[node.type]!.push(node as any);
            }
        };
        const collectBack = (
            node: ImmutableSelectorNode | undefined,
            parents: ImmutableSelectorNode[]
        ) => {
            if (node) {
                addToItem(node);
            }
            if (!parents.length) {
                const upperNestingSelectors = getLastWhile(
                    nestingSelectors,
                    (last) => !!last.length
                );
                if (upperNestingSelectors) {
                    // add nest level multiple selector inferred intersection
                    addToItem(upperNestingSelectors as SelectorList);
                    // continue prev chain collection
                    // ToDo: figure out if this is necessary
                    //      - going only through the first selector will miss some data
                    const firstSelector = upperNestingSelectors[0];
                    parents.push(firstSelector);
                } else {
                    return;
                }
            }
            const parent = parents.pop()!;
            if ('nodes' in parent && parent.nodes) {
                const nodes = parent.nodes;
                let fromIndex = nodes.indexOf(node as any);
                fromIndex = fromIndex === -1 ? nodes.length : fromIndex;
                for (let i = fromIndex - 1; i >= 0; i--) {
                    addToItem(nodes[i]);
                }
            }
            collectBack(parent, parents);
        };
        // find node at cursor and collect back resolved location
        if (this.location.selector) {
            const caretSelector = nestingSelectors.pop()!;
            const targetSelectorNode = this.location.selector?.node;
            walkSelector(caretSelector, (node, _index, _nodes, parents) => {
                if (node === targetSelectorNode) {
                    collectBack(node, parents);
                    return walkSelector.stopAll;
                }
                return;
            });
        } else {
            // caret is not at selector (probably nested): complete from end
            collectBack(undefined, []);
        }
        return resolvedChain;
    }
    private getSelectorString(node: postcss.AnyNode = this.location.base.node): string | null {
        if (node.type === 'rule') {
            return node.selector;
        }
        if (node.type === 'atrule' && node.name === 'st-scope') {
            return node.params;
        }
        return null;
    }
    private collectSelector() {
        const parents = collectPostcssParents(this.location.base.node);
        const results: ImmutableSelectorList[] = parents
            .map((node) => {
                return parseSelectorWithCache(this.getSelectorString(node) || '');
            })
            .filter((selectors) => selectors.length !== 0);
        if (this.location.selector) {
            let selectorWithCaret = this.location.selector.parents.find(
                (node) => node.type === 'selector'
            ) as ImmutableSelector | undefined;
            if (!selectorWithCaret && this.location.selector.node.type === 'selector') {
                selectorWithCaret = this.location.selector.node;
            }
            results.push([selectorWithCaret!]);
        } else {
            const selector = this.getSelectorString(this.location.base.node);
            if (selector) {
                results.push(parseSelectorWithCache(selector));
            }
        }
        return results;
    }
}

function collectPostcssParents(node: postcss.AnyNode) {
    const parents: Array<postcss.AnyNode | postcss.Document> = [];
    let current = node.parent;
    while (current) {
        parents.push(current as postcss.AnyNode);
        current = current.parent;
    }
    return parents;
}
function getLastWhile<T>(list: T[], check: (current: T) => boolean) {
    let validLast: T | undefined;
    while (!validLast && list.length) {
        const current = list.pop()!;
        if (check(current)) {
            validLast = current;
        }
    }
    return validLast;
}
