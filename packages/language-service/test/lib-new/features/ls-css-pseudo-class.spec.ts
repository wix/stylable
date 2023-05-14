import { Command } from 'vscode-languageserver';
import { testLangService } from '../../test-kit/test-lang-service';
import { createTempDirectorySync } from '@stylable/core-test-kit';

const triggerCompletion = Command.create('additional', 'editor.action.triggerSuggest');
const triggerParameterHints = Command.create('additional', 'editor.action.triggerParameterHints');

describe('LS: css-pseudo-class', () => {
    it('should suggest class custom states', () => {
        const { service, carets, assertCompletions, textEditContext } = testLangService(`
            .x {
                -st-states: xxx;
            }
            .y {
                -st-states: yyy;
            }
            .z {
                -st-states: aaa, bbb;
            }

            .z^afterRoot^ {}

            .z:a^partial^ {}

            .z .x^complex^ .y {}
        `);
        const entryPath = '/entry.st.css';
        const entryCarets = carets[entryPath];
        const { replaceText } = textEditContext(entryPath);

        assertCompletions({
            message: 'classes states',
            actualList: service.onCompletion(entryPath, entryCarets.afterRoot),
            expectedList: [{ label: ':aaa' }, { label: ':bbb' }],
            unexpectedList: [{ label: ':xxx' }, { label: ':yyy' }],
        });

        assertCompletions({
            message: 'partial',
            actualList: service.onCompletion(entryPath, entryCarets.partial),
            expectedList: [
                {
                    label: ':aaa',
                    textEdit: replaceText(entryCarets.partial, ':aaa', { deltaStart: -2 }),
                },
            ],
            unexpectedList: [{ label: ':bbb' }],
        });

        assertCompletions({
            message: 'complex selector',
            actualList: service.onCompletion(entryPath, entryCarets.partial),
            expectedList: [
                {
                    label: ':aaa',
                    textEdit: replaceText(entryCarets.partial, ':aaa', { deltaStart: -2 }),
                },
            ],
            unexpectedList: [{ label: ':bbb' }],
        });
    });
    it('should suggest root custom states in empty selector', () => {
        // ToDo: once experimentalSelectorInference is on this should not behave like this
        const { service, carets, assertCompletions } = testLangService(`
            .root {
                -st-states: aaa, bbb;
            }

            ^empty^ {}
        `);
        const entryPath = '/entry.st.css';
        const entryCarets = carets[entryPath];

        assertCompletions({
            message: 'empty',
            actualList: service.onCompletion(entryPath, entryCarets.empty),
            expectedList: [{ label: ':aaa' }, { label: ':bbb' }],
        });
    });
    it('should NOT suggest used states', () => {
        const { service, carets, assertCompletions } = testLangService(`
            .x {
                -st-states: aaa, bbb;
            }

            .x:aaa^afterExistingState^ {}
        `);
        const entryPath = '/entry.st.css';
        const entryCarets = carets[entryPath];

        assertCompletions({
            actualList: service.onCompletion(entryPath, entryCarets.afterExistingState),
            expectedList: [{ label: ':bbb' }],
            unexpectedList: [{ label: ':aaa' }],
        });
    });
    it('should suggest pseudo-element custom states', () => {
        const { service, carets, assertCompletions } = testLangService(`
            .root {}
            .part {
                -st-states: aaa, bbb;
            }

            .root::part^afterPseudoElement^ {}
        `);
        const entryPath = '/entry.st.css';
        const entryCarets = carets[entryPath];

        assertCompletions({
            actualList: service.onCompletion(entryPath, entryCarets.afterPseudoElement),
            expectedList: [{ label: ':aaa' }, { label: ':bbb' }],
        });
    });
    it('should suggest states from extended class', () => {
        const { service, carets, assertCompletions } = testLangService(`
            .y {
                -st-states: aaa, bbb;
            }
            .x {
                -st-extends: y;
                -st-states: ccc, ddd;
            }

            .x^afterClass^ {}
        `);
        const entryPath = '/entry.st.css';
        const entryCarets = carets[entryPath];

        assertCompletions({
            actualList: service.onCompletion(entryPath, entryCarets.afterClass),
            expectedList: [
                { label: ':aaa' },
                { label: ':bbb' },
                { label: ':ccc' },
                { label: ':ddd' },
            ],
        });
    });
    it('should provide nested context', () => {
        const { service, carets, assertCompletions } = testLangService(`
            .root {
                -st-states: rrr;
            }
            .a {
                -st-states: aaa;
            }
            .b {
                -st-states: bbb;
            }

            .root {
                &^nestRoot^ {
                    .a {
                        &^nestA^ {
                            .b {
                                &^nestB^ {}
                            }
                        }
                    }
                }
            }

        `);
        const entryCarets = carets['/entry.st.css'];

        assertCompletions({
            message: 'nestRoot',
            actualList: service.onCompletion('/entry.st.css', entryCarets.nestRoot),
            expectedList: [{ label: ':rrr' }],
            unexpectedList: [{ label: ':aaa' }, { label: ':bbb' }],
        });

        assertCompletions({
            message: 'nestA',
            actualList: service.onCompletion('/entry.st.css', entryCarets.nestA),
            expectedList: [{ label: ':aaa' }],
            unexpectedList: [{ label: ':rrr' }, { label: ':bbb' }],
        });

        assertCompletions({
            message: 'nestB',
            actualList: service.onCompletion('/entry.st.css', entryCarets.nestB),
            expectedList: [{ label: ':bbb' }],
            unexpectedList: [{ label: ':rrr' }, { label: ':aaa' }],
        });
    });
    it('should NOT suggest states after ::', () => {
        const { service, carets, assertCompletions } = testLangService(`
            .x {
                -st-states: aaa, bbb;
            }

            .x::^afterDoubleColon^ {}
        `);
        const entryPath = '/entry.st.css';
        const entryCarets = carets[entryPath];

        assertCompletions({
            actualList: service.onCompletion(entryPath, entryCarets.afterDoubleColon),
            unexpectedList: [{ label: ':aaa' }, { label: ':bbb' }],
        });
    });
    describe.skip('definition', () => {
        /*ToDo: move tests when implementation is refactored*/
    });
    describe('state with param', () => {
        it('should suggest state with parenthesis', () => {
            const { service, carets, assertCompletions, textEditContext } = testLangService(`
                .x {
                    -st-states: 
                        word(string), 
                        size(enum(small, big));
                }
    
                .x^afterClass^ {}
            `);
            const entryPath = '/entry.st.css';
            const entryCarets = carets[entryPath];
            const { replaceText } = textEditContext(entryPath);

            assertCompletions({
                actualList: service.onCompletion(entryPath, entryCarets.afterClass),
                expectedList: [
                    {
                        label: ':word()',
                        textEdit: replaceText(entryCarets.afterClass, ':word($1)'),
                        command: triggerParameterHints,
                    },
                    {
                        label: ':size()',
                        textEdit: replaceText(entryCarets.afterClass, ':size($1)'),
                        command: triggerCompletion,
                    },
                ],
            });
        });
        it('should suggest enum possible parameters', () => {
            // ToDo: prevent names native css lsp from suggesting inside states definitions.
            //       because native css lsp is returning results that mix with fixture
            //       (everything is with prefixed with 'x')
            const { service, carets, assertCompletions, textEditContext } = testLangService(`
                .root {
                    -st-states: 
                        size(enum(xsmall, xmedium, xbig, xbigger)), 
                        type(enum(shirt, hat));
                }
                .partA {}
    
                .root:size(^emptyEnumParam^) {}

                .root:size(xb^partialEnumParam^) {}
            `);
            const entryPath = '/entry.st.css';
            const entryCarets = carets[entryPath];
            const { replaceText } = textEditContext(entryPath);

            assertCompletions({
                message: 'empty param',
                actualList: service.onCompletion(entryPath, entryCarets.emptyEnumParam),
                expectedList: [
                    { label: 'xsmall' },
                    { label: 'xmedium' },
                    { label: 'xbig' },
                    { label: 'xbigger' },
                ],
                unexpectedList: [
                    // no selector completions
                    // ToDo: normalize provider API
                    { label: ':size' },
                    { label: ':type' },
                    { label: '::partA' },
                    { label: ':global()' },
                    // ToDo: disable native-css-lsp in this context: { label: '.partA' },
                ],
            });

            assertCompletions({
                message: 'partial param',
                actualList: service.onCompletion(entryPath, entryCarets.partialEnumParam),
                expectedList: [
                    {
                        label: 'xbig',
                        textEdit: replaceText(entryCarets.partialEnumParam, 'xbig', {
                            deltaStart: -2,
                        }),
                    },
                    {
                        label: 'xbigger',
                        textEdit: replaceText(entryCarets.partialEnumParam, 'xbigger', {
                            deltaStart: -2,
                        }),
                    },
                ],
                unexpectedList: [{ label: 'xsmall' }, { label: 'xmedium' }],
            });
        });
    });
    describe('st-scope', () => {
        it('should suggest class custom states (in st-scope params)', () => {
            const { service, carets, assertCompletions } = testLangService(`
                .root {
                    -st-states: aaa,bbb;
                }


                @st-scope .root^afterRoot^ {}
                @st-scope ^empty^ {}

            `);
            const entryCarets = carets['/entry.st.css'];

            assertCompletions({
                actualList: service.onCompletion('/entry.st.css', entryCarets.afterRoot),
                expectedList: [{ label: ':aaa' }, { label: ':bbb' }],
            });

            assertCompletions({
                actualList: service.onCompletion('/entry.st.css', entryCarets.empty),
                expectedList: [{ label: ':aaa' }, { label: ':bbb' }],
            });
        });
        it('should suggest class custom states with nesting selector', () => {
            const { service, carets, assertCompletions, textEditContext } = testLangService(`
                .x {
                    -st-states: aaa,bbb;
                }


                @st-scope .x {
                    &^nest^
                    &:^nestColon^
                }

                @st-scope .x {
                    @media (max-width<500) {
                        &^nestInMedia^
                        &:^nestColonInMedia^
                    }
                }
            `);
            const entryCarets = carets['/entry.st.css'];
            const { replaceText } = textEditContext('/entry.st.css');

            assertCompletions({
                message: 'after &',
                actualList: service.onCompletion('/entry.st.css', entryCarets.nest),
                expectedList: [{ label: ':aaa' }, { label: ':bbb' }],
            });

            assertCompletions({
                message: 'after & in media',
                actualList: service.onCompletion('/entry.st.css', entryCarets.nestInMedia),
                expectedList: [{ label: ':aaa' }, { label: ':bbb' }],
            });

            assertCompletions({
                message: 'after &:',
                actualList: service.onCompletion('/entry.st.css', entryCarets.nestColon),
                expectedList: [
                    {
                        label: ':aaa',
                        textEdit: replaceText(entryCarets.nestColon, ':aaa', { deltaStart: -1 }),
                    },
                    {
                        label: ':bbb',
                        textEdit: replaceText(entryCarets.nestColon, ':bbb', { deltaStart: -1 }),
                    },
                ],
            });

            assertCompletions({
                message: 'after &: in media',
                actualList: service.onCompletion('/entry.st.css', entryCarets.nestColonInMedia),
                expectedList: [
                    {
                        label: ':aaa',
                        textEdit: replaceText(entryCarets.nestColonInMedia, ':aaa', {
                            deltaStart: -1,
                        }),
                    },
                    {
                        label: ':bbb',
                        textEdit: replaceText(entryCarets.nestColonInMedia, ':bbb', {
                            deltaStart: -1,
                        }),
                    },
                ],
            });
        });
        it('should suggest root custom states an empty nested selector', () => {
            const { service, carets, assertCompletions, textEditContext } = testLangService(`
                .root {
                    -st-states: root-state;
                }
                .x {
                    -st-states: aaa,bbb;
                }


                @st-scope .x {
                    ^empty^
                    :^colon^
                }

                @st-scope .x {
                    @media (max-width<500) {
                        ^emptyInMedia^
                        :^colonInMedia^
                    }
                }
            `);
            const entryCarets = carets['/entry.st.css'];
            const { replaceText } = textEditContext('/entry.st.css');

            assertCompletions({
                message: 'empty',
                actualList: service.onCompletion('/entry.st.css', entryCarets.empty),
                expectedList: [{ label: ':root-state' }],
                unexpectedList: [{ label: ':aaa' }, { label: ':bbb' }],
            });

            assertCompletions({
                message: 'empty in media',
                actualList: service.onCompletion('/entry.st.css', entryCarets.emptyInMedia),
                expectedList: [{ label: ':root-state' }],
                unexpectedList: [{ label: ':aaa' }, { label: ':bbb' }],
            });

            assertCompletions({
                message: 'colon',
                actualList: service.onCompletion('/entry.st.css', entryCarets.colon),
                expectedList: [
                    {
                        label: ':root-state',
                        textEdit: replaceText(entryCarets.colon, ':root-state', {
                            deltaStart: -1,
                        }),
                    },
                ],
                unexpectedList: [{ label: ':aaa' }, { label: ':bbb' }],
            });

            assertCompletions({
                message: 'colonInMedia',
                actualList: service.onCompletion('/entry.st.css', entryCarets.colonInMedia),
                expectedList: [
                    {
                        label: ':root-state',
                        textEdit: replaceText(entryCarets.colonInMedia, ':root-state', {
                            deltaStart: -1,
                        }),
                    },
                ],
                unexpectedList: [{ label: ':aaa' }, { label: ':bbb' }],
            });
        });
        it('should suggest matching intersection states', () => {
            const tempDir = createTempDirectorySync('lps-import-test-');
            const { service, carets, assertCompletions, textEditContext, fs } = testLangService(
                {
                    'comp.st.css': `
                    .root {
                        -st-states: comp-state;
                    }
                `,
                    'entry.st.css': `
                    @st-import Comp from './comp.st.css';
                    .root {
                        -st-extends: Comp;
                        -st-states: root-state;
                    }
                    .a {
                        -st-states: shared, onlyA;
                    }
                    .b {
                        -st-states: shared, onlyB;
                    }


                    @st-scope .a, .b {
                        ^inScope^
                        &^nest^
                        &:^nestColon^
                    }

                `,
                },
                { testOnNativeFileSystem: tempDir.path }
            );
            const entryPath = fs.join(tempDir.path, 'entry.st.css');
            const entryCarets = carets[entryPath];
            const { replaceText } = textEditContext(entryPath);

            assertCompletions({
                actualList: service.onCompletion(entryPath, entryCarets.inScope),
                expectedList: [{ label: ':root-state' }, { label: ':comp-state' }],
                unexpectedList: [{ label: ':shared' }, { label: ':onlyA' }, { label: ':onlyB' }],
            });

            assertCompletions({
                actualList: service.onCompletion(entryPath, entryCarets.nest),
                expectedList: [{ label: ':shared' }],
                unexpectedList: [
                    { label: ':onlyA' },
                    { label: ':onlyB' },
                    { label: ':root-state' },
                ],
            });

            assertCompletions({
                actualList: service.onCompletion(entryPath, entryCarets.nestColon),
                expectedList: [
                    {
                        label: ':shared',
                        textEdit: replaceText(entryCarets.nestColon, ':shared', {
                            deltaStart: -1,
                        }),
                    },
                ],
                unexpectedList: [
                    { label: ':onlyA' },
                    { label: ':onlyB' },
                    { label: ':root-state' },
                ],
            });
        });
    });
    describe('nesting', () => {
        it('should infer nest from parent nesting selector', () => {
            const { service, carets, assertCompletions } = testLangService(`
                .root {
                    -st-states: root-state;
                }
                .part {
                    -st-states: part-state;
                }

                .part {
                    &^nest^
                }

                .part {
                    & {
                        &^doubleNest^
                    }
                }

                /* currently nesting in non-& reset to root - this behavior might change */
                .part {
                    :hover {
                        &^nestUnderNonAmp^
                    }
                }
            `);
            const entryCarets = carets['/entry.st.css'];

            assertCompletions({
                message: 'nest',
                actualList: service.onCompletion('/entry.st.css', entryCarets.nest),
                expectedList: [{ label: ':part-state' }],
                unexpectedList: [{ label: ':root-state' }],
            });
            assertCompletions({
                message: 'doubleNest',
                actualList: service.onCompletion('/entry.st.css', entryCarets.doubleNest),
                expectedList: [{ label: ':part-state' }],
                unexpectedList: [{ label: ':root-state' }],
            });
            assertCompletions({
                message: 'nestUnderNonAmp',
                actualList: service.onCompletion('/entry.st.css', entryCarets.nestUnderNonAmp),
                expectedList: [{ label: ':root-state' }],
                unexpectedList: [{ label: ':part-state' }],
            });
        });
    });
    describe('st-import', () => {
        let tempDir: ReturnType<typeof createTempDirectorySync>;
        beforeEach('crate temp dir', () => {
            tempDir = createTempDirectorySync('lps-import-test-');
        });
        afterEach('remove temp dir', () => {
            tempDir.remove();
        });
        it('should suggest states from imported class', () => {
            const { service, carets, assertCompletions, fs } = testLangService(
                {
                    'origin.st.css': `
                        .root {
                            -st-states: stateX;
                        }
                        .part {
                            -st-states: stateY;
                        }
                    `,
                    'entry.st.css': `
                        @st-import Root, [part] from './origin.st.css';
                        
                        .extendingDefault {
                            -st-extends: Root;
                            -st-states: stateR;
                        }
                        .extendingNamed {
                            -st-extends: part;
                            -st-states: stateZ;
                        }

                        .Root^defaultClass^ {}
                        .part^namedClass^ {}
                        .extendingDefault^extendingDefault^ {}
                        .extendingNamed^extendingClass^ {}
                    `,
                },
                { testOnNativeFileSystem: tempDir.path }
            );
            const entryPath = fs.join(tempDir.path, 'entry.st.css');
            const entryCarets = carets[entryPath];

            assertCompletions({
                message: 'default class',
                actualList: service.onCompletion(entryPath, entryCarets.defaultClass),
                expectedList: [{ label: ':stateX' }],
                unexpectedList: [{ label: ':stateY' }, { label: ':stateZ' }, { label: ':stateR' }],
            });
            assertCompletions({
                message: 'named class',
                actualList: service.onCompletion(entryPath, entryCarets.namedClass),
                expectedList: [{ label: ':stateY' }],
                unexpectedList: [{ label: ':stateX' }, { label: ':stateZ' }, { label: ':stateR' }],
            });
            assertCompletions({
                message: 'extending default (root)',
                actualList: service.onCompletion(entryPath, entryCarets.extendingDefault),
                expectedList: [{ label: ':stateX' }, { label: ':stateR' }],
                unexpectedList: [{ label: ':stateY' }, { label: ':stateZ' }],
            });
            assertCompletions({
                message: 'extending named',
                actualList: service.onCompletion(entryPath, entryCarets.extendingClass),
                expectedList: [{ label: ':stateY' }, { label: ':stateZ' }],
                unexpectedList: [{ label: ':stateX' }, { label: ':stateR' }],
            });
        });
        it('should suggest states for pseudo-elements', () => {
            const { service, carets, assertCompletions, fs } = testLangService(
                {
                    'part-base.st.css': `
                        .root {
                            -st-states: yyy;
                        }
                        .base {
                            -st-states: xxx;
                        }
                    `,
                    'comp.st.css': `
                        @st-import PartBase from './part-base.st.css';
                        .root {
                            -st-states: root-state;
                        }
                        .part {
                            -st-extends: PartBase;
                            -st-states: part-state, another-part-state;
                        }
                    `,
                    'entry.st.css': `
                        @st-import Comp from './comp.st.css';
                        
                        .extending {
                            -st-extends: Comp;
                            -st-states: xxx;
                        }

                        .extending::part^afterPseudoElement^ {}

                        .extending::part:another-part-state:^afterUsedState^ {}

                        .extending:xxx::part:another-part-state:yyy::base:^inDeepPseudoElement^ {}
                    `,
                },
                { testOnNativeFileSystem: tempDir.path }
            );
            const entryPath = fs.join(tempDir.path, 'entry.st.css');
            const entryCarets = carets[entryPath];

            assertCompletions({
                message: 'after pseudo element',
                actualList: service.onCompletion(entryPath, entryCarets.afterPseudoElement),
                expectedList: [{ label: ':part-state' }, { label: ':another-part-state' }],
                unexpectedList: [{ label: ':root-state' }],
            });
            assertCompletions({
                message: 'after existing state',
                actualList: service.onCompletion(entryPath, entryCarets.afterUsedState),
                expectedList: [{ label: ':part-state' }],
                unexpectedList: [{ label: ':root-state' }, { label: ':another-part-state' }],
            });
            assertCompletions({
                message: 'after 2 levels of pseudo-elements',
                actualList: service.onCompletion(entryPath, entryCarets.inDeepPseudoElement),
                expectedList: [{ label: ':xxx' }],
            });
        });
        it('should suggest enum possible parameters', () => {
            const { service, carets, assertCompletions, fs } = testLangService(
                {
                    'origin.st.css': `
                        .root {
                            -st-states: type(enum(shirt, hat));
                        }
                    `,
                    'entry.st.css': `
                        @st-import Root from './origin.st.css';

                        .Root:type(^empty^) {}
                        .Root:type(sh^partial^) {}
                    `,
                },
                { testOnNativeFileSystem: tempDir.path }
            );
            const entryPath = fs.join(tempDir.path, 'entry.st.css');
            const entryCarets = carets[entryPath];

            assertCompletions({
                message: 'empty',
                actualList: service.onCompletion(entryPath, entryCarets.empty),
                expectedList: [{ label: 'shirt' }, { label: 'hat' }],
            });
            assertCompletions({
                message: 'partial',
                actualList: service.onCompletion(entryPath, entryCarets.partial),
                expectedList: [{ label: 'shirt' }],
                unexpectedList: [{ label: 'hat' }],
            });
        });
    });
});
