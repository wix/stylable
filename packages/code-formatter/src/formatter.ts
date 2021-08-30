import { safeParse } from '@stylable/core';
import { css, CSSBeautifyOptions } from 'js-beautify';
import type { Root } from 'postcss';

export function getDocumentFormatting(
    content: string,
    offset?: { start: number; end: number },
    options?: CSSBeautifyOptions
): string {
    const offsetStart = offset?.start || 0;
    const offsetEnd = offset?.end || content.length;

    const ast = safeParse(content.slice(offsetStart, offsetEnd));
    const changes = removeFormattingExceptions(ast);

    const formattedText = format(ast.toString(), options);

    const newText = restoreFormattingExceptions(safeParse(formattedText), changes).toString();

    return newText;
}

const stImport = 'st-import';

function removeFormattingExceptions(ast: Root) {
    const changes: string[] = [];

    // sanitizing @st-imports due to resulting broken formatting
    ast.walkAtRules(stImport, (atRule) => {
        changes.push(atRule.params);
        atRule.params = 'temp';
    });

    return changes;
}

function restoreFormattingExceptions(ast: Root, changes: string[]) {
    ast.walkAtRules(stImport, (atRule) => {
        atRule.params = changes.shift()!;
    });

    return ast;
}

function format(text: string, options?: CSSBeautifyOptions): string {
    const normalizedOptions: CSSBeautifyOptions = {
        ...options,
        // hard-coded to prevent custom selector values starting with combinators from breaking
        space_around_combinator: true,
    };

    return css(text, normalizedOptions);
}
