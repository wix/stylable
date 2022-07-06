import type { IFileSystem, IFileSystemStats } from '@file-services/types';
import type { Stylable } from '@stylable/core';
import { safeParse } from '@stylable/core/dist/index-internal';
import type { HoverSettings } from 'vscode-css-languageservice';
import type { ColorPresentationParams } from 'vscode-languageserver-protocol';
import { Range, TextDocument } from 'vscode-languageserver-textdocument';
import {
    Color,
    ColorInformation,
    ColorPresentation,
    Command,
    CompletionItem,
    Diagnostic,
    Hover,
    Location,
    ParameterInformation,
    Position,
    SignatureHelp,
    TextEdit,
    WorkspaceEdit,
} from 'vscode-languageserver';
import { URI } from 'vscode-uri';

import { ProviderPosition, ProviderRange } from './completion-providers';
import { CssService } from './css-service';
import { dedupeRefs } from './dedupe-refs';
import { createDiagnosis } from './diagnosis';
import { getColorPresentation, resolveDocumentColors } from './feature/color-provider';
import { format, lspFormattingOptionsToJsBeautifyOptions } from './feature/formatting';
import { Provider } from './provider';
import { getRefs, getRenameRefs } from './provider';
import { typescriptSupport } from './typescript-support';
import type { ExtendedTsLanguageService } from './types';
import type { CSSBeautifyOptions } from 'js-beautify';
import type { FormattingOptions } from 'vscode-languageserver';

export interface StylableLanguageServiceOptions {
    fs: IFileSystem;
    stylable: Stylable;
}

export class StylableLanguageService {
    public cssService: CssService;
    protected fs: IFileSystem;
    protected provider: Provider;
    protected stylable: Stylable;
    protected tsLanguageService: ExtendedTsLanguageService;

    constructor({ fs, stylable }: StylableLanguageServiceOptions) {
        this.fs = fs;
        this.stylable = stylable;

        this.tsLanguageService = typescriptSupport(this.fs);
        this.provider = new Provider(this.stylable, this.tsLanguageService);
        this.cssService = new CssService(this.fs);
    }

    public getStylable() {
        return this.stylable;
    }

    public getFs() {
        return this.fs;
    }

    public onCompletion(filePath: string, offset: number): CompletionItem[] {
        const stylableFile = this.readStylableFile(filePath);

        if (stylableFile && stylableFile.stat.isFile()) {
            const document = TextDocument.create(
                URI.file(filePath).toString(),
                'stylable',
                stylableFile.stat.mtime.getTime(),
                stylableFile.content
            );
            const position = document.positionAt(offset);

            return this.getCompletions(document, filePath, position);
        } else {
            return [];
        }
    }

    public onDefinition(filePath: string, offset: number): Location[] {
        const stylableFile = this.readStylableFile(filePath);

        if (stylableFile && stylableFile.stat.isFile()) {
            const doc = TextDocument.create(
                URI.file(filePath).toString(),
                'stylable',
                stylableFile.stat.mtime.getTime(),
                stylableFile.content
            );

            const res = this.provider.getDefinitionLocation(
                stylableFile.content,
                doc.positionAt(offset),
                filePath,
                this.fs
            );

            return res.map((loc) => Location.create(URI.file(loc.uri).toString(), loc.range));
        }

        return [];
    }

    public onHover(filePath: string, offset: number, settings?: HoverSettings): Hover | null {
        const stylableFile = this.readStylableFile(filePath);

        if (stylableFile && stylableFile.stat.isFile()) {
            const doc = TextDocument.create(
                URI.file(filePath).toString(),
                'stylable',
                stylableFile.stat.mtime.getTime(),
                stylableFile.content
            );

            return this.cssService.doHover(doc, doc.positionAt(offset), settings);
        }

        return null;
    }

    public onReferences(filePath: string, offset: number): Location[] {
        const stylableFile = this.readStylableFile(filePath);

        if (stylableFile && stylableFile.stat.isFile()) {
            const doc = TextDocument.create(
                URI.file(filePath).toString(),
                'stylable',
                stylableFile.stat.mtime.getTime(),
                stylableFile.content
            );

            const position = doc.positionAt(offset);
            const refs = this.getRefs(filePath, position);

            if (refs.length) {
                return dedupeRefs(refs);
            } else {
                return dedupeRefs(this.cssService.findReferences(doc, position));
            }
        }

        return [];
    }

    public onDocumentColor(filePath: string): ColorInformation[] {
        const stylableFile = this.readStylableFile(filePath);

        if (stylableFile && stylableFile.stat.isFile()) {
            const doc = TextDocument.create(
                URI.file(filePath).toString(),
                'stylable',
                stylableFile.stat.mtime.getTime(),
                stylableFile.content
            );
            return resolveDocumentColors(this.stylable, this.cssService, doc, this.fs);
        }

        return [];
    }

    public onColorPresentation(
        filePath: string,
        offset: { start: number; end: number },
        color: Color
    ): ColorPresentation[] {
        const stylableFile = this.readStylableFile(filePath);

        if (stylableFile && stylableFile.stat.isFile()) {
            const doc = TextDocument.create(
                URI.file(filePath).toString(),
                'stylable',
                stylableFile.stat.mtime.getTime(),
                stylableFile.content
            );

            const range: Range = {
                start: doc.positionAt(offset.start),
                end: doc.positionAt(offset.end),
            };

            return getColorPresentation(this.cssService, doc, { color, range, textDocument: doc });
        }

        return [];
    }

    public onRenameRequest(filePath: string, offset: number, newName: string): WorkspaceEdit {
        const stylableFile = this.readStylableFile(filePath);
        const edit: WorkspaceEdit = { changes: {} };

        if (stylableFile && stylableFile.stat.isFile()) {
            const doc = TextDocument.create(
                URI.file(filePath).toString(),
                'stylable',
                stylableFile.stat.mtime.getTime(),
                stylableFile.content
            );

            getRenameRefs(filePath, doc.positionAt(offset), this.fs, this.stylable).forEach(
                (ref) => {
                    if (edit.changes![ref.uri]) {
                        edit.changes![ref.uri].push({ range: ref.range, newText: newName });
                    } else {
                        edit.changes![ref.uri] = [{ range: ref.range, newText: newName }];
                    }
                }
            );
        }

        return edit;
    }

    public onSignatureHelp(filePath: string, offset: number): SignatureHelp | null {
        const stylableFile = this.readStylableFile(filePath);

        if (stylableFile && stylableFile.stat.isFile()) {
            const doc = TextDocument.create(
                URI.file(filePath).toString(),
                'stylable',
                stylableFile.stat.mtime.getTime(),
                stylableFile.content
            );

            const sig = this.provider.getSignatureHelp(
                stylableFile.content,
                doc.positionAt(offset),
                filePath,
                this.fs,
                ParameterInformation
            );

            return sig;
        }

        return null;
    }

    public onDocumentFormatting(filePath: string, options: FormattingOptions): TextEdit[] {
        const srcText = this.fs.readFileSync(filePath, 'utf8');

        return this.getDocumentFormatting(
            TextDocument.create(URI.file(filePath).toString(), 'stylable', 1, srcText),
            { start: 0, end: srcText.length },
            lspFormattingOptionsToJsBeautifyOptions(options)
        );
    }

    public onDocumentRangeFormatting(
        filePath: string,
        offset: { start: number; end: number },
        options: FormattingOptions
    ): TextEdit[] {
        const srcText = this.fs.readFileSync(filePath, 'utf8');

        return this.getDocumentFormatting(
            TextDocument.create(URI.file(filePath).toString(), 'stylable', 1, srcText),
            offset,
            lspFormattingOptionsToJsBeautifyOptions(options)
        );
    }

    public getDocumentFormatting(
        doc: TextDocument,
        offset: { start: number; end: number },
        options: CSSBeautifyOptions
    ) {
        return format(doc, offset, options);
    }

    public provideCompletionItemsFromSrc(src: string, pos: Position, fileName: string) {
        return this.provider.provideCompletionItemsFromSrc(src, pos, fileName, this.fs);
    }

    public getCompletions(document: TextDocument, filePath: string, position: Position) {
        const content = document.getText();

        const stCompletions = this.provider.provideCompletionItemsFromSrc(
            content,
            {
                line: position.line,
                character: position.character,
            },
            filePath,
            this.fs
        );

        const ast = safeParse(content, { from: filePath });
        const cleanDocument = this.cssService.createSanitizedDocument(
            ast,
            filePath,
            document.version
        );

        const groupedCompletions = new Map<string, CompletionItem>();

        for (const stComp of stCompletions) {
            const lspCompletion = CompletionItem.create(stComp.label);

            if (!groupedCompletions.has(lspCompletion.label)) {
                groupedCompletions.set(lspCompletion.label, lspCompletion);
            } else {
                continue;
            }

            const textEdit: TextEdit = TextEdit.replace(
                stComp.range
                    ? stComp.range
                    : new ProviderRange(
                          new ProviderPosition(position.line, Math.max(position.character - 1, 0)),
                          position
                      ),
                typeof stComp.insertText === 'string' ? stComp.insertText : stComp.insertText.source
            );
            lspCompletion.insertTextFormat = 2;
            lspCompletion.detail = stComp.detail;
            lspCompletion.textEdit = textEdit;
            // override sorting order to the top
            // todo: decide on actual sorting for all stylable completions
            lspCompletion.sortText = 'a';
            lspCompletion.filterText =
                typeof stComp.insertText === 'string'
                    ? stComp.insertText
                    : stComp.insertText.source;
            if (stComp.additionalCompletions) {
                lspCompletion.command = Command.create(
                    'additional',
                    'editor.action.triggerSuggest'
                );
            } else if (stComp.triggerSignature) {
                lspCompletion.command = Command.create(
                    'additional',
                    'editor.action.triggerParameterHints'
                );
            }
        }

        const cssCompletions = this.cssService.getCompletions(cleanDocument, position);

        for (const cssComp of cssCompletions) {
            const label = cssComp.label;

            if (!groupedCompletions.has(label)) {
                // CSS declaration property names have built in sorting
                // at-rules, rules and declaration values do not
                cssComp.sortText = cssComp.sortText || 'z';
                groupedCompletions.set(label, cssComp);
            }
        }

        return [...groupedCompletions.values()];
    }

    public getDefinitionLocation(src: string, position: ProviderPosition, filePath: string) {
        const defs = this.provider.getDefinitionLocation(
            src,
            position,
            URI.file(filePath).fsPath,
            this.fs
        );
        return defs.map((loc) => Location.create(URI.file(loc.uri).fsPath, loc.range));
    }

    public getSignatureHelp(
        src: string,
        pos: Position,
        filePath: string,
        paramInfo: typeof ParameterInformation
    ) {
        return this.provider.getSignatureHelp(src, pos, filePath, this.fs, paramInfo);
    }

    public getRefs(filePath: string, position: ProviderPosition) {
        return getRefs(filePath, position, this.fs, this.stylable);
    }

    public resolveDocumentColors(document: TextDocument) {
        return resolveDocumentColors(this.stylable, this.cssService, document, this.fs);
    }

    public getColorPresentation(document: TextDocument, params: ColorPresentationParams) {
        return getColorPresentation(this.cssService, document, params);
    }

    public diagnose(filePath: string): Diagnostic[] {
        const stylableFile = this.readStylableFile(filePath);

        if (stylableFile && stylableFile.stat.isFile()) {
            return createDiagnosis(
                stylableFile.content,
                stylableFile.stat.mtime.getTime(),
                filePath,
                this.stylable,
                this.cssService
            );
        }

        return [];
    }

    private readStylableFile(filePath: string, includeUntitled = true): StylableFile | null {
        const supportedFile =
            filePath.endsWith('.st.css') || (includeUntitled && filePath.startsWith('untitled:'));

        if (!supportedFile) {
            return null;
        }

        try {
            const stat = this.fs.statSync(filePath);

            if (stat.isFile()) {
                const content = this.fs.readFileSync(filePath, 'utf8');
                return {
                    content,
                    stat,
                };
            }
        } catch {
            // TODO: add warning?
        }

        return null;
    }
}

interface StylableFile {
    stat: IFileSystemStats;
    content: string;
}
