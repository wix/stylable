import { extract, parseWithComments } from 'jest-docblock';
import type { StylableMeta, StylableSymbol } from './stylable-meta';

export interface CssDoc {
    description: string;
    tags: Record<string, string>;
}

export function getCssDocsForSymbol(meta: StylableMeta, symbol: StylableSymbol): CssDoc | null {
    let commentNode;

    if (symbol._kind === 'class' || symbol._kind === 'element') {
        commentNode =
            meta.simpleSelectors[symbol.name] && meta.simpleSelectors[symbol.name].node.prev();
    } else if (symbol._kind === 'var') {
        commentNode = symbol.node.prev();
    }

    if (commentNode && commentNode.type === 'comment') {
        const { comments, pragmas } = parseWithComments(extract(commentNode.toString()));
        const res: CssDoc = {
            description: comments,
            tags: {},
        };

        for (const [pragmaName, pragmaValue] of Object.entries(pragmas)) {
            res.tags[pragmaName] = Array.isArray(pragmaValue) ? pragmaValue.join(' ') : pragmaValue;
        }

        return res;
    }

    return null;
}
