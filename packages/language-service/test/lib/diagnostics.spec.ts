import { createMemoryFs } from '@file-services/memory';
import { expect } from 'chai';
import { createDiagnosis } from '../../src/lib/diagnosis';
import { StylableLanguageService } from '../../src/lib/service';

function createDiagnostics(files: { [filePath: string]: string }, filePath: string) {
    const fs = createMemoryFs(files);
    const stylableLSP = new StylableLanguageService({
        rootPath: '/',
        fs,
        requireModule: require
    });

    const file = stylableLSP.getFs().readFileSync(filePath, 'utf8');
    return file ? createDiagnosis(file, filePath, stylableLSP.getStylable()) : null;
}

describe('diagnostics', () => {
    it('should create basic diagnostics', () => {
        const filePath = '/style.st.css';

        const diagnostics = createDiagnostics(
            {
                [filePath]: '.gaga .root{}'
            },
            filePath
        );

        expect(diagnostics).to.deep.include({
            range: {
                start: { line: 0, character: 0 },
                end: { line: 0, character: 13 }
            },
            message:
                '".root" class cannot be used after native elements or selectors external to the stylesheet',
            severity: 2
        });
    });

    xit('should create cross file errors', () => {
        const filePathA = 'style.css';
        const filePathB = 'import-style.st.css';

        const diagnostics = createDiagnostics(
            {
                [filePathA]: ``,
                [filePathB]: `
                        :import {
                            -st-from: ./${filePathA};
                            -st-named: ninja;
                        }

                        .ninja{}
                        `
            },
            filePathB
        );

        expect(diagnostics).to.deep.include({
            range: {
                start: { line: 3, character: 39 },
                end: { line: 3, character: 44 }
            },
            message: `cannot resolve imported symbol "ninja" in stylesheet "./${filePathA}"`,
            severity: 2
        });
    });
});
