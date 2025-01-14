import type { IFileSystem } from '@file-services/types';
import type { Stylable } from '@stylable/core';
import { dirname } from 'path';
import type { Color, ColorInformation, ColorPresentation } from 'vscode-css-languageservice';
import type { ColorPresentationParams } from 'vscode-languageserver-protocol';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { URI } from 'vscode-uri';
import { ProviderPosition, ProviderRange } from '../completion-providers.js';
import type { CssService } from '../css-service.js';
import { fixAndProcess } from '../provider.js';

export function resolveDocumentColors(
    stylable: Stylable,
    cssService: CssService,
    document: TextDocument,
    fs: IFileSystem,
) {
    const processor = stylable.fileProcessor;
    const src = document.getText();
    const filePath = URI.parse(document.uri).fsPath;
    const res = fixAndProcess(
        src,
        new ProviderPosition(0, 0),
        fs.sep === '/' ? filePath.replace(/\\/g, '/') : filePath, // TODO: this is very suspicious
        fs,
    );
    const meta = res.processed.meta;

    const colorComps: ColorInformation[] = [];

    if (meta) {
        const lines = src.split('\n');
        lines.forEach((line, ind) => {
            const valueRegex = /value\((.*?)\)/g;
            let regexResult = valueRegex.exec(line);
            while (regexResult !== null) {
                const result = regexResult[1];
                const sym = meta.getSymbol(result.trim());
                let color: Color | null = null;
                if (sym && sym._kind === 'var') {
                    const doc = TextDocument.create(
                        '',
                        'css',
                        0,
                        '.gaga {border: ' +
                            stylable.transformDecl(meta, `unknown-prop`, sym.text).value +
                            '}',
                    );
                    color = cssService.findColor(doc);
                } else if (sym && sym._kind === 'import' && sym.type === 'named') {
                    const impMeta = processor.process(
                        stylable.resolvePath(dirname(meta.source), sym.import.request),
                    );
                    const relevantVar = Object.values(impMeta.getAllStVars()).find(
                        (v) => v.name === sym.name,
                    );
                    if (relevantVar) {
                        const doc = TextDocument.create(
                            '',
                            'css',
                            0,
                            '.gaga {border: ' +
                                stylable.transformDecl(
                                    impMeta,
                                    `unknown-prop`,
                                    `value(${sym.name})`,
                                ).value +
                                '}',
                        );
                        color = cssService.findColor(doc);
                    }
                }
                if (color) {
                    const range = new ProviderRange(
                        new ProviderPosition(
                            ind,
                            regexResult.index +
                                regexResult[0].indexOf(regexResult[1]) -
                                'value('.length,
                        ),
                        new ProviderPosition(
                            ind,
                            regexResult.index +
                                regexResult[0].indexOf(regexResult[1]) +
                                result.length +
                                ')'.length,
                        ),
                    );
                    colorComps.push({ color, range } as ColorInformation);
                }

                regexResult = valueRegex.exec(line);
            }
        });

        const cleanDocument = cssService.createSanitizedDocument(
            meta.sourceAst,
            filePath,
            document.version,
        );

        return colorComps.concat(cssService.findColors(cleanDocument));
    }

    return [];
}

export function getColorPresentation(
    cssService: CssService,
    document: TextDocument,
    params: ColorPresentationParams,
    fs: IFileSystem,
): ColorPresentation[] {
    const src = document.getText();
    const res = fixAndProcess(
        src,
        new ProviderPosition(0, 0),
        URI.parse(params.textDocument.uri).fsPath,
        fs,
    );
    const meta = res.processed.meta;

    const wordStart = new ProviderPosition(
        params.range.start.line + 1,
        params.range.start.character + 1,
    );
    let noPicker = false;
    meta?.sourceAst.walkDecls(`-st-named`, (node) => {
        if (
            node &&
            ((wordStart.line === node.source!.start!.line &&
                wordStart.character >= node.source!.start!.column) ||
                wordStart.line > node.source!.start!.line) &&
            ((wordStart.line === node.source!.end!.line &&
                wordStart.character <= node.source!.end!.column) ||
                wordStart.line < node.source!.end!.line)
        ) {
            noPicker = true;
        }
    });
    if (noPicker) {
        return [];
    }
    return cssService.getColorPresentations(document, params.color, params.range);
}
