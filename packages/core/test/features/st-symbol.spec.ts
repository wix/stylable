import { STSymbol, StylableSymbol } from '@stylable/core/dist/features';
import { ignoreDeprecationWarn } from '@stylable/core/dist/helpers/deprecation';
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

            STSymbol.addSymbol({ meta, symbol });

            expect(STSymbol.getSymbol(meta, `a`)).to.equal(symbol);
            // deprecation
            expect(
                ignoreDeprecationWarn(() => meta.mappedSymbols),
                `deprecated 'meta.mappedSymbols'`
            ).to.eql({
                root: STSymbol.getSymbol(meta, `root`),
                a: STSymbol.getSymbol(meta, `a`),
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

            STSymbol.addSymbol({ meta, symbol: symbolA });
            STSymbol.addSymbol({ meta, symbol: symbolB });

            expect(STSymbol.getSymbol(meta, `a`), `override`).to.equal(symbolB);
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

            expect(STSymbol.getSymbols(meta)).to.eql({
                root: STSymbol.getSymbol(meta, `root`),
                Btn: STSymbol.getSymbol(meta, `Btn`),
                Gallery: STSymbol.getSymbol(meta, `Gallery`),
            });
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

            STSymbol.addSymbol({
                meta,
                localName: `localA`,
                symbol: {
                    _kind: `class`,
                    name: `A`,
                },
            });

            expect(STSymbol.getSymbol(meta, `localA`)).to.eql({
                _kind: `class`,
                name: `A`,
            });
            expect(STSymbol.getSymbol(meta, `A`)).to.eql(undefined);
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

            STSymbol.addSymbol({ meta, symbol, node: ruleA });
            STSymbol.addSymbol({ meta, symbol, node: ruleB });
            // ToDo: warn on all declarations including the first
            expect(meta.diagnostics.reports).to.eql([
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

            // first symbol
            STSymbol.addSymbol({ meta, symbol, node: ruleA });
            // override: no diagnostics
            STSymbol.addSymbol({ meta, symbol, node: ruleB, safeRedeclare: true });
            // missing node: no diagnostics
            STSymbol.addSymbol({ meta, symbol });

            expect(meta.diagnostics.reports).to.eql([]);
        });
    });
});
