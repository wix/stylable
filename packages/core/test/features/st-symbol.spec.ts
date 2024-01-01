import {
    STSymbol,
    StylableSymbol,
    ClassSymbol,
    ElementSymbol,
    CSSVarSymbol,
    VarSymbol,
    ImportSymbol,
    KeyframesSymbol,
    CSSClass,
    CSSType,
} from '@stylable/core/dist/features';
import { Diagnostics } from '@stylable/core/dist/diagnostics';
import { diagnosticBankReportToStrings, testStylableCore } from '@stylable/core-test-kit';
import * as postcss from 'postcss';
import chai, { expect } from 'chai';
import chaiSubset from 'chai-subset';
import { expectType, TypeEqual } from 'ts-expect';

chai.use(chaiSubset);

const stSymbolDiagnostics = diagnosticBankReportToStrings(STSymbol.diagnostics);

describe(`features/st-symbol`, () => {
    it(`should keep symbol on meta`, () => {
        const { sheets } = testStylableCore(``);
        const { meta } = sheets[`/entry.st.css`];
        const symbol: StylableSymbol = CSSClass.createSymbol({ name: `a` });
        const context = { meta, diagnostics: new Diagnostics() };

        STSymbol.addSymbol({ context, symbol });

        const savedSymbol = STSymbol.get(meta, `a`);
        expect(savedSymbol).to.equal(symbol);
        expect(meta.getSymbol(`a`), `meta.getSymbol`).to.equal(STSymbol.get(meta, `a`));
        expectType<TypeEqual<StylableSymbol | undefined, typeof savedSymbol>>(true);
        expectType<TypeEqual<ClassSymbol | undefined, typeof savedSymbol>>(false);
    });
    it(`should keep track of symbols by type`, () => {
        const { sheets } = testStylableCore(``);
        const { meta } = sheets[`/entry.st.css`];
        const classSymbol: StylableSymbol = CSSClass.createSymbol({ name: `a` });
        const typeSymbol: StylableSymbol = CSSType.createSymbol({ name: `a` });
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
        const { sheets } = testStylableCore(``);
        const { meta } = sheets[`/entry.st.css`];
        const symbolA: StylableSymbol = CSSClass.createSymbol({ name: `a` });
        const symbolB: StylableSymbol = CSSType.createSymbol({ name: `a` });
        const context = { meta, diagnostics: new Diagnostics() };

        STSymbol.addSymbol({ context, symbol: symbolA });
        STSymbol.addSymbol({ context, symbol: symbolB });

        const savedType = STSymbol.get(meta, `a`);
        expect(savedType, `override`).to.equal(symbolB);
        expectType<TypeEqual<StylableSymbol | undefined, typeof savedType>>(true);
    });
    it(`should return collected symbols`, () => {
        const { sheets } = testStylableCore(`
            Btn {}
            Gallery {}
        `);
        const { meta } = sheets[`/entry.st.css`];

        expect(STSymbol.getAll(meta)).to.eql({
            root: STSymbol.get(meta, `root`),
            Btn: STSymbol.get(meta, `Btn`),
            Gallery: STSymbol.get(meta, `Gallery`),
        });
        expect(meta.getAllSymbols(), `meta.getAllSymbols`).to.eql(STSymbol.getAll(meta));
    });
    it(`should return collected symbols by namespace`, () => {
        const { sheets } = testStylableCore(``);
        const { meta } = sheets[`/entry.st.css`];
        const classSymbol: StylableSymbol = CSSClass.createSymbol({ name: `a` });
        const typeSymbol: StylableSymbol = CSSType.createSymbol({ name: `b` });
        const keyframesSymbol: StylableSymbol = { _kind: `keyframes`, name: `c`, alias: `` };
        const context = { meta, diagnostics: new Diagnostics() };

        STSymbol.addSymbol({ context, symbol: classSymbol });
        STSymbol.addSymbol({ context, symbol: typeSymbol });
        STSymbol.addSymbol({ context, symbol: keyframesSymbol });

        const fromDefault = STSymbol.getAll(meta);
        const fromMain = STSymbol.getAll(meta, `main`);
        const fromKeyframes = STSymbol.getAll(meta, `keyframes`);
        expect(fromDefault, `default to main ns`).to.eql({
            root: STSymbol.get(meta, `root`),
            a: STSymbol.get(meta, `a`),
            b: STSymbol.get(meta, `b`),
        });
        expect(fromMain, `main`).to.eql(STSymbol.getAll(meta));
        expect(fromKeyframes, `keyframes`).to.eql({
            c: STSymbol.get(meta, `c`, `keyframes`),
        });
        type mainNSSymbols = ClassSymbol | VarSymbol | ImportSymbol | ElementSymbol | CSSVarSymbol;
        expectType<TypeEqual<Record<string, mainNSSymbols>, typeof fromDefault>>(true);
        expectType<TypeEqual<Record<string, mainNSSymbols>, typeof fromMain>>(true);
        expectType<TypeEqual<Record<string, KeyframesSymbol>, typeof fromKeyframes>>(true);
    });
    it(`should accept optional local name different then symbol name`, () => {
        const { sheets } = testStylableCore(``);
        const { meta } = sheets[`/entry.st.css`];
        const context = { meta, diagnostics: new Diagnostics() };

        STSymbol.addSymbol({
            context,
            localName: `localA`,
            symbol: CSSClass.createSymbol({
                name: `A`,
            }),
        });

        expect(STSymbol.get(meta, `localA`)).to.eql(
            CSSClass.createSymbol({
                name: `A`,
            })
        );
        expect(STSymbol.get(meta, `A`)).to.eql(undefined);
    });
    describe(`diagnostics`, () => {
        it(`should warn on node with re-declared symbol`, () => {
            const { sheets } = testStylableCore(``);
            const { meta } = sheets[`/entry.st.css`];
            const symbol: StylableSymbol = CSSClass.createSymbol({ name: `a` });
            const ruleA = new postcss.Rule();
            const ruleB = new postcss.Rule();
            const context = { meta, diagnostics: new Diagnostics() };

            STSymbol.addSymbol({ context, symbol, node: ruleA });
            STSymbol.addSymbol({ context, symbol, node: ruleB });
            STSymbol.reportRedeclare(context);

            expect(context.diagnostics.reports).to.containSubset([
                {
                    severity: `warning`,
                    message: stSymbolDiagnostics.REDECLARE_SYMBOL('a'),
                    node: ruleA,
                    word: `a`,
                },
                {
                    severity: `warning`,
                    message: stSymbolDiagnostics.REDECLARE_SYMBOL('a'),
                    node: ruleB,
                    word: `a`,
                },
            ]);
        });
        it(`should NOT warn re-declared symbol with safeRedeclare=true`, () => {
            const { sheets } = testStylableCore(``);
            const { meta } = sheets[`/entry.st.css`];
            const symbol: StylableSymbol = CSSClass.createSymbol({ name: `a` });
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
        it(`should warn on root declaration`, () => {
            const { sheets } = testStylableCore(``);
            const { meta } = sheets[`/entry.st.css`];
            const symbol: StylableSymbol = CSSClass.createSymbol({ name: `root` });
            const rule = new postcss.Rule();
            const context = { meta, diagnostics: new Diagnostics() };

            STSymbol.addSymbol({ context, symbol, node: rule });

            expect(context.diagnostics.reports).to.containSubset([
                {
                    severity: `error`,
                    message: stSymbolDiagnostics.REDECLARE_ROOT(),
                    node: rule,
                    word: `root`,
                },
            ]);
        });
    });
});
