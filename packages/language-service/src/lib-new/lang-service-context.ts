import { TextDocument } from 'vscode-css-languageservice';
import { CSSResolve, Diagnostics, Stylable, StylableMeta } from '@stylable/core';
import type { StylableFile } from '../lib/service';
import { getAstNodeAt } from './ast-from-position';
import { parseForEditing, ParseReport } from './edit-time-parser';
import {
    parseSelectorWithCache,
    StylableProcessor,
    StylableTransformer,
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
import * as postcss from 'postcss';

type ResolveChainItem = {
    [Type in ImmutableSelectorNode['type']]?: Extract<ImmutableSelectorNode, { type: Type }>[];
} & {
    resolved?: CSSResolve[];
    resolvedNode?: ImmutableSelectorNode;
};

export class LangServiceContext {
    public meta: StylableMeta;
    public errorNodes: Map<any, ParseReport[]>;
    public ambiguousNodes: Map<any, ParseReport[]>;
    public location: ReturnType<typeof getAstNodeAt>;
    public document: TextDocument;
    constructor(public stylable: Stylable, private fileData: StylableFile, private offset: number) {
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
    public isInSelector() {
        return !!this.location.selector;
    }
    public getSelectorContext() {
        const nestedSelectors = this.collectSelector();
        // collect the CSS resolve chain for each selector node
        const selectorAstResolveMap = new Map<ImmutableSelectorNode, CSSResolve[]>();
        let currentAnchor = undefined;
        for (const selector of nestedSelectors) {
            // ToDo(tech-debt): provide an internal selector resolve without the transformer
            const transformer = (this.stylable as any).createTransformer() as StylableTransformer;
            const selectorContext = transformer.createSelectorContext(
                this.meta,
                selector as SelectorList, // doesn't mutate due to `selectorContext.transform = false`
                postcss.rule({ selector: stringifySelectorAst(selector) })
            );
            if (currentAnchor) {
                selectorContext.currentAnchor = currentAnchor;
            }
            selectorContext.transform = false;
            selectorContext.selectorAstResolveMap = selectorAstResolveMap;
            transformer.scopeSelectorAst(selectorContext);
            // ToDo: handle multiple selectors intersection
            currentAnchor = selectorContext.currentAnchor;
        }
        // reference interest points
        const locationSelector = this.location.selector!;
        const nodeAtCursor = locationSelector.node;
        const resolvedSelectorChain = this.aggregateResolvedChain(
            nestedSelectors,
            selectorAstResolveMap
        );
        return {
            nodeAtCursor: locationSelector.node,
            selectorAtCursor: stringifySelectorAst(nodeAtCursor).slice(
                0,
                this.location.selector!.offsetInNode
            ),
            fullSelectorAtCursor: stringifySelectorAst(
                nestedSelectors[nestedSelectors.length - 1]
            ).slice(0, nodeAtCursor.start + locationSelector.offsetInNode),
            selectorAstResolveMap,
            nestedSelectors,
            resolvedSelectorChain,
        };
    }
    /**
     * Find selector not which caret is at and traverse back to collect
     * resolved elements with any selector information after them.
     */
    private aggregateResolvedChain(
        nestedSelectors: ImmutableSelectorList[],
        selectorAstResolveMap: Map<ImmutableSelectorNode, CSSResolve[]>
    ) {
        const resolvedChain: ResolveChainItem[] = [];

        let item: ResolveChainItem = {};
        const nestingSelectors = [...nestedSelectors];
        const caretSelector = nestingSelectors.pop()!;
        const addToItem = (node: ImmutableSelectorNode) => {
            const resolved = selectorAstResolveMap.get(node);
            if (resolved) {
                item.resolved = resolved;
                item.resolvedNode = node;
                resolvedChain.unshift(item);
                item = {};
            } else if (node.type) {
                item[node.type] ??= [];
                item[node.type]!.push(node as any);
            }
        };
        const collectBack = (node: ImmutableSelectorNode, parents: ImmutableSelectorNode[]) => {
            addToItem(node);
            if (!parents.length) {
                return;
            } // ToDo(pr): check for nesting parent selectors
            const parent = parents.pop()!;
            if ('nodes' in parent && parent.nodes) {
                const nodes = parent.nodes;
                const index = nodes.indexOf(node as any);
                for (let i = index - 1; i >= 0; i--) {
                    addToItem(nodes[i]);
                }
            }
            collectBack(parent, parents);
        };
        // find node at cursor and collect back resolved location
        const targetSelectorNode = this.location.selector!.node;
        walkSelector(caretSelector, (node, _index, _nodes, parents) => {
            if (node === targetSelectorNode) {
                collectBack(node, parents);
                return walkSelector.stopAll;
            }
            return;
        });
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
        const results: ImmutableSelectorList[] = this.location.base.parents.map((node) => {
            return parseSelectorWithCache(this.getSelectorString(node) || '');
        });
        let selectorWithCaret = this.location.selector!.parents.find(
            (node) => node.type === 'selector'
        ) as ImmutableSelector | undefined;
        if (!selectorWithCaret && this.location.selector!.node.type === 'selector') {
            selectorWithCaret = this.location.selector!.node;
        }
        results.push([selectorWithCaret!]);
        return results;
    }
}
