import { createMemoryFs } from '@file-services/memory';
import { Stylable } from '@stylable/core';
import { expect } from 'chai';

import { StylableLanguageService } from '../../src/lib/service';

function createDiagnostics(files: { [filePath: string]: string }, filePath: string) {
    const fs = createMemoryFs(files);

    const stylableLSP = new StylableLanguageService({
        fs,
        stylable: new Stylable('/', fs, require),
    });

    return stylableLSP.diagnose(filePath);
}

describe('diagnostics', () => {
    it('should create basic diagnostics', () => {
        const filePath = '/style.st.css';

        const diagnostics = createDiagnostics(
            {
                [filePath]: '.gaga .root{}',
            },
            filePath
        );

        expect(diagnostics).to.deep.include({
            range: {
                start: { line: 0, character: 0 },
                end: { line: 0, character: 13 },
            },
            message:
                '".root" class cannot be used after native elements or selectors external to the stylesheet',
            severity: 2,
            source: 'stylable',
        });
    });

    it('should create cross file errors', () => {
        const filePathA = '/style.css';
        const filePathB = '/import-style.st.css';

        const diagnostics = createDiagnostics(
            {
                [filePathA]: ``,
                [filePathB]: `
                        :import {
                            -st-from: .${filePathA};
                            -st-named: ninja;
                        }

                        .ninja{}
                        `,
            },
            filePathB
        );

        expect(diagnostics).to.deep.include({
            range: {
                start: { line: 3, character: 39 },
                end: { line: 3, character: 44 },
            },
            message: `cannot resolve imported symbol "ninja" from stylesheet ".${filePathA}"`,
            severity: 2,
            source: 'stylable',
        });
    });

    describe('css service', () => {
        it('should pass through unknown properties diagnostics from the css service', () => {
            const filePath = '/style.st.css';

            const diagnostics = createDiagnostics(
                {
                    [filePath]: `
                    :vars {}

                    .gaga {
                      myColor: red;
                    }
                    `,
                },
                filePath
            );

            expect(diagnostics).to.eql([
                {
                    range: {
                        start: { line: 4, character: 22 },
                        end: { line: 4, character: 29 },
                    },
                    message: `Unknown property: 'myColor'`,
                    severity: 2,
                    source: 'css',
                    code: 'unknownProperties',
                },
            ]);
        });

        it('should not warn about unknown properties inside :vars definition', () => {
            const filePath = '/style.st.css';

            const diagnostics = createDiagnostics(
                {
                    [filePath]: `
                    :vars {
                      varVar: binks;
                    }
                    `,
                },
                filePath
            );

            expect(diagnostics).to.eql([]);
        });

        it('should not warn about pseudo-states with params', () => {
            const filePath = '/style.st.css';

            const diagnostics = createDiagnostics(
                {
                    [filePath]: `
                    .root {
                      -st-states: someState(string);
                    }
                    .root:someState(T1)   {}    /* css-identifierexpected */ 
                    .root:someState(T1.1) {}    /* css-rparentexpected    */
                    `,
                },
                filePath
            );

            expect(diagnostics).to.eql([]);
        });

        it('should ignore errors from stylable vars in a media query', () => {
            const filePath = '/style.st.css';

            const diagnostics = createDiagnostics(
                {
                    [filePath]: `
                    :vars {
                        size: "screen and (min-width: 30em)";
                    }
                    
                    @media value(size) {
                        .part{}
                    }
                    `,
                },
                filePath
            );

            expect(diagnostics).to.eql([]);
        });
    });
});
