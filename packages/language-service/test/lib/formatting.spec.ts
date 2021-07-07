import { expect } from 'chai';
import { createRange } from '@stylable/language-service/dist/lib/completion-providers';
import { getFormattingEdits } from '../test-kit/asserters';

describe('Formatting', () => {
    it('should format an entire stylesheet', () => {
        const res = getFormattingEdits('.root { color: red      ;}');

        expect(res).to.eql([
            {
                range: createRange(0, 0, 0, 26),
                newText: '.root {\n    color: red;\n}',
            },
        ]);
    });

    it('should format a specific range', () => {
        const res = getFormattingEdits('.root { color: red      ;}', { start: 14, end: 25 });

        expect(res).to.eql([
            {
                range: createRange(0, 14, 0, 25),
                newText: ' red;',
            },
        ]);
    });

    describe('vscode formatting options', () => {
        it('should format with tabs', () => {
            const res = getFormattingEdits('.root { color: red      ;}', undefined, {
                insertSpaces: false,
                tabSize: 4,
            });

            expect(res).to.eql([
                {
                    range: createRange(0, 0, 0, 26),
                    newText: '.root {\n\tcolor: red;\n}',
                },
            ]);
        });

        it('should format with 2 spaces', () => {
            const res = getFormattingEdits('.root { color: red      ;}', undefined, {
                insertSpaces: true,
                tabSize: 2,
            });

            expect(res).to.eql([
                {
                    range: createRange(0, 0, 0, 26),
                    newText: '.root {\n  color: red;\n}',
                },
            ]);
        });

        it('should format with a final new line', () => {
            const res = getFormattingEdits('.root { color: red      ;}', undefined, {
                insertSpaces: true,
                tabSize: 4,
                insertFinalNewline: true,
            });

            expect(res).to.eql([
                {
                    range: createRange(0, 0, 0, 26),
                    newText: '.root {\n    color: red;\n}\n',
                },
            ]);
        });

        it('should format trimming final lines', () => {
            const res = getFormattingEdits('.root { color: red      ;}\n\n', undefined, {
                insertSpaces: true,
                tabSize: 4,
                trimFinalNewlines: true,
            });

            expect(res).to.eql([
                {
                    range: createRange(0, 0, 2, 0),
                    newText: '.root {\n    color: red;\n}',
                },
            ]);
        });

        xit('should format and not trim whitespaces', () => {
            // this vscode option is not supported by JSBeautify
            const res = getFormattingEdits('.root { color: red      ;       \n}', undefined, {
                insertSpaces: true,
                tabSize: 4,
                trimTrailingWhitespace: false,
            });

            expect(res).to.eql([
                {
                    range: createRange(0, 0, 2, 0),
                    newText: '.root {\n    color: red;\n}         ',
                },
            ]);
        });
    });
});
