import { IFileSystem } from '@file-services/types';
import path from 'path';
import postcss from 'postcss';
import { getCSSLanguageService, Stylesheet } from 'vscode-css-languageservice';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
    Color,
    ColorInformation,
    ColorPresentation,
    CompletionItem,
    Diagnostic,
    Hover,
    Location,
    Position,
    Range,
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
        openParens,
    };
}

/**
 * the API for "normal" css language features fallback
 */
export class CssService {
    private inner = getCSSLanguageService({ fileSystemProvider: this.fs.promises as any }); // TODO: FIX TYPE

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
        let cleanContentAst = this.cleanValuesInMediaQuery(ast);
        cleanContentAst = this.cleanStScopes(cleanContentAst);

        return TextDocument.create(
            URI.file(filePath).toString(),
            'stylable',
            version,
            cleanContentAst.toString()
        );
    }

    // cleaning strategy: replace the "value(*)" syntax with spaces,
    // without touching the inner content (*)
    // by removing the function from the params,
    // the css-service will consider it a valid media query
    private cleanValuesInMediaQuery(ast: postcss.Root): postcss.Root {
        const mq = 'media';
        const valueMatch = 'value(';

        ast.walkAtRules(mq, (atRule) => {
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

    // cleaning strategy: replace the "@st-scope" syntax with a media query,
    // if the @st-scope param was a class, replace the "." with a space as well.
    // this works because the css-service now considers this a valid media query where
    // completions and nesting behaviors are similar between the two
    private cleanStScopes(ast: postcss.Root): postcss.Root {
        const stScope = 'st-scope';
        const mq = 'media';

        ast.walkAtRules(stScope, (atRule) => {
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
            .filter((diag) => {
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

                    const uri = URI.parse(document.uri);
                    // on windows, uri.fsPath replaces separators with '\'
                    // this breaks posix paths in-memory when running on windows
                    // take raw posix path instead
                    const filePath =
                        uri.scheme === 'file' &&
                        !uri.authority && // not UNC
                        uri.path.charCodeAt(2) !== 58 && // the colon in "c:"
                        path.isAbsolute(uri.path)
                            ? uri.path
                            : uri.fsPath;

                    const src = this.fs.readFileSync(filePath, 'utf8');
                    const meta = createMeta(src, filePath).meta;
                    if (meta && Object.keys(meta.mappedSymbols).some((ms) => ms === prop)) {
                        return false;
                    }
                }
                return true;
            })
            .map((diag) => {
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
        color: Color,
        range: Range
    ): ColorPresentation[] {
        const stylesheet: Stylesheet = this.inner.parseStylesheet(document);
        return this.inner.getColorPresentations(document, stylesheet, color, range);
    }

    public findColors(document: TextDocument): ColorInformation[] {
        const stylesheet: Stylesheet = this.inner.parseStylesheet(document);
        return this.inner.findDocumentColors(document, stylesheet);
    }

    public findColor(document: TextDocument): Color | null {
        const colors = this.findColors(document);
        return colors.length ? colors[0].color : null;
    }
}
