import { IFileSystem } from '@file-services/types';
import postcss from 'postcss';
import * as VCL from 'vscode-css-languageservice';
import { ColorInformation, TextDocument } from 'vscode-languageserver-protocol';
import {
    CompletionItem,
    Diagnostic,
    Hover,
    Location,
    Position,
    Range
} from 'vscode-languageserver-types';
import { URI } from 'vscode-uri';
import { createMeta } from './provider';

function readDocRange(doc: TextDocument, rng: Range): string {
    const lines = doc.getText().split('\n');
    return lines[rng.start.line].slice(rng.start.character, rng.end.character);
}

function findPseudoStateStart(line: string, lookFrom: number) {
    let i = lookFrom - 1;
    let res = -1;
    let openParens = 0;
    while (i !== -1) {
        if (line[i] === ':' && line[i - 1] !== ':') {
            res = i;
        }
        if (line[i] === '(') {
            openParens++;
        }
        if (line[i] === ')') {
            openParens--;
        }

        i--;
    }

    return {
        index: res,
        openParens
    };
}

/**
 * the API for "normal" css language features fallback
 */
export class CssService {
    private inner = VCL.getCSSLanguageService();

    constructor(private fs: IFileSystem) {}

    public getCompletions(document: TextDocument, position: Position): CompletionItem[] {
        const cssCompsRaw = this.inner.doComplete(
            document,
            position,
            this.inner.parseStylesheet(document)
        );
        return cssCompsRaw ? cssCompsRaw.items : [];
    }

    public createSanitizedDocument(ast: postcss.Root, filePath: string, version: number) {
        // const cleanContentAst = this.cleanValuesInMediaQuery(ast);
        let cleanContentAst = this.cleanValuesInMediaQuery(ast);
        cleanContentAst = this.cleanStScopes(cleanContentAst);

        return TextDocument.create(
            URI.file(filePath).toString(),
            'stylable',
            version,
            cleanContentAst.toString()
        );
    }

    private cleanValuesInMediaQuery(ast: postcss.Root): postcss.Root {
        const mq = 'media';
        const valueMatch = 'value(';

        ast.walkAtRules(mq, atRule => {
            while (atRule.params.includes('value(')) {
                const currentValueIndex = atRule.params.indexOf(valueMatch);
                const closingParenthesisIndex = atRule.params.indexOf(')', currentValueIndex);

                atRule.params = atRule.params.replace(valueMatch, ' '.repeat(valueMatch.length));

                atRule.params =
                    atRule.params.substr(0, closingParenthesisIndex) +
                    ' ' +
                    atRule.params.substr(closingParenthesisIndex + 1);
            }
        });

        return ast;
    }

    private cleanStScopes(ast: postcss.Root): postcss.Root {
        const stScope = 'st-scope';
        const mq = 'media';

        ast.walkAtRules(stScope, atRule => {
            atRule.name = mq + ' '.repeat(stScope.length - mq.length);

            if (atRule.params.includes('.')) {
                atRule.params = atRule.params.replace('.', ' ');
            }
        });

        return ast;
    }

    public getDiagnostics(document: TextDocument): Diagnostic[] {
        if (!document.uri.endsWith('.css')) {
            return [];
        }
        const stylesheet = this.inner.parseStylesheet(document);

        return this.inner
            .doValidation(document, stylesheet)
            .filter(diag => {
                if (diag.code === 'emptyRules') {
                    return false;
                }
                if (
                    diag.code === 'unknownAtRules' &&
                    readDocRange(document, diag.range) === '@custom-selector'
                ) {
                    return false;
                }
                if (
                    diag.code === 'unknownAtRules' &&
                    readDocRange(document, diag.range) === '@st-scope'
                ) {
                    return false;
                }
                if (
                    diag.code === 'css-lcurlyexpected' &&
                    readDocRange(
                        document,
                        Range.create(Position.create(diag.range.start.line, 0), diag.range.end)
                    ).startsWith('@custom-selector')
                ) {
                    return false;
                }
                if (diag.code === 'css-rparentexpected' || diag.code === 'css-identifierexpected') {
                    const endOfLine = diag.range.end;
                    endOfLine.character = -1;

                    const line = readDocRange(
                        document,
                        Range.create(Position.create(diag.range.start.line, 0), endOfLine)
                    );
                    const stateStart = findPseudoStateStart(line, diag.range.start.character);

                    if (stateStart.index !== -1 && stateStart.openParens > 0) {
                        return false;
                    }
                }
                if (diag.code === 'unknownProperties') {
                    const prop = diag.message.match(/'(.*)'/)![1];
                    const filePath = URI.parse(document.uri).fsPath;
                    const src = this.fs.readFileSync(filePath, 'utf8');
                    const meta = createMeta(src, filePath).meta;
                    if (meta && Object.keys(meta.mappedSymbols).some(ms => ms === prop)) {
                        return false;
                    }
                }
                return true;
            })
            .map(diag => {
                diag.source = 'css';
                return diag;
            });
    }

    public doHover(document: TextDocument, position: Position): Hover | null {
        const stylesheet = this.inner.parseStylesheet(document);
        return this.inner.doHover(document, position, stylesheet);
    }

    public findReferences(document: TextDocument, position: Position): Location[] {
        const stylesheet = this.inner.parseStylesheet(document);
        return this.inner.findReferences(document, position, stylesheet);
    }

    public getColorPresentations(
        document: TextDocument,
        color: VCL.Color,
        range: Range
    ): VCL.ColorPresentation[] {
        const stylesheet: VCL.Stylesheet = this.inner.parseStylesheet(document);
        return this.inner.getColorPresentations(document, stylesheet, color, range);
    }

    public findColors(document: TextDocument): ColorInformation[] {
        const stylesheet: VCL.Stylesheet = this.inner.parseStylesheet(document);
        return this.inner.findDocumentColors(document, stylesheet);
    }

    public findColor(document: TextDocument): VCL.Color | null {
        const colors = this.findColors(document);
        return colors.length ? colors[0].color : null;
    }
}
