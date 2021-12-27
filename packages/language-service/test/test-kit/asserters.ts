import fs from 'fs';
import path from 'path';
import type * as postcss from 'postcss';
import type { ColorInformation } from 'vscode-css-languageservice';
import {
    Color,
    ColorPresentation,
    FormattingOptions,
    Location,
    ParameterInformation,
    SignatureHelp,
} from 'vscode-languageserver';
import { TextDocument, TextEdit } from 'vscode-languageserver-textdocument';
import { Range, TextDocumentIdentifier } from 'vscode-languageserver-types';
import { URI } from 'vscode-uri';
import { format, lspFormattingOptionsToJsBeautifyOptions } from '@stylable/language-service';
import { ProviderPosition } from '@stylable/language-service/dist/lib/completion-providers';
import { createMeta, ProviderLocation } from '@stylable/language-service/dist/lib/provider';
import { pathFromPosition } from '@stylable/language-service/dist/lib/utils/postcss-ast-utils';
import { CASES_PATH, stylableLSP } from './stylable-fixtures-lsp';

export function getCaretPosition(src: string) {
    const caretPos = src.indexOf('|');
    const linesTillCaret = src.substr(0, caretPos).split('\n');
    const character = linesTillCaret[linesTillCaret.length - 1].length;
    return new ProviderPosition(linesTillCaret.length - 1, character);
}

export function getCaretOffsetAndCleanContent(content: string) {
    const offset = content.indexOf('|');

    if (offset === -1) {
        throw Error('could not find caret in source content');
    }

    return {
        offset,
        content: content.replace('|', ''),
    };
}

export function getPath(fileName: string): postcss.Node[] {
    const fullPath = path.join(CASES_PATH, fileName);
    let src: string = fs.readFileSync(fullPath).toString();
    const pos = getCaretPosition(src);
    src = src.replace('|', '');
    const proc = createMeta(src, fullPath);
    return pathFromPosition(proc.meta!.rawAst, new ProviderPosition(pos.line + 1, pos.character));
}

export function getDefinition(fileName: string): ProviderLocation[] {
    const fullPath = path.join(CASES_PATH, fileName);
    let src: string = fs.readFileSync(fullPath).toString();
    const pos = getCaretPosition(src);
    src = src.replace('|', '');
    const res = stylableLSP.getDefinitionLocation(src, pos, fullPath);
    return res;
}

export function getDefFromLoc({ filePath, pos }: { filePath: string; pos: ProviderPosition }) {
    const fullPath = path.join(CASES_PATH, filePath);
    const src: string = fs.readFileSync(fullPath).toString();
    const res = stylableLSP.getDefinitionLocation(src, pos, fullPath);
    return res;
}

export function getReferences(fileName: string, pos: ProviderPosition): Location[] {
    const fullPath = path.join(CASES_PATH, fileName);
    return stylableLSP.getRefs(URI.file(fullPath).fsPath, pos);
}

export function getSignatureHelp(fileName: string, prefix: string): SignatureHelp | null {
    const fullPath = path.join(CASES_PATH, fileName);
    let src: string = fs.readFileSync(fullPath).toString();
    const pos = getCaretPosition(src);
    src = src.replace('|', prefix);
    pos.character += prefix.length;
    return stylableLSP.getSignatureHelp(src, pos, fullPath, ParameterInformation);
}

export function getDocumentColors(fileName: string): ColorInformation[] {
    const fullPath = path.join(CASES_PATH, fileName);
    const src: string = fs.readFileSync(fullPath).toString();
    const doc = TextDocument.create(URI.file(fullPath).toString(), 'stylable', 1, src);

    return stylableLSP.resolveDocumentColors(doc);
}

export function getFormattingEdits(
    content: string,
    offsetRange?: { start: number; end: number },
    options: FormattingOptions = {
        insertSpaces: true,
        tabSize: 4,
    }
): TextEdit[] {
    return format(
        TextDocument.create('test.st.css', 'stylable', 1, content),
        offsetRange || { start: 0, end: content.length },
        lspFormattingOptionsToJsBeautifyOptions(options)
    );
}

export function getDocColorPresentation(
    fileName: string,
    color: Color,
    range: Range
): ColorPresentation[] {
    const fullPath = path.join(CASES_PATH, fileName);
    const src: string = fs.readFileSync(fullPath).toString();
    const doc = TextDocument.create(URI.file(fullPath).toString(), 'stylable', 1, src);

    return stylableLSP.getColorPresentation(doc, {
        textDocument: TextDocumentIdentifier.create(doc.uri),
        color,
        range,
    });
}
