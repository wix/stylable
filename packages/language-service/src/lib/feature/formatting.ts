import { getDocumentFormatting } from '@stylable/code-formatter';
import type { CSSBeautifyOptions } from 'js-beautify';
import type { FormattingOptions, TextEdit } from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';

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
    doc: TextDocument,
    offset: { start: number; end: number },
    options: CSSBeautifyOptions
): TextEdit[] {
    const srcText = doc.getText();
    const range = { start: doc.positionAt(offset.start), end: doc.positionAt(offset.end) };

    const newText = getDocumentFormatting(srcText, offset, options);

    return srcText === newText
        ? []
        : [
              {
                  newText,
                  range,
              },
          ];
}
