import { css } from 'js-beautify';
import type { TextDocument, Range } from 'vscode-languageserver-textdocument';
import type { FormattingOptions } from 'vscode-languageserver';

export interface JSBeautifyFormatCSSOptions {
    indent_size?: number;
    indent_with_tabs?: boolean;

    selector_separator_newline?: boolean;
    newline_between_rules?: boolean;
    space_around_selector_separator?: boolean;
    space_around_combinator?: boolean;

    disabled?: boolean;
    eol?: string;
    end_with_newline?: boolean;
    indent_char?: string;
    indent_level?: number;
    preserve_newlines?: boolean;
    max_preserve_newlines?: number;
    wrap_line_length?: number;
    indent_empty_lines?: boolean;
    templating?: string[];
}

export function lspFormattingOptionsToJsBeautifyOptions(
    options: FormattingOptions
): JSBeautifyFormatCSSOptions {
    return {
        indent_size: options.tabSize,
        indent_with_tabs: !options.insertSpaces,
        max_preserve_newlines: options.trimFinalNewlines ? 1 : undefined,
        end_with_newline: options.insertFinalNewline,
    };
}

export function format(
    doc: TextDocument,
    range?: Range,
    options?: JSBeautifyFormatCSSOptions
): string {
    const normalizedOptions: JSBeautifyFormatCSSOptions = {
        ...options,
        // hard-coded to prevent custom selector values starting with combinators from breaking
        space_around_combinator: true,
    };

    return css(doc.getText(range), normalizedOptions);
}
