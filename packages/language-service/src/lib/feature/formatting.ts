import { formatDocumentExperimental, getDocumentFormatting } from '@stylable/code-formatter';
import type { CSSBeautifyOptions } from 'js-beautify';
import type { FormattingOptions, TextEdit } from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';

export interface StylableLangServiceFormattingOptions extends FormattingOptions {
    experimental?: boolean;
    endWithNewline?: boolean;
    wrapLineLength?: number;
}

export function lspFormattingOptionsToJsBeautifyOptions( // ToDo: check if be private
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
    options: StylableLangServiceFormattingOptions
): TextEdit[] {
    const sourceCss = doc.getText();
    let range = { start: doc.positionAt(offset.start), end: doc.positionAt(offset.end) };

    let targetCss = sourceCss;
    if (options.experimental) {
        // ToDo: support range
        range = { start: doc.positionAt(0), end: doc.positionAt(sourceCss.length) };
        targetCss = formatDocumentExperimental(sourceCss, {
            indent: ' '.repeat(options.tabSize || 4),
            endWithNewline: options.endWithNewline,
            wrapLineLength: options.wrapLineLength,
        });
    } else {
        targetCss = getDocumentFormatting(
            sourceCss,
            offset,
            lspFormattingOptionsToJsBeautifyOptions(options)
        );
    }
    // ToDo(tech-debt): check against source ranged (currently there are false-positives cases in ranged format)
    return sourceCss === targetCss
        ? []
        : [
              {
                  newText: targetCss,
                  range,
              },
          ];
}
