import {
    STSymbol,
    StylableSymbol,
    ClassSymbol,
    ElementSymbol,
    CSSVarSymbol,
} from '@stylable/core/dist/features';
import { ignoreDeprecationWarn } from '@stylable/core/dist/helpers/deprecation';
import { Diagnostics } from '@stylable/core/dist/diagnostics';
import { generateStylableResult } from '@stylable/core-test-kit';
import * as postcss from 'postcss';
import { expect } from 'chai';
import { expectType, TypeEqual } from 'ts-expect';

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

            const savedSymbol = STSymbol.get(meta, `a`);
            expect(savedSymbol).to.equal(symbol);
            expect(meta.getSymbol(`a`), `meta.getSymbol`).to.equal(STSymbol.get(meta, `a`));
            expectType<TypeEqual<StylableSymbol | undefined, typeof savedSymbol>>(true);
            expectType<TypeEqual<ClassSymbol | undefined, typeof savedSymbol>>(false);
            // deprecation
            expect(
                ignoreDeprecationWarn(() => meta.mappedSymbols),
                `deprecated 'meta.mappedSymbols'`
            ).to.eql({
                root: STSymbol.get(meta, `root`),
                a: STSymbol.get(meta, `a`),
            });
        });
        it(`should keep track of symbols by type`, () => {
            const { meta } = generateStylableResult({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: `entry`,
                        content: ``,
                    },
                },
            });
            const classSymbol: StylableSymbol = { _kind: `class`, name: `a` };
            const typeSymbol: StylableSymbol = { _kind: `element`, name: `a` };
            const context = { meta, diagnostics: new Diagnostics() };

            STSymbol.addSymbol({ context, symbol: classSymbol });
            STSymbol.addSymbol({ context, symbol: typeSymbol });

            const savedClass = STSymbol.get(meta, `a`, `class`);
            const savedType = STSymbol.get(meta, `a`, `element`);
            const savedVar = STSymbol.get(meta, `a`, `cssVar`);
            expect(savedClass, `class`).to.equal(classSymbol);
            expect(savedType, `element`).to.equal(typeSymbol);
            expect(savedVar, `var - not registered`).to.equal(undefined);
            expectType<TypeEqual<ClassSymbol | undefined, typeof savedClass>>(true);
            expectType<TypeEqual<ElementSymbol | undefined, typeof savedType>>(true);
            expectType<TypeEqual<CSSVarSymbol | undefined, typeof savedVar>>(true);
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

            const savedType = STSymbol.get(meta, `a`);
            expect(savedType, `override`).to.equal(symbolB);
            expectType<TypeEqual<StylableSymbol | undefined, typeof savedType>>(true);
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
        it(`should return collected symbols by namespace`, () => {
            const { meta } = generateStylableResult({
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: `entry`,
                        content: ``,
                    },
                },
            });
            const classSymbol: StylableSymbol = { _kind: `class`, name: `a` };
            const typeSymbol: StylableSymbol = { _kind: `element`, name: `b` };
            const keyframesSymbol: StylableSymbol = { _kind: `keyframes`, name: `c`, alias: `` };
            const context = { meta, diagnostics: new Diagnostics() };

            STSymbol.addSymbol({ context, symbol: classSymbol });
            STSymbol.addSymbol({ context, symbol: typeSymbol });
            STSymbol.addSymbol({ context, symbol: keyframesSymbol });

            expect(STSymbol.getAll(meta), `default to main ns`).to.eql({
                root: STSymbol.get(meta, `root`),
                a: STSymbol.get(meta, `a`),
                b: STSymbol.get(meta, `b`),
            });
            expect(STSymbol.getAll(meta, `main`), `main`).to.eql(STSymbol.getAll(meta));
            expect(STSymbol.getAll(meta, `keyframes`), `keyframes`).to.eql({
                c: STSymbol.get(meta, `c`, `keyframes`),
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
            STSymbol.reportRedeclare(context);

            expect(context.diagnostics.reports).to.eql([
                {
                    type: `warning`,
                    message: STSymbol.diagnostics.REDECLARE_SYMBOL('a'),
                    node: ruleA,
                    options: {
                        word: `a`,
                    },
                },
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
        it(`should NOT warn re-declared symbol with safeRedeclare=true`, () => {
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
            // collect reports
            STSymbol.reportRedeclare(context);

            expect(context.diagnostics.reports).to.eql([]);
        });
    });
});
