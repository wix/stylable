import { STSymbol, StylableSymbol } from '@stylable/core/dist/features';
import { ignoreDeprecationWarn } from '@stylable/core/dist/helpers/deprecation';
import { Diagnostics } from '@stylable/core/dist/diagnostics';
import { generateStylableResult } from '@stylable/core-test-kit';
import * as postcss from 'postcss';
import { expect } from 'chai';

describe(`features/st-symbol`, () => {
    describe(`meta`, () => {
        it(`should keep symbol on meta`, () => {
            const { meta } = generateStylableResult({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: `entry`,
                        content: ``,
                    },
                },
            });
            const symbol: StylableSymbol = { _kind: `class`, name: `a` };
            const context = { meta, diagnostics: new Diagnostics() };

            STSymbol.addSymbol({ context, symbol });

            expect(STSymbol.get(meta, `a`)).to.equal(symbol);
            expect(meta.getSymbol(`a`), `meta.getSymbol`).to.equal(STSymbol.get(meta, `a`));
            // deprecation
            expect(
                ignoreDeprecationWarn(() => meta.mappedSymbols),
                `deprecated 'meta.mappedSymbols'`
            ).to.eql({
                root: STSymbol.get(meta, `root`),
                a: STSymbol.get(meta, `a`),
            });
        });
        it(`should override previous symbol`, () => {
            const { meta } = generateStylableResult({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: `entry`,
                        content: ``,
                    },
                },
            });
            const symbolA: StylableSymbol = { _kind: `class`, name: `a` };
            const symbolB: StylableSymbol = { _kind: `element`, name: `a` };
            const context = { meta, diagnostics: new Diagnostics() };

            STSymbol.addSymbol({ context, symbol: symbolA });
            STSymbol.addSymbol({ context, symbol: symbolB });

            expect(STSymbol.get(meta, `a`), `override`).to.equal(symbolB);
        });
        it(`should return collected symbols`, () => {
            const { meta } = generateStylableResult({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: `entry`,
                        content: `
                            Btn {}
                            Gallery {}
                        `,
                    },
                },
            });

            expect(STSymbol.getAll(meta)).to.eql({
                root: STSymbol.get(meta, `root`),
                Btn: STSymbol.get(meta, `Btn`),
                Gallery: STSymbol.get(meta, `Gallery`),
            });
            expect(meta.getAllSymbols(), `meta.getAllSymbols`).to.eql(STSymbol.getAll(meta));
        });
        it(`should accept optional local name different then symbol name`, () => {
            const { meta } = generateStylableResult({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: `entry`,
                        content: ``,
                    },
                },
            });
            const context = { meta, diagnostics: new Diagnostics() };

            STSymbol.addSymbol({
                context,
                localName: `localA`,
                symbol: {
                    _kind: `class`,
                    name: `A`,
                },
            });

            expect(STSymbol.get(meta, `localA`)).to.eql({
                _kind: `class`,
                name: `A`,
            });
            expect(STSymbol.get(meta, `A`)).to.eql(undefined);
        });
    });
    describe(`diagnostics`, () => {
        it(`should warn on node with re-declared symbol`, () => {
            const { meta } = generateStylableResult({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: `entry`,
                        content: ``,
                    },
                },
            });
            const symbol: StylableSymbol = { _kind: `class`, name: `a` };
            const ruleA = new postcss.Rule();
            const ruleB = new postcss.Rule();
            const context = { meta, diagnostics: new Diagnostics() };

            STSymbol.addSymbol({ context, symbol, node: ruleA });
            STSymbol.addSymbol({ context, symbol, node: ruleB });
            // ToDo: warn on all declarations including the first
            expect(context.diagnostics.reports).to.eql([
                {
                    type: `warning`,
                    message: STSymbol.diagnostics.REDECLARE_SYMBOL('a'),
                    node: ruleB,
                    options: {
                        word: `a`,
                    },
                },
            ]);
        });
        it(`should NOT warn re-declared symbol with safeRedeclare=true or missing node`, () => {
            const { meta } = generateStylableResult({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: `entry`,
                        content: ``,
                    },
                },
            });
            const symbol: StylableSymbol = { _kind: `class`, name: `a` };
            const ruleA = new postcss.Rule();
            const ruleB = new postcss.Rule();
            const context = { meta, diagnostics: new Diagnostics() };

            // first symbol
            STSymbol.addSymbol({ context, symbol, node: ruleA });
            // override: no diagnostics
            STSymbol.addSymbol({ context, symbol, node: ruleB, safeRedeclare: true });
            // missing node: no diagnostics
            STSymbol.addSymbol({ context, symbol });

            expect(context.diagnostics.reports).to.eql([]);
        });
    });
});
