import { extract, parseWithComments } from 'jest-docblock';
import { StylableSymbol } from './stylable-meta';

export interface CssDoc {
    description: string;
    tags: Record<string, string>;
}

export function getCssDocsForSymbol(symbol: StylableSymbol): CssDoc | null {
    const commentNode =
        (symbol._kind === 'class' || symbol._kind === 'element') &&
        symbol.getNode &&
        symbol.getNode().prev();

    if (commentNode && commentNode.type === 'comment') {
        const { comments, pragmas } = parseWithComments(extract(commentNode.toString()));
        const res: CssDoc = {
            description: comments,
            tags: {}
        };

        for (const [pragmaName, pragmaValue] of Object.entries(pragmas)) {
            res.tags[pragmaName] = Array.isArray(pragmaValue) ? pragmaValue.join(' ') : pragmaValue;
        }

        return res;
    }

    return null;
}
