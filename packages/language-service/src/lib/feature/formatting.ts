import { getDocumentFormatting } from '@stylable/code-formatter';
import type { CSSBeautifyOptions } from 'js-beautify';
import type { FormattingOptions, TextEdit } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

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

export function format(
    srcText: string,
    offset: { start: number; end: number },
    options: FormattingOptions
): TextEdit[] {
    const doc = TextDocument.create('', 'stylable', 1, srcText);
    const range = { start: doc.positionAt(offset.start), end: doc.positionAt(offset.end) };

    const newText = getDocumentFormatting(
        srcText,
        offset,
        lspFormattingOptionsToJsBeautifyOptions(options)
    );

    return srcText === newText
        ? []
        : [
              {
                  newText,
                  range,
              },
          ];
}
