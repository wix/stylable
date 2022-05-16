import {
    transformCustomSelectors,
    transformCustomSelectorMap,
    CustomSelectorMap,
    TransformCustomSelectorReport,
} from '@stylable/core/dist/helpers/custom-selector';
import { parseCssSelector, stringifySelectorAst } from '@tokey/css-selector-parser';
import { expect } from 'chai';

const noopReport = () => {
    /**/
};

describe('helpers/custom-selector', () => {
    describe('transformCustomSelectorMap', () => {
        it('should inline references', () => {
            const reports: TransformCustomSelectorReport[] = [];

            const selectors = transformCustomSelectorMap(
                {
                    ':--x': parseCssSelector(':is(target)'),
                    ':--y': parseCssSelector(':--x.y'),
                    ':--z': parseCssSelector(':--y.z'),
                },
                (report) => reports.push(report)
            );

            expect(stringifySelectorAst(selectors[':--x']), ':--x').to.eql(':is(target)');
            expect(stringifySelectorAst(selectors[':--y']), ':--y').to.eql(':is(target).y');
            expect(stringifySelectorAst(selectors[':--z']), ':--z').to.eql(':is(target).y.z');
            expect(reports, 'no circularity').to.eql([]);
        });
        it('should handle unknown custom selector', () => {
            const reports: TransformCustomSelectorReport[] = [];

            const selectors = transformCustomSelectorMap(
                {
                    ':--x': parseCssSelector(':--unknown'),
                },
                (report) => reports.push(report)
            );

            expect(stringifySelectorAst(selectors[':--x']), 'ref').to.eql(':--unknown');
            expect(reports, 'unknown selector').to.eql([
                { type: 'unknown', origin: ':--x', unknown: ':--unknown' },
            ]);
        });
        it('should report circular self reference', () => {
            const reports: TransformCustomSelectorReport[] = [];

            const selectors = transformCustomSelectorMap(
                {
                    ':--x': parseCssSelector(':--x, :is(:--x, :--y)'),
                    ':--y': parseCssSelector('.A'),
                },
                (report) => reports.push(report)
            );

            expect(stringifySelectorAst(selectors[':--x']), ':--x').to.eql(':--x, :is(:--x, .A)');
            expect(stringifySelectorAst(selectors[':--y']), ':--y').to.eql('.A');
            expect(reports, 'circularity reports').to.eql([
                { type: 'circular', path: [':--x'] }, // first
                { type: 'circular', path: [':--x'] }, // second
            ]); // ToDo: maybe don't report 2 identical paths
        });
        it('should report circular deep reference', () => {
            const reports: TransformCustomSelectorReport[] = [];

            const selectors = transformCustomSelectorMap(
                {
                    ':--x': parseCssSelector(':is(:--z):--a'),
                    ':--y': parseCssSelector(':--x.y'),
                    ':--z': parseCssSelector(':--y.z'),
                    ':--a': parseCssSelector('.A'),
                },
                (report) => reports.push(report)
            );

            expect(stringifySelectorAst(selectors[':--x']), ':--x').to.eql(':is(:--x.y.z).A');
            expect(stringifySelectorAst(selectors[':--y']), ':--y').to.eql(':is(:--x.y.z).A.y');
            expect(stringifySelectorAst(selectors[':--z']), ':--z').to.eql(':is(:--x.y.z).A.y.z');
            expect(reports, 'circularity reports').to.eql([
                { type: 'circular', path: [':--x', ':--z', ':--y'] }, // only the first custom selector found in loop
            ]);
        });
    });
    describe('transformCustomSelectors', () => {
        it('should preserve selector without custom selector', () => {
            const input = parseCssSelector('.a:is(.b, :not(.c))');
            const selectors: CustomSelectorMap = {};

            const output = transformCustomSelectors(
                input,
                (name: string) => selectors[name],
                noopReport
            );

            expect(output).to.eql(input);
        });
        it('should permute for each selector', () => {
            const input = parseCssSelector('.before:--x.after');
            const selectors: CustomSelectorMap = {
                ':--x': parseCssSelector('.A, .B'),
            };

            const output = transformCustomSelectors(
                input,
                (name: string) => selectors[name],
                noopReport
            );

            expect(stringifySelectorAst(output)).to.eql('.before.A.after,.before.B.after');
        });
        it('should permute for each selector from multiple custom selectors', () => {
            const input = parseCssSelector(':--x:--y');
            const selectors: CustomSelectorMap = {
                ':--x': parseCssSelector('.A, .B'),
                ':--y': parseCssSelector('.C, .D'),
            };

            const output = transformCustomSelectors(
                input,
                (name: string) => selectors[name],
                noopReport
            );

            expect(stringifySelectorAst(output)).to.eql('.A.C,.B.C,.A.D,.B.D');
        });
        it('should permute for each selector from multiple custom selectors (x3)', () => {
            const input = parseCssSelector(':--x:--y:--z');
            const selectors: CustomSelectorMap = {
                ':--x': parseCssSelector('.A, .B'),
                ':--y': parseCssSelector('.C, .D'),
                ':--z': parseCssSelector('.E, .F'),
            };

            const output = transformCustomSelectors(
                input,
                (name: string) => selectors[name],
                noopReport
            );

            expect(stringifySelectorAst(output)).to.eql(
                [
                    '.A.C.E',
                    '.B.C.E',
                    '.A.D.E',
                    '.B.D.E',
                    '.A.C.F',
                    '.B.C.F',
                    '.A.D.F',
                    '.B.D.F',
                ].join(',')
            );
        });
        it('should permute from deep selectors', () => {
            const input = parseCssSelector(':is(:--x):not(:--y)');
            const selectors: CustomSelectorMap = {
                ':--x': parseCssSelector('.AA, .BB'),
                ':--y': parseCssSelector('.CC, .DD'),
            };

            const output = transformCustomSelectors(
                input,
                (name: string) => selectors[name],
                noopReport
            );

            expect(stringifySelectorAst(output)).to.eql(
                [
                    ':is(.AA):not(.CC)',
                    ':is(.BB):not(.CC)',
                    ':is(.AA):not(.DD)',
                    ':is(.BB):not(.DD)',
                ].join(',')
            );
        });
        it('should permute multi selector input', () => {
            const input = parseCssSelector(':--x,:--y');
            const selectors: CustomSelectorMap = {
                ':--x': parseCssSelector('.A, .B'),
                ':--y': parseCssSelector('.C, .D'),
            };

            const output = transformCustomSelectors(
                input,
                (name: string) => selectors[name],
                noopReport
            );

            expect(stringifySelectorAst(output)).to.eql('.A,.B,.C,.D');
        });
        it('should deep replace custom selectors', () => {
            const input = parseCssSelector(':--y');
            const selectors = transformCustomSelectorMap(
                {
                    ':--x': parseCssSelector('.A'),
                    ':--y': parseCssSelector(':--x'),
                },
                noopReport
            );

            const output = transformCustomSelectors(
                input,
                (name: string) => selectors[name],
                noopReport
            );

            expect(stringifySelectorAst(output)).to.eql('.A');
        });
        it('should handle unknown name', () => {
            const input = parseCssSelector(':--x');
            const reports: TransformCustomSelectorReport[] = [];

            const output = transformCustomSelectors(
                input,
                (_name: string) => undefined,
                (data) => reports.push(data)
            );

            expect(stringifySelectorAst(output), 'transform').to.eql(':--x');
            expect(reports, 'reports').to.eql([{ type: 'unknown', origin: '', unknown: ':--x' }]);
        });
        it('should handle circular reference', () => {
            const inputX = parseCssSelector(':--x');
            const inputY = parseCssSelector(':--y');
            const selectors = transformCustomSelectorMap(
                {
                    ':--x': parseCssSelector(':--y'),
                    ':--y': parseCssSelector(':--x'),
                },
                (_path) => {
                    /*circular report*/
                }
            );

            const outputX = transformCustomSelectors(
                inputX,
                (name: string) => selectors[name],
                noopReport
            );
            const outputY = transformCustomSelectors(
                inputY,
                (name: string) => selectors[name],
                noopReport
            );

            expect(stringifySelectorAst(outputX), ':--x').to.eql(':--x');
            expect(stringifySelectorAst(outputY), ':--y').to.eql(':--x');
        });
    });
});
