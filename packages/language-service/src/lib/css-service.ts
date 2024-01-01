import type { IFileSystem } from '@file-services/types';
import type * as postcss from 'postcss';
import { getCSSLanguageService, HoverSettings, Stylesheet } from 'vscode-css-languageservice';
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
} from 'vscode-languageserver';
import { URI } from 'vscode-uri';
import type { StylableMeta } from '@stylable/core';

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
        cleanContentAst = this.cleanStGlobalFromAtRules(cleanContentAst);
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
    // cleaning strategy: replace the "st-global(*)" syntax with spaces,
    // without touching the inner content (*)
    // by removing the function from the params,
    // the css-service will consider it a valid ident
    private cleanStGlobalFromAtRules(ast: postcss.Root): postcss.Root {
        const stGlobalMatch = 'st-global(';

        ast.walkAtRules((atRule) => {
            if (
                (atRule.name === 'property' ||
                    atRule.name === 'keyframes' ||
                    atRule.name === 'layer') &&
                atRule.params.includes(stGlobalMatch)
            ) {
                while (atRule.params.includes(stGlobalMatch)) {
                    const currentValueIndex = atRule.params.indexOf(stGlobalMatch);
                    const closingParenthesisIndex = atRule.params.indexOf(')', currentValueIndex);

                    atRule.params = atRule.params.replace(
                        stGlobalMatch,
                        ' '.repeat(stGlobalMatch.length)
                    );

                    atRule.params =
                        atRule.params.substr(0, closingParenthesisIndex) +
                        ' ' +
                        atRule.params.substr(closingParenthesisIndex + 1);
                }
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
            atRule.name = mq;

            const replacementDiff = `${stScope} ${atRule.params}`.length - `${mq} all`.length;
            atRule.raws.afterName = ' ';
            atRule.params = 'all' + ' '.repeat(replacementDiff);
        });

        return ast;
    }

    public getDiagnostics(document: TextDocument, meta: StylableMeta): Diagnostic[] {
        if (!document.uri.endsWith('.css')) {
            return [];
        }
        const stylesheet = this.inner.parseStylesheet(document);

        return this.inner
            .doValidation(document, stylesheet)
            .filter((diag) => {
                const atRuleName = readDocRange(document, diag.range);
                const diagStart = diag.range.start;
                const diagEnd = diag.range.end;

                const line = readDocRange(
                    document,
                    Range.create(Position.create(diagStart.line, 0), diagEnd)
                );

                if (diag.code === 'emptyRules') {
                    return false;
                } else if (
                    diag.code === 'unknownAtRules' &&
                    (atRuleName === '@custom-selector' ||
                        atRuleName === '@st' ||
                        atRuleName === '@st-scope' ||
                        atRuleName === '@st-namespace' ||
                        atRuleName === '@st-import' ||
                        atRuleName === '@container' ||
                        atRuleName === '@st-global-custom-property')
                ) {
                    return false;
                } else if (
                    diag.code === 'css-lcurlyexpected' &&
                    (line.startsWith('@custom-selector') || line.startsWith('@property'))
                ) {
                    return false;
                } else if (
                    diag.code === 'css-rparentexpected' ||
                    diag.code === 'css-identifierexpected'
                ) {
                    const stateStart = findPseudoStateStart(line, diagStart.character);

                    if (stateStart.index !== -1 && stateStart.openParens > 0) {
                        return false;
                    }
                } else if (diag.code === 'unknownProperties') {
                    const prop = diag.message.match(/'(.*)'/)![1];

                    if (
                        meta.getStVar(prop) ||
                        prop === 'container' ||
                        prop === 'container-name' ||
                        prop === 'd'
                    ) {
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

    public doHover(
        document: TextDocument,
        position: Position,
        settings?: HoverSettings
    ): Hover | null {
        const stylesheet = this.inner.parseStylesheet(document);
        return this.inner.doHover(document, position, stylesheet, settings);
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
