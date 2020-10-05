import { IFileSystem } from '@file-services/types';
import { evalDeclarationValue, Stylable, valueMapping } from '@stylable/core';
import { Color, Range, ColorInformation, ColorPresentation } from 'vscode-css-languageservice';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { URI } from 'vscode-uri';
import { ProviderPosition, ProviderRange } from '../completion-providers';
import { CssService } from '../css-service';
import { fixAndProcess } from '../provider';

export function resolveDocumentColors(
    stylable: Stylable,
    cssService: CssService,
    document: TextDocument,
    fs: IFileSystem
) {
    const processor = stylable.fileProcessor;
    const src = document.getText();
    const filePath = URI.parse(document.uri).fsPath;
    const res = fixAndProcess(
        src,
        new ProviderPosition(0, 0),
        fs.sep === '/' ? filePath.replace(/\\/g, '/') : filePath
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
                const sym = meta.mappedSymbols[result.trim()];
                let color: Color | null = null;
                if (sym && sym._kind === 'var') {
                    const doc = TextDocument.create(
                        '',
                        'css',
                        0,
                        '.gaga {border: ' +
                            evalDeclarationValue(stylable.resolver, sym.text, meta, sym.node) +
                            '}'
                    );
                    color = cssService.findColor(doc);
                } else if (sym && sym._kind === 'import' && sym.type === 'named') {
                    const impMeta = processor.process(sym.import.from);
                    const relevantVar = impMeta.vars.find((v) => v.name === sym.name);
                    if (relevantVar) {
                        const doc = TextDocument.create(
                            '',
                            'css',
                            0,
                            '.gaga {border: ' +
                                evalDeclarationValue(
                                    stylable.resolver,
                                    'value(' + sym.name + ')',
                                    impMeta,
                                    relevantVar.node
                                ) +
                                '}'
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
                                'value('.length
                        ),
                        new ProviderPosition(
                            ind,
                            regexResult.index +
                                regexResult[0].indexOf(regexResult[1]) +
                                result.length +
                                ')'.length
                        )
                    );
                    colorComps.push({ color, range } as ColorInformation);
                }

                regexResult = valueRegex.exec(line);
            }
        });

        const cleanDocument = cssService.createSanitizedDocument(
            meta.rawAst,
            filePath,
            document.version
        );

        return colorComps.concat(cssService.findColors(cleanDocument));
    }

    return [];
}

export function getColorPresentation(
    cssService: CssService,
    document: TextDocument,
    color: Color,
    range: Range
): ColorPresentation[] {
    const src = document.getText();
    const res = fixAndProcess(src, new ProviderPosition(0, 0), document.uri);
    const meta = res.processed.meta!;

    const wordStart = new ProviderPosition(
        range.start.line + 1,
        range.start.character + 1
    );
    let noPicker = false;
    meta.rawAst.walkDecls(valueMapping.named, (node) => {
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
    return cssService.getColorPresentations(document, color, range);
}
