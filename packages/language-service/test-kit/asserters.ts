import fs from '@file-services/node';
import * as path from 'path';
import { NodeBase } from 'postcss';
import { ColorInformation } from 'vscode-css-languageservice';
import {
    Color,
    ColorPresentation,
    Location,
    ParameterInformation,
    SignatureHelp
} from 'vscode-languageserver';
import { Range, TextDocument, TextDocumentIdentifier } from 'vscode-languageserver-types';
import { URI } from 'vscode-uri';
import { ProviderPosition } from '../src/lib/completion-providers';
import { createMeta, ProviderLocation } from '../src/lib/provider';
import { pathFromPosition } from '../src/lib/utils/postcss-ast-utils';
import { CASES_PATH, stylableLSP } from './stylable-fixtures-lsp';

export function getCaretPosition(src: string) {
    const caretPos = src.indexOf('|');
    const linesTillCaret = src.substr(0, caretPos).split('\n');
    const character = linesTillCaret[linesTillCaret.length - 1].length;
    return new ProviderPosition(linesTillCaret.length - 1, character);
}

export function getPath(fileName: string): NodeBase[] {
    const fullPath = path.join(CASES_PATH, fileName);
    let src: string = fs.readFileSync(fullPath).toString();
    const pos = getCaretPosition(src);
    src = src.replace('|', '');
    const proc = createMeta(src, fullPath);
    return pathFromPosition(proc.meta!.rawAst, new ProviderPosition(pos.line + 1, pos.character));
}

export async function getDefinition(fileName: string): Promise<ProviderLocation[]> {
    const fullPath = path.join(CASES_PATH, fileName);
    let src: string = fs.readFileSync(fullPath).toString();
    const pos = getCaretPosition(src);
    src = src.replace('|', '');
    const res = await stylableLSP.getDefinitionLocation(src, pos, fullPath);
    return res;
}

export async function getDefFromLoc({
    filePath,
    pos
}: {
    filePath: string;
    pos: ProviderPosition;
}) {
    const fullPath = path.join(CASES_PATH, filePath);
    const src: string = fs.readFileSync(fullPath).toString();
    const res = await stylableLSP.getDefinitionLocation(src, pos, fullPath);
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
        range
    });
}
