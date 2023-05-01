import { expect } from 'chai';
import {
    createRange,
    ProviderRange,
} from '@stylable/language-service/dist/lib/completion-providers';
import type { Completion } from '@stylable/language-service/dist/lib/completion-types';
import * as asserters from '../../test-kit/completions-asserters';
import { getFormattingEdits } from '../../../test/test-kit/asserters';

const named = ['c1', 'color2', 'part', 'otherPart'];

describe('@st-import Directive', () => {
    describe('should complete @st-import at top level ', () => {
        it('should complete css vars', () => {
            const asserter = asserters.getCompletions('css-vars/import.st.css', '--');

            asserter.suggested([
                asserters.namedCompletion(
                    '--x',
                    createRange(0, 12, 0, 14),
                    './css-vars.st.css',
                    '--x'
                ),
                asserters.namedCompletion(
                    '--x2',
                    createRange(0, 12, 0, 14),
                    './css-vars.st.css',
                    '--x2'
                ),
                asserters.namedCompletion(
                    '--y2',
                    createRange(0, 12, 0, 14),
                    './css-vars.st.css',
                    'Global --y2'
                ),
                asserters.namedCompletion(
                    '--y',
                    createRange(0, 12, 0, 14),
                    './css-vars.st.css',
                    'Global --y'
                ),
            ]);
        });

        describe('should complete named parts from .st.css files ', () => {
            for (const name of named) {
                name.split('').map((_c, i) => {
                    const prefix = name.slice(0, i);

                    it('should complete empty named section with Prefix: ' + prefix + ' ', () => {
                        const asserter = asserters.getCompletions(
                            'st-import/inside-empty-named.st.css',
                            prefix
                        );
                        asserter.suggested([
                            asserters.namedCompletion(
                                name,
                                createRange(0, 12, 0, 12 + i),
                                './import.st.css',
                                name === named[0]
                                    ? 'brown'
                                    : name === named[1]
                                    ? 'pink'
                                    : 'Stylable class'
                            ),
                        ]);
                    });

                    it(
                        'should complete empty multiline named section with Prefix: ' +
                            prefix +
                            ' ',
                        () => {
                            const asserter = asserters.getCompletions(
                                'st-import/inside-multiline-empty-named.st.css',
                                prefix
                            );
                            asserter.suggested([
                                asserters.namedCompletion(
                                    name,
                                    createRange(1, 4, 1, 4 + i),
                                    './import.st.css',
                                    name === named[0]
                                        ? 'brown'
                                        : name === named[1]
                                        ? 'pink'
                                        : 'Stylable class'
                                ),
                            ]);
                        }
                    );
                });
            }
        });

        describe('should complete named parts from .js files ', () => {
            const str5 = 'aMixin';
            const str6 = 'aFormatter';

            [str5, str6].forEach((str) => {
                str.split('').forEach((_c, i) => {
                    const prefix = str.slice(0, i);
                    const rng = createRange(0, 12, 0, 12 + i);
                    const path = '../mixins/js-mixins.js';

                    const createComp = (str: string, rng: ProviderRange) =>
                        asserters.namedCompletion(str, rng, path);
                    it(
                        'Completes names of functions from JS imports, with prefix ' + prefix + ' ',
                        () => {
                            const asserter = asserters.getCompletions(
                                'st-import/named-js.st.css',
                                prefix
                            );
                            const exp: Array<Partial<Completion>> = [];
                            const notExp: Array<Partial<Completion>> = [];
                            if (prefix.length <= 1) {
                                exp.push(createComp(str5, rng));
                                exp.push(createComp(str6, rng));
                            } else {
                                exp.push(createComp(str, rng));
                                notExp.push(createComp(str === str5 ? str6 : str5, rng));
                            }
                            asserter.suggested(exp);
                            asserter.notSuggested(notExp);
                        }
                    );
                });
            });

            [str5, str6].forEach((str) => {
                str.split('').forEach((_c, i) => {
                    const prefix = str.slice(0, i);
                    const rng = createRange(1, 4, 1, 4 + i);
                    const path = '../mixins/js-mixins.js';

                    const createComp = (str: string, rng: ProviderRange) =>
                        asserters.namedCompletion(str, rng, path);
                    it(
                        'Completes names of functions from JS imports, with prefix ' + prefix + ' ',
                        () => {
                            const asserter = asserters.getCompletions(
                                'st-import/named-js-newline.st.css',
                                prefix
                            );
                            const exp: Array<Partial<Completion>> = [];
                            const notExp: Array<Partial<Completion>> = [];
                            if (prefix.length <= 1) {
                                exp.push(createComp(str5, rng));
                                exp.push(createComp(str6, rng));
                            } else {
                                exp.push(createComp(str, rng));
                                notExp.push(createComp(str === str5 ? str6 : str5, rng));
                            }
                            asserter.suggested(exp);
                            asserter.notSuggested(notExp);
                        }
                    );
                });
            });
        });
    });

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
