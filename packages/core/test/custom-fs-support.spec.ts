import { createMemoryFs } from '@file-services/memory';
import { expect } from 'chai';
import { Stylable } from '../src';

describe(`@stylable/core support for custom fs`, () => {
    it('allows providing a custom fs and resolves imports across its files', () => {
        const filePathA = '/a.st.css';
        const filePathB = '/b.st.css';
        const fs = createMemoryFs({
            [filePathA]: `
                :import {
                    -st-from: './b.st.css';
                    -st-default: B;
                }
            `,
            [filePathB]: `
                .root {
                    background-color: green;
                }
            `
        });
        const stylable = new Stylable(fs.cwd(), fs, require);

        const {
            meta: { diagnostics, transformDiagnostics }
        } = stylable.transform(fs.readFileSync(filePathA, 'utf8'), filePathA);

        expect(diagnostics.reports, 'reports').to.have.lengthOf(0);
        expect(transformDiagnostics, 'transformDiagnostics').to.not.equal(null);
        expect(transformDiagnostics!.reports, 'transformDiagnostics.reports').to.eql([]);
    });
});
