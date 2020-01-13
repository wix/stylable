import { flatMatch, processSource } from '@stylable/core-test-kit';
import * as chai from 'chai';
import { ImportSymbol, processorWarnings } from '../src/stylable-processor';

const expect = chai.expect;
chai.use(flatMatch);

describe('Stylable @st-import', () => {
    it('not available in nested scope', () => {
        const result = processSource(
            `
            @at {
                @st-import "./some/path";
            }
        `,
            { from: 'path/to/style.css' }
        );

        expect(result.diagnostics.reports.length).to.eql(1);
        expect(result.diagnostics.reports[0].message).to.eql(
            processorWarnings.NO_ST_IMPORT_IN_NESTED_SCOPE()
        );
    });

    it('not support * as imports', () => {
        const result = processSource(
            `
            @st-import * as X from "./some/path";
        `,
            { from: 'path/to/style.css' }
        );

        expect(result.diagnostics.reports.length).to.eql(1);
        expect(result.diagnostics.reports[0].message).to.eql(processorWarnings.ST_IMPORT_STAR());
    });

    it('warn on empty from', () => {
        const result = processSource(
            `
            @st-import X from "";
            @st-import Y from " ";
        `,
            { from: 'path/to/style.css' }
        );

        expect(result.diagnostics.reports.length).to.eql(2);
        expect(result.diagnostics.reports[0].message).to.eql(
            processorWarnings.ST_IMPORT_EMPTY_FROM()
        );
        expect(result.diagnostics.reports[1].message).to.eql(
            processorWarnings.ST_IMPORT_EMPTY_FROM()
        );
    });

    it('warn on invalid format', () => {
        const result = processSource(
            `
            @st-import %$ from ("");
            @st-import f rom "x";
        `,
            { from: 'path/to/style.css' }
        );

        expect(result.diagnostics.reports.length).to.eql(2);
        expect(result.diagnostics.reports[0].message).to.eql(
            processorWarnings.INVALID_ST_IMPORT_FORMAT()
        );
        expect(result.diagnostics.reports[1].message).to.eql(
            processorWarnings.INVALID_ST_IMPORT_FORMAT()
        );
    });

    it('collect @st-import (compatible with :import)', () => {
        const result = processSource(
            `
            @st-import "./some/path";
            @st-import [a, b as c] from "./some/other/path";
            @st-import name from "./some/global/path";
            @st-import t, [t1] from "./some/external/path";
        `,
            { from: 'path/to/style.css' }
        );

        expect(result.imports.length).to.eql(4);

        expect(result.mappedSymbols.a).to.include({
            _kind: 'import',
            type: 'named'
        });

        expect(result.mappedSymbols.c).to.include({
            _kind: 'import',
            type: 'named'
        });

        expect(result.mappedSymbols.name).to.include({
            _kind: 'import',
            type: 'default'
        });

        expect(result.mappedSymbols.t).to.include({
            _kind: 'import',
            type: 'default'
        });

        expect((result.mappedSymbols.a as ImportSymbol).import).to.deep.include({
            // from: '/path/to/some/other/path',
            fromRelative: './some/other/path',
            defaultExport: '',
            named: { a: 'a', c: 'b' }
        });

        expect((result.mappedSymbols.c as ImportSymbol).import).to.deep.include({
            // from: '/path/to/some/other/path',
            fromRelative: './some/other/path',
            defaultExport: '',
            named: { a: 'a', c: 'b' }
        });

        expect((result.mappedSymbols.name as ImportSymbol).import).to.deep.include({
            // from: '/path/some/global/path',
            fromRelative: './some/global/path',
            defaultExport: 'name',
            named: {}
        });

        expect((result.mappedSymbols.t1 as ImportSymbol).import).to.deep.include({
            // from: '/path/some/global/path',
            fromRelative: './some/external/path',
            defaultExport: 't',
            named: { t1: 't1' }
        });
    });
});
