import { expect } from 'chai';
import { deindent } from '@stylable/core-test-kit';

describe('helpers/deindent', () => {
    it(`should trim single line`, () => {
        const result = deindent(`   A  `);
        expect(result, 'empty lines').to.eql(`A`);
    });
    it(`should trim first and last empty lines`, () => {
        const result = deindent(`
            A
        `);
        expect(result, 'empty lines').to.eql(`A`);
    });
    it(`should preserve first and last lines with context`, () => {
        const result = deindent(`X
            A
        Y`);
        expect(result, 'empty lines').to.eql(`X
            A
        Y`);
    });
    it(`should remove all indentation`, () => {
        const result = deindent(`
            A
            B
        `);
        expect(result).to.eql(`A\nB`);
    });
    it(`should preserve relative indentation`, () => {
        const result = deindent(`
            A
            	B
             C
        `);
        expect(result).to.eql(`A\n\tB\n C`);
    });
});
