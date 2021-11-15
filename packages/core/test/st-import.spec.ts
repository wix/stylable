import { ImportSymbol, processorWarnings } from '@stylable/core';
import { STSymbol } from '@stylable/core/dist/features';
import { parseImportMessages } from '@stylable/core/dist/stylable-imports-tools';
import { flatMatch, processSource } from '@stylable/core-test-kit';
import * as chai from 'chai';

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
        expect(result.diagnostics.reports[0].message).to.eql(parseImportMessages.ST_IMPORT_STAR());
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
            parseImportMessages.ST_IMPORT_EMPTY_FROM()
        );
        expect(result.diagnostics.reports[1].message).to.eql(
            parseImportMessages.ST_IMPORT_EMPTY_FROM()
        );
    });

    it('warn on invalid default format', () => {
        const result = processSource(
            `
            @st-import %$ from ("");
            @st-import f rom "x";
        `,
            { from: 'path/to/style.css' }
        );

        expect(result.diagnostics.reports.length).to.eql(2);
        expect(result.diagnostics.reports[0].message).to.eql(
            parseImportMessages.INVALID_ST_IMPORT_FORMAT(['invalid missing source'])
        );
        expect(result.diagnostics.reports[1].message).to.eql(
            parseImportMessages.INVALID_ST_IMPORT_FORMAT([
                'invalid missing from',
                'invalid missing source',
            ])
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

        expect(STSymbol.get(result, `a`)).to.include({
            _kind: 'import',
            type: 'named',
        });

        expect(STSymbol.get(result, `c`)).to.include({
            _kind: 'import',
            type: 'named',
        });

        expect(STSymbol.get(result, `name`)).to.include({
            _kind: 'import',
            type: 'default',
        });

        expect(STSymbol.get(result, `t`)).to.include({
            _kind: 'import',
            type: 'default',
        });

        expect((STSymbol.get(result, `a`) as ImportSymbol).import).to.deep.include({
            // from: '/path/to/some/other/path',
            request: './some/other/path',
            defaultExport: '',
            named: { a: 'a', c: 'b' },
        });

        expect((STSymbol.get(result, `c`) as ImportSymbol).import).to.deep.include({
            // from: '/path/to/some/other/path',
            request: './some/other/path',
            defaultExport: '',
            named: { a: 'a', c: 'b' },
        });

        expect((STSymbol.get(result, `name`) as ImportSymbol).import).to.deep.include({
            // from: '/path/some/global/path',
            request: './some/global/path',
            defaultExport: 'name',
            named: {},
        });

        expect((STSymbol.get(result, `t1`) as ImportSymbol).import).to.deep.include({
            // from: '/path/some/global/path',
            request: './some/external/path',
            defaultExport: 't',
            named: { t1: 't1' },
        });
    });

    it('collect @st-import with classNames', () => {
        const result = processSource(
            `
            @st-import t-x, [-t1-x] from "./some/external/path";
        `,
            { from: 'path/to/style.css' }
        );

        expect(STSymbol.get(result, 't-x')).to.include({
            _kind: 'import',
            type: 'default',
        });

        expect(STSymbol.get(result, '-t1-x')).to.include({
            _kind: 'import',
            type: 'named',
        });
    });

    it('collect @st-import with keyframes', () => {
        const result = processSource(
            `
            @st-import [slide, keyframes(slide as slide1)] from "./some/external/path";
        `,
            { from: 'path/to/style.css' }
        );

        expect(STSymbol.get(result, `slide`)).to.include({
            _kind: 'import',
            type: 'named',
            name: 'slide',
        });

        expect(result.mappedKeyframes.slide1).to.include({
            _kind: 'keyframes',
            name: 'slide',
        });
    });
});
