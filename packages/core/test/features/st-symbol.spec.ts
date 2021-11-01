import { STSymbol, StylableSymbol } from '@stylable/core/dist/features';
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

            STSymbol.addSymbol({ meta, symbol, node: ruleA});
            STSymbol.addSymbol({ meta, symbol, node: ruleB});

            expect(meta.diagnostics.reports).to.eql([
                {
                    type: `warning`,
                    message: STSymbol.diagnostics.REDECLARE_SYMBOL('a'),
                    node: ruleB,
                    options: {
                        word: `a`
                    }
                }
            ]);
        });
        it(`should NOT warn re-declared symbol with force=true or missing node`, () => {
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

            STSymbol.addSymbol({ meta, symbol, node: ruleA});
            STSymbol.addSymbol({ meta, symbol, node: ruleB, force: true});
            STSymbol.addSymbol({ meta, symbol });

            expect(meta.diagnostics.reports).to.eql([]);
        });
    });
});
