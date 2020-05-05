import { expect } from 'chai';
import { Color } from 'vscode-languageserver-protocol';
import { createRange } from '../../src/lib/completion-providers';
import { getDocColorPresentation, getDocumentColors } from '../../test-kit/asserters';

export function createColor(red: number, green: number, blue: number, alpha: number): Color {
    return { red, green, blue, alpha } as Color;
}

describe('Colors', () => {
    describe('DocumentColor', () => {
        it('should resolve information for a single color', () => {
            const res = getDocumentColors('colors/single-color.st.css');

            expect(res).to.eql([
                {
                    range: createRange(1, 11, 1, 14),
                    color: createColor(1, 0, 0, 1),
                },
            ]);
        });

        it('should resolve information for a variable color', () => {
            const res = getDocumentColors('colors/single-var-color.st.css');

            expect(res).to.eql([
                {
                    range: createRange(5, 11, 5, 24),
                    color: createColor(0, 1, 0, 0.8),
                },
                {
                    range: createRange(1, 12, 1, 31),
                    color: createColor(0, 1, 0, 0.8),
                },
            ]);
        });

        it('should resolve information for a single imported color', () => {
            const res = getDocumentColors('colors/imported-color.st.css');

            expect(res).to.eql([
                {
                    range: createRange(6, 11, 6, 24),
                    color: createColor(0, 1, 0, 0.8),
                },
            ]);
        });

        it('should resolve only one color when variable has another variable name as substring', () => {
            const res = getDocumentColors('colors/substring-var-import.st.css');

            expect(res.length).to.eql(1);
        });

        it('should resolve information colors in a @st-scope', () => {
            const res = getDocumentColors('st-scope/single-variable-color.st.css');

            expect(res).to.eql([
                {
                    range: createRange(6, 15, 6, 29),
                    color: createColor(1, 0, 0, 1),
                },
                {
                    range: createRange(1, 13, 1, 16),
                    color: createColor(1, 0, 0, 1),
                },
                {
                    range: createRange(7, 26, 7, 33),
                    color: createColor(1, 1, 1, 1),
                },
            ]);
        });
    });

    describe('ColorPresentation', () => {
        it('should return presentation in variable definition', () => {
            const range = createRange(1, 12, 1, 31);
            const color = {
                red: 0,
                green: 1,
                blue: 0,
                alpha: 0.8,
            };

            const res = getDocColorPresentation('colors/color-presentation.st.css', color, range);

            expect(res.length).to.equal(3);
            expect(res.filter((cp) => cp.label === 'rgba(0, 255, 0, 0.8)').length).to.equal(1);
        });

        it('should return presentation in variable usage', () => {
            const range = createRange(5, 11, 5, 24);
            const color = {
                red: 0,
                green: 1,
                blue: 0,
                alpha: 0.8,
            };

            const res = getDocColorPresentation('colors/color-presentation.st.css', color, range);

            expect(res.length).to.equal(3);
            expect(res.filter((cp) => cp.label === 'rgba(0, 255, 0, 0.8)').length).to.equal(1);
        });

        it('should return presentation for imports variables', () => {
            const range = createRange(7, 11, 7, 24);
            const color = {
                red: 0,
                green: 1,
                blue: 0,
                alpha: 0.8,
            };

            const res = getDocColorPresentation(
                'colors/color-presentation-import.st.css',
                color,
                range
            );

            expect(res.length).to.equal(3);
            expect(res.filter((cp) => cp.label === 'rgba(0, 255, 0, 0.8)').length).to.equal(1);
        });
    });
});
