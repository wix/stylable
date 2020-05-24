import { css } from 'js-beautify';
import { TextDocument, Range } from 'vscode-languageserver-textdocument';
import { FormattingOptions } from 'vscode-languageserver';

export interface FormatterOptions {
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

export function normalizeVSCodeFormattingOptions(options: FormattingOptions): FormatterOptions {
    return {
        indent_size: options.tabSize,
        indent_with_tabs: !options.insertSpaces,
        max_preserve_newlines: options.trimFinalNewlines ? 1 : undefined,
        end_with_newline: options.insertFinalNewline,
    };
}

export function format(doc: TextDocument, range?: Range, options?: FormatterOptions): string {
    const normalizedOptions: FormatterOptions = {
        ...options,
        space_around_combinator: true
    };

    return css(doc.getText(range), normalizedOptions);
}
