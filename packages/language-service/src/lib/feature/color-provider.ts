import { IFileSystem } from '@file-services/types';
import { evalDeclarationValue, Stylable, StylableMeta, valueMapping } from '@stylable/core';
import { Color, ColorInformation, ColorPresentation } from 'vscode-css-languageservice';
import { ColorPresentationParams, TextDocument } from 'vscode-languageserver-protocol';
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
            const valueRegex = /value\(([\w-]+)\)/g;
            let regexResult = valueRegex.exec(line);
            while (regexResult !== null) {
                const result = regexResult[1];
                const sym = meta.mappedSymbols[result];
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
                    const relevantVar = impMeta.vars.find(v => v.name === sym.name);
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
                                result.length
                        )
                    );
                    colorComps.push({ color, range } as ColorInformation);
                }

                regexResult = valueRegex.exec(line);
            }
        });

        meta.imports.forEach(imp => {
            let impMeta: StylableMeta | undefined;
            try {
                impMeta = processor.process(imp.from);
            } catch {
                /**/
            }

            if (!impMeta) {
                return;
            }

            const vars = impMeta.vars;
            vars.forEach(v => {
                const doc = TextDocument.create(
                    '',
                    'css',
                    0,
                    '.gaga {border: ' +
                        evalDeclarationValue(stylable.resolver, v.text, impMeta!, v.node) +
                        '}'
                );
                const color = cssService.findColor(doc);
                if (color) {
                    meta.rawAst.walkDecls(valueMapping.named, decl => {
                        const lines = decl.value.split('\n');
                        const reg = new RegExp('\\b' + v.name + '\\b', 'g');

                        const lineIndex = lines.findIndex(l => reg.test(l));
                        if (lineIndex > -1 && lines[lineIndex].indexOf(v.name) > -1) {
                            let extraLines = 0;
                            let extraChars = 0;
                            if (decl.raws.between) {
                                extraLines = decl.raws.between.split('\n').length - 1;
                                const betweens = decl.raws.between.split('\n');
                                extraChars = betweens[betweens.length - 1]!.length;
                            }
                            const varStart = lineIndex // replace with value parser
                                ? lines[lineIndex].indexOf(v.name) // replace with regex
                                : extraLines
                                ? lines[lineIndex].indexOf(v.name) + extraChars
                                : lines[lineIndex].indexOf(v.name) +
                                  valueMapping.named.length +
                                  decl.source!.start!.column +
                                  extraChars -
                                  1;
                            const range = new ProviderRange(
                                new ProviderPosition(
                                    decl.source!.start!.line - 1 + lineIndex + extraLines,
                                    varStart
                                ),
                                new ProviderPosition(
                                    decl.source!.start!.line - 1 + lineIndex + extraLines,
                                    v.name.length + varStart
                                )
                            );
                            colorComps.push({ color, range } as ColorInformation);
                        }
                    });
                }
            });
        });

        return colorComps.concat(cssService.findColors(document));
    }

    return [];
}

export function getColorPresentation(
    cssService: CssService,
    document: TextDocument,
    params: ColorPresentationParams
): ColorPresentation[] {
    const src = document.getText();
    const res = fixAndProcess(src, new ProviderPosition(0, 0), params.textDocument.uri);
    const meta = res.processed.meta!;

    const word = src
        .split('\n')
        [params.range.start.line].slice(params.range.start.character, params.range.end.character);
    if (word.startsWith('value(')) {
        return [];
    }

    const wordStart = new ProviderPosition(
        params.range.start.line + 1,
        params.range.start.character + 1
    );
    let noPicker = false;
    meta.rawAst.walkDecls(valueMapping.named, node => {
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
