import { extract, parseWithComments } from 'jest-docblock';
import type { StylableMeta, StylableSymbol } from '@stylable/core';
import { plugableRecord } from '@stylable/core/dist/helpers/plugable-record';
import type { Rule } from 'postcss';

export interface CssDoc {
    description: string;
    tags: Record<string, string>;
}

const cssDocs = plugableRecord.key<Map<StylableSymbol, CssDoc>>('css-docs');

export function getCssDocsForSymbol(meta: StylableMeta, symbol: StylableSymbol): CssDoc | null {
    let docs = plugableRecord.get(meta.data, cssDocs);
    if (!docs) {
        docs = extractCSSDocsToSymbolMap(meta);
        plugableRecord.set(meta.data, cssDocs, docs);
    }
    return docs.get(symbol) || null;
}

function extractCSSDocsToSymbolMap(meta: StylableMeta) {
    const docs = new Map<StylableSymbol, CssDoc>();
    meta.rawAst.walkComments((comment) => {
        const node = comment.next();
        if (node?.type === 'rule') {
            const symbol = meta.getSymbol(
                node.selector.startsWith('.') ? node.selector.slice(1) : node.selector
            );
            if (symbol?._kind === 'class' || symbol?._kind === 'element') {
                docs.set(symbol, parseCommentNode(comment.toString()));
            }
        } else if (node?.type === 'decl' && node.parent?.type === 'rule') {
            if ((node.parent as Rule).selector === ':vars') {
                const varSymbol = meta.getSymbol(node.prop);
                if (varSymbol?._kind === 'var') {
                    docs.set(varSymbol, parseCommentNode(comment.toString()));
                }
            }
        }
    });
    return docs;
}

function parseCommentNode(comment: string) {
    const { comments, pragmas } = parseWithComments(extract(comment));
    const res: CssDoc = {
        description: comments,
        tags: {},
    };

    for (const [pragmaName, pragmaValue] of Object.entries(pragmas)) {
        res.tags[pragmaName] = Array.isArray(pragmaValue) ? pragmaValue.join(' ') : pragmaValue;
    }

    return res;
}
