import { css, CSSBeautifyOptions } from 'js-beautify';
export { CSSBeautifyOptions } from 'js-beautify';
import type { FormattingOptions } from 'vscode-languageserver';

export function lspFormattingOptionsToJsBeautifyOptions(
    options: FormattingOptions
): CSSBeautifyOptions {
    return {
        indent_size: options.tabSize,
        indent_with_tabs: !options.insertSpaces,
        max_preserve_newlines: options.trimFinalNewlines ? 1 : undefined,
        end_with_newline: options.insertFinalNewline,
    };
}

export function format(text: string, options?: CSSBeautifyOptions): string {
    const normalizedOptions: CSSBeautifyOptions = {
        ...options,
        // hard-coded to prevent custom selector values starting with combinators from breaking
        space_around_combinator: true,
    };

    return css(text, normalizedOptions);
}
