import { expect } from 'chai';
import { createRange } from '@stylable/language-service/dist/lib/completion-providers';
import * as asserters from '../../test-kit/completions-asserters.js';
import { getFormattingEdits } from '../../../test/test-kit/asserters.js';

describe('@st-import Directive', () => {
    it('should not complete :global inside @st-import (default)', () => {
        const asserter = asserters.getCompletions('st-import/inside-multiline-empty-named.st.css');
        asserter.notSuggested([asserters.globalCompletion(createRange(4, 4, 4, 4))]);
    });

    it('should not complete :global inside @st-import (named)', () => {
        const asserter = asserters.getCompletions('st-import/inside-empty-default.st.css');
        asserter.notSuggested([asserters.globalCompletion(createRange(0, 11, 0, 11))]);
    });

    it('should format statements even when @st-import exists in the document (and ignore st-import)', () => {
        const res = getFormattingEdits(`
        @st-import Comp, [v1, v2, v3] from "./stylesheet.st.css";
        
        .root {color:     red;}`);

        expect(res).to.eql([
            {
                newText:
                    '@st-import Comp, [v1, v2, v3] from "./stylesheet.st.css";\n\n.root {\n    color: red;\n}',
                range: { start: { line: 0, character: 0 }, end: { line: 3, character: 31 } },
            },
        ]);
    });

    it('should not break on format statements when @st-import is not the first import', () => {
        const res = getFormattingEdits(`.x {}

@st-import Comp from "./stylesheet.st.css";

.y {}`);

        expect(res).to.eql([]);
    });
});
