import { safeParse } from '@stylable/core/dist/index-internal';
import { css, CSSBeautifyOptions } from 'js-beautify';
import type { Root } from 'postcss';
import { formatCSS, FormatOptions } from './format-css';

/* new experimental formatter */
export function formatDocumentExperimental(source: string, options: Partial<FormatOptions>) {
    // ToDo: support range

    let targetCss = source;
    try {
        targetCss = formatCSS(source, options);
    } catch (e) {
        // return unchanged source on error
    }

    return targetCss;
}

/* format with js-prettify */
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
    const atRuleChanges: string[] = [];
    const declChanges: string[] = [];

    // sanitizing @st-imports due to resulting broken formatting
    ast.walkAtRules(stImport, (atRule) => {
        atRuleChanges.push(atRule.params);
        atRule.params = 'temp';
    });

    ast.walkDecls(/^grid/, (decl) => {
        declChanges.push(decl.value);
        decl.value = `temp`;
    });

    return { atRuleChanges, declChanges };
}

function restoreFormattingExceptions(
    ast: Root,
    { atRuleChanges, declChanges }: { atRuleChanges: string[]; declChanges: string[] }
) {
    ast.walkAtRules(stImport, (atRule) => {
        atRule.params = atRuleChanges.shift()!;
    });

    ast.walkDecls(/^grid/, (decl) => {
        decl.value = declChanges.shift()!;
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
