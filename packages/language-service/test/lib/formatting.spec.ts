import { expect } from 'chai';
import { createRange } from '../../src/lib/completion-providers';
import { getFormattingEdits } from '../../test-kit/asserters';

describe('Formatting', () => {
    it('should format an entire stylesheet with extra spaces', () => {
        const res = getFormattingEdits('.root { color: red      ;}');

        expect(res).to.eql([
            {
                range: createRange(0, 0, 0, 26),
                newText: '.root {\n    color: red;\n}',
            },
        ]);
    });

    it('should perserve custom selectors with immediate decendants ', () => {
        const res = getFormattingEdits(
            '@custom-selector :--some-selector     >      :global(div) > :global(span);'
        );

        expect(res[0].newText).to.eql(
            '@custom-selector :--some-selector > :global(div) > :global(span);'
        );
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
});
