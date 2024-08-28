import { Command } from 'vscode-languageserver';
import { testLangService } from '../../test-kit/test-lang-service';
import { createTempDirectorySync } from '@stylable/core-test-kit';

const triggerCompletion = Command.create('additional', 'editor.action.triggerSuggest');
const triggerParameterHints = Command.create('additional', 'editor.action.triggerParameterHints');

describe('LS: css-pseudo-class', () => {
    it('should suggest class custom states', () => {
        const { service, assertCompletions } = testLangService(`
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

        assertCompletions(entryPath, ({ filePath, carets }) => ({
            message: 'classes states',
            actualList: service.onCompletion(filePath, carets.afterRoot),
            expectedList: [{ label: ':aaa' }, { label: ':bbb' }],
            unexpectedList: [{ label: ':xxx' }, { label: ':yyy' }],
        }));

        assertCompletions(entryPath, ({ filePath, carets, textEdit: { replaceText } }) => ({
            message: 'partial',
            actualList: service.onCompletion(filePath, carets.partial),
            expectedList: [
                {
                    label: ':aaa',
                    textEdit: replaceText(carets.partial, ':aaa', { deltaStart: -2 }),
                },
            ],
            unexpectedList: [{ label: ':bbb' }],
        }));

        assertCompletions(entryPath, ({ filePath, carets, textEdit: { replaceText } }) => ({
            message: 'complex selector',
            actualList: service.onCompletion(filePath, carets.partial),
            expectedList: [
                {
                    label: ':aaa',
                    textEdit: replaceText(carets.partial, ':aaa', { deltaStart: -2 }),
                },
            ],
            unexpectedList: [{ label: ':bbb' }],
        }));
    });
    it('should suggest root custom states in empty selector', () => {
        const source = `
            .root {
                -st-states: aaa, bbb;
            }

            ^empty^ {}
        `;
        const { service, assertCompletions } = testLangService(source);
        const entryPath = '/entry.st.css';

        assertCompletions(entryPath, ({ filePath, carets }) => ({
            message: 'empty',
            actualList: service.onCompletion(filePath, carets.empty),
            unexpectedList: [{ label: ':aaa' }, { label: ':bbb' }],
        }));

        {
            // with experimentalSelectorInference=false
            const { service, assertCompletions } = testLangService(source, {
                stylableConfig: { experimentalSelectorInference: false },
            });
            const entryPath = '/entry.st.css';

            assertCompletions(entryPath, ({ filePath, carets }) => ({
                message: 'empty',
                actualList: service.onCompletion(filePath, carets.empty),
                expectedList: [{ label: ':aaa' }, { label: ':bbb' }],
            }));
        }
    });
    it('should NOT suggest used states', () => {
        const { service, assertCompletions } = testLangService(`
            .x {
                -st-states: aaa, bbb;
            }

            .x:aaa^afterExistingState^ {}
        `);
        const entryPath = '/entry.st.css';

        assertCompletions(entryPath, ({ filePath, carets }) => ({
            actualList: service.onCompletion(filePath, carets.afterExistingState),
            expectedList: [{ label: ':bbb' }],
            unexpectedList: [{ label: ':aaa' }],
        }));
    });
    it('should suggest pseudo-element custom states', () => {
        const { service, assertCompletions } = testLangService(`
            .root {}
            .part {
                -st-states: aaa, bbb;
            }

            .root::part^afterPseudoElement^ {}
        `);
        const entryPath = '/entry.st.css';

        assertCompletions(entryPath, ({ filePath, carets }) => ({
            actualList: service.onCompletion(filePath, carets.afterPseudoElement),
            expectedList: [{ label: ':aaa' }, { label: ':bbb' }],
        }));
    });
    it('should suggest states from extended class', () => {
        const { service, assertCompletions } = testLangService(`
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

        assertCompletions(entryPath, ({ filePath, carets }) => ({
            actualList: service.onCompletion(filePath, carets.afterClass),
            expectedList: [
                { label: ':aaa' },
                { label: ':bbb' },
                { label: ':ccc' },
                { label: ':ddd' },
            ],
        }));
    });
    it('should provide nested context', () => {
        const { service, assertCompletions } = testLangService(`
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

        assertCompletions('/entry.st.css', ({ filePath, carets }) => ({
            message: 'nestRoot',
            actualList: service.onCompletion(filePath, carets.nestRoot),
            expectedList: [{ label: ':rrr' }],
            unexpectedList: [{ label: ':aaa' }, { label: ':bbb' }],
        }));

        assertCompletions('/entry.st.css', ({ filePath, carets }) => ({
            message: 'nestA',
            actualList: service.onCompletion(filePath, carets.nestA),
            expectedList: [{ label: ':aaa' }],
            unexpectedList: [{ label: ':rrr' }, { label: ':bbb' }],
        }));

        assertCompletions('/entry.st.css', ({ filePath, carets }) => ({
            message: 'nestB',
            actualList: service.onCompletion(filePath, carets.nestB),
            expectedList: [{ label: ':bbb' }],
            unexpectedList: [{ label: ':rrr' }, { label: ':aaa' }],
        }));
    });
    it('should NOT suggest states after ::', () => {
        const { service, assertCompletions } = testLangService(`
            .x {
                -st-states: aaa, bbb;
            }

            .x::^afterDoubleColon^ {}
        `);
        const entryPath = '/entry.st.css';

        assertCompletions(entryPath, ({ filePath, carets }) => ({
            actualList: service.onCompletion(filePath, carets.afterDoubleColon),
            unexpectedList: [{ label: ':aaa' }, { label: ':bbb' }],
        }));
    });
    describe.skip('definition', () => {
        /*ToDo: move tests when implementation is refactored*/
    });
    describe('state with param', () => {
        it('should suggest state with parenthesis', () => {
            const { service, assertCompletions } = testLangService(`
                .x {
                    -st-states: 
                        word(string), 
                        size(enum(small, big));
                }
    
                .x^afterClass^ {}
            `);
            const entryPath = '/entry.st.css';

            assertCompletions(entryPath, ({ filePath, carets, textEdit: { replaceText } }) => ({
                actualList: service.onCompletion(filePath, carets.afterClass),
                expectedList: [
                    {
                        label: ':word()',
                        textEdit: replaceText(carets.afterClass, ':word($1)'),
                        command: triggerParameterHints,
                    },
                    {
                        label: ':size()',
                        textEdit: replaceText(carets.afterClass, ':size($1)'),
                        command: triggerCompletion,
                    },
                ],
            }));
        });
        it('should suggest enum possible parameters', () => {
            // ToDo: prevent names native css lsp from suggesting inside states definitions.
            //       because native css lsp is returning results that mix with fixture
            //       (everything is with prefixed with 'x')
            const { service, assertCompletions } = testLangService(`
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

            assertCompletions(entryPath, ({ filePath, carets }) => ({
                message: 'empty param',
                actualList: service.onCompletion(filePath, carets.emptyEnumParam),
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
            }));

            assertCompletions(entryPath, ({ filePath, carets, textEdit: { replaceText } }) => ({
                message: 'partial param',
                actualList: service.onCompletion(filePath, carets.partialEnumParam),
                expectedList: [
                    {
                        label: 'xbig',
                        textEdit: replaceText(carets.partialEnumParam, 'xbig', {
                            deltaStart: -2,
                        }),
                    },
                    {
                        label: 'xbigger',
                        textEdit: replaceText(carets.partialEnumParam, 'xbigger', {
                            deltaStart: -2,
                        }),
                    },
                ],
                unexpectedList: [{ label: 'xsmall' }, { label: 'xmedium' }],
            }));
        });
    });
    describe('st-scope', () => {
        it('should suggest class custom states (in st-scope params)', () => {
            const source = `
                .root {
                    -st-states: aaa,bbb;
                }


                @st-scope .root^afterRoot^ {}
                @st-scope ^empty^ {}

            `;
            const { service, assertCompletions } = testLangService(source);

            assertCompletions('/entry.st.css', ({ filePath, carets }) => ({
                actualList: service.onCompletion(filePath, carets.afterRoot),
                expectedList: [{ label: ':aaa' }, { label: ':bbb' }],
            }));

            assertCompletions('/entry.st.css', ({ filePath, carets }) => ({
                actualList: service.onCompletion(filePath, carets.empty),
                unexpectedList: [{ label: ':aaa' }, { label: ':bbb' }],
            }));

            {
                // with experimentalSelectorInference=false
                const { service, assertCompletions } = testLangService(source, {
                    stylableConfig: { experimentalSelectorInference: false },
                });

                assertCompletions('/entry.st.css', ({ filePath, carets }) => ({
                    actualList: service.onCompletion(filePath, carets.afterRoot),
                    expectedList: [{ label: ':aaa' }, { label: ':bbb' }],
                }));

                assertCompletions('/entry.st.css', ({ filePath, carets }) => ({
                    actualList: service.onCompletion(filePath, carets.empty),
                    expectedList: [{ label: ':aaa' }, { label: ':bbb' }],
                }));
            }
        });
        it('should suggest class custom states with nesting selector', () => {
            const { service, assertCompletions } = testLangService(`
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

            assertCompletions('/entry.st.css', ({ filePath, carets }) => ({
                message: 'after &',
                actualList: service.onCompletion(filePath, carets.nest),
                expectedList: [{ label: ':aaa' }, { label: ':bbb' }],
            }));

            assertCompletions('/entry.st.css', ({ filePath, carets }) => ({
                message: 'after & in media',
                actualList: service.onCompletion(filePath, carets.nestInMedia),
                expectedList: [{ label: ':aaa' }, { label: ':bbb' }],
            }));

            assertCompletions(
                '/entry.st.css',
                ({ filePath, carets, textEdit: { replaceText } }) => ({
                    message: 'after &:',
                    actualList: service.onCompletion(filePath, carets.nestColon),
                    expectedList: [
                        {
                            label: ':aaa',
                            textEdit: replaceText(carets.nestColon, ':aaa', { deltaStart: -1 }),
                        },
                        {
                            label: ':bbb',
                            textEdit: replaceText(carets.nestColon, ':bbb', { deltaStart: -1 }),
                        },
                    ],
                }),
            );

            assertCompletions(
                '/entry.st.css',
                ({ filePath, carets, textEdit: { replaceText } }) => ({
                    message: 'after &: in media',
                    actualList: service.onCompletion(filePath, carets.nestColonInMedia),
                    expectedList: [
                        {
                            label: ':aaa',
                            textEdit: replaceText(carets.nestColonInMedia, ':aaa', {
                                deltaStart: -1,
                            }),
                        },
                        {
                            label: ':bbb',
                            textEdit: replaceText(carets.nestColonInMedia, ':bbb', {
                                deltaStart: -1,
                            }),
                        },
                    ],
                }),
            );
        });
        it('should NOT suggest root custom states after empty nested selector', () => {
            const source = `
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
            `;
            const { service, assertCompletions } = testLangService(source);

            assertCompletions('/entry.st.css', ({ filePath, carets }) => ({
                message: 'empty',
                actualList: service.onCompletion(filePath, carets.empty),
                unexpectedList: [{ label: ':root-state' }, { label: ':aaa' }, { label: ':bbb' }],
            }));

            assertCompletions('/entry.st.css', ({ filePath, carets }) => ({
                message: 'empty in media',
                actualList: service.onCompletion(filePath, carets.emptyInMedia),
                unexpectedList: [{ label: ':root-state' }, { label: ':aaa' }, { label: ':bbb' }],
            }));

            assertCompletions('/entry.st.css', ({ filePath, carets }) => ({
                message: 'colon',
                actualList: service.onCompletion(filePath, carets.colon),
                unexpectedList: [{ label: ':root-state' }, { label: ':aaa' }, { label: ':bbb' }],
            }));

            assertCompletions('/entry.st.css', ({ filePath, carets }) => ({
                message: 'colonInMedia',
                actualList: service.onCompletion(filePath, carets.colonInMedia),
                unexpectedList: [{ label: ':root-state' }, { label: ':aaa' }, { label: ':bbb' }],
            }));

            {
                // with experimentalSelectorInference=false
                const { service, assertCompletions } = testLangService(source, {
                    stylableConfig: { experimentalSelectorInference: false },
                });

                assertCompletions('/entry.st.css', ({ filePath, carets }) => ({
                    message: 'empty',
                    actualList: service.onCompletion(filePath, carets.empty),
                    expectedList: [],
                    unexpectedList: [{ label: ':aaa' }, { label: ':bbb' }],
                }));

                assertCompletions('/entry.st.css', ({ filePath, carets }) => ({
                    message: 'empty in media',
                    actualList: service.onCompletion(filePath, carets.emptyInMedia),
                    expectedList: [{ label: ':root-state' }],
                    unexpectedList: [{ label: ':aaa' }, { label: ':bbb' }],
                }));

                assertCompletions(
                    '/entry.st.css',
                    ({ filePath, carets, textEdit: { replaceText } }) => ({
                        message: 'colon',
                        actualList: service.onCompletion(filePath, carets.colon),
                        expectedList: [
                            {
                                label: ':root-state',
                                textEdit: replaceText(carets.colon, ':root-state', {
                                    deltaStart: -1,
                                }),
                            },
                        ],
                        unexpectedList: [{ label: ':aaa' }, { label: ':bbb' }],
                    }),
                );

                assertCompletions(
                    '/entry.st.css',
                    ({ filePath, carets, textEdit: { replaceText } }) => ({
                        message: 'colonInMedia',
                        actualList: service.onCompletion(filePath, carets.colonInMedia),
                        expectedList: [
                            {
                                label: ':root-state',
                                textEdit: replaceText(carets.colonInMedia, ':root-state', {
                                    deltaStart: -1,
                                }),
                            },
                        ],
                        unexpectedList: [{ label: ':aaa' }, { label: ':bbb' }],
                    }),
                );
            }
        });
        it('should suggest matching intersection states', () => {
            const tempDir = createTempDirectorySync('lps-import-test-');
            const sources = {
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
            };
            const { service, assertCompletions, fs } = testLangService(sources, {
                testOnNativeFileSystem: tempDir.path,
            });
            const entryPath = fs.join(tempDir.path, 'entry.st.css');

            assertCompletions(entryPath, ({ filePath, carets }) => ({
                actualList: service.onCompletion(filePath, carets.inScope),
                unexpectedList: [
                    { label: ':root-state' },
                    { label: ':comp-state' },
                    { label: ':shared' },
                    { label: ':onlyA' },
                    { label: ':onlyB' },
                ],
            }));

            assertCompletions(entryPath, ({ filePath, carets }) => ({
                actualList: service.onCompletion(filePath, carets.nest),
                expectedList: [{ label: ':shared' }],
                unexpectedList: [
                    { label: ':onlyA' },
                    { label: ':onlyB' },
                    { label: ':root-state' },
                ],
            }));

            assertCompletions(entryPath, ({ filePath, carets, textEdit: { replaceText } }) => ({
                actualList: service.onCompletion(filePath, carets.nestColon),
                expectedList: [
                    {
                        label: ':shared',
                        textEdit: replaceText(carets.nestColon, ':shared', {
                            deltaStart: -1,
                        }),
                    },
                ],
                unexpectedList: [
                    { label: ':onlyA' },
                    { label: ':onlyB' },
                    { label: ':root-state' },
                ],
            }));

            {
                // with experimentalSelectorInference=false
                const { service, assertCompletions, fs } = testLangService(sources, {
                    testOnNativeFileSystem: tempDir.path,
                    stylableConfig: { experimentalSelectorInference: false },
                });
                const entryPath = fs.join(tempDir.path, 'entry.st.css');

                assertCompletions(entryPath, ({ filePath, carets }) => ({
                    actualList: service.onCompletion(filePath, carets.inScope),
                    expectedList: [{ label: ':root-state' }, { label: ':comp-state' }],
                    unexpectedList: [
                        { label: ':shared' },
                        { label: ':onlyA' },
                        { label: ':onlyB' },
                    ],
                }));

                assertCompletions(entryPath, ({ filePath, carets }) => ({
                    actualList: service.onCompletion(filePath, carets.nest),
                    expectedList: [{ label: ':shared' }],
                    unexpectedList: [
                        { label: ':onlyA' },
                        { label: ':onlyB' },
                        { label: ':root-state' },
                    ],
                }));

                assertCompletions(entryPath, ({ filePath, carets, textEdit: { replaceText } }) => ({
                    actualList: service.onCompletion(filePath, carets.nestColon),
                    expectedList: [
                        {
                            label: ':shared',
                            textEdit: replaceText(carets.nestColon, ':shared', {
                                deltaStart: -1,
                            }),
                        },
                    ],
                    unexpectedList: [
                        { label: ':onlyA' },
                        { label: ':onlyB' },
                        { label: ':root-state' },
                    ],
                }));
            }
        });
    });
    describe('nesting', () => {
        it('should infer nest from parent nesting selector', () => {
            const { service, assertCompletions } = testLangService(`
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

                .part {
                    :hover {
                        &^nestUnderNonAmp^
                    }
                }
            `);

            assertCompletions('/entry.st.css', ({ filePath, carets }) => ({
                message: 'nest',
                actualList: service.onCompletion(filePath, carets.nest),
                expectedList: [{ label: ':part-state' }],
                unexpectedList: [{ label: ':root-state' }],
            }));
            assertCompletions('/entry.st.css', ({ filePath, carets }) => ({
                message: 'doubleNest',
                actualList: service.onCompletion(filePath, carets.doubleNest),
                expectedList: [{ label: ':part-state' }],
                unexpectedList: [{ label: ':root-state' }],
            }));
            assertCompletions('/entry.st.css', ({ filePath, carets }) => ({
                message: 'nestUnderNonAmp',
                actualList: service.onCompletion(filePath, carets.nestUnderNonAmp),
                expectedList: [],
                unexpectedList: [{ label: ':part-state' }, { label: ':root-state' }],
            }));
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
            const { service, assertCompletions, fs } = testLangService(
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
                { testOnNativeFileSystem: tempDir.path },
            );
            const entryPath = fs.join(tempDir.path, 'entry.st.css');

            assertCompletions(entryPath, ({ filePath, carets }) => ({
                message: 'default class',
                actualList: service.onCompletion(filePath, carets.defaultClass),
                expectedList: [{ label: ':stateX' }],
                unexpectedList: [{ label: ':stateY' }, { label: ':stateZ' }, { label: ':stateR' }],
            }));
            assertCompletions(entryPath, ({ filePath, carets }) => ({
                message: 'named class',
                actualList: service.onCompletion(filePath, carets.namedClass),
                expectedList: [{ label: ':stateY' }],
                unexpectedList: [{ label: ':stateX' }, { label: ':stateZ' }, { label: ':stateR' }],
            }));
            assertCompletions(entryPath, ({ filePath, carets }) => ({
                message: 'extending default (root)',
                actualList: service.onCompletion(filePath, carets.extendingDefault),
                expectedList: [{ label: ':stateX' }, { label: ':stateR' }],
                unexpectedList: [{ label: ':stateY' }, { label: ':stateZ' }],
            }));
            assertCompletions(entryPath, ({ filePath, carets }) => ({
                message: 'extending named',
                actualList: service.onCompletion(filePath, carets.extendingClass),
                expectedList: [{ label: ':stateY' }, { label: ':stateZ' }],
                unexpectedList: [{ label: ':stateX' }, { label: ':stateR' }],
            }));
        });
        it('should suggest states for pseudo-elements', () => {
            const { service, assertCompletions, fs } = testLangService(
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
                { testOnNativeFileSystem: tempDir.path },
            );
            const entryPath = fs.join(tempDir.path, 'entry.st.css');

            assertCompletions(entryPath, ({ filePath, carets }) => ({
                message: 'after pseudo element',
                actualList: service.onCompletion(filePath, carets.afterPseudoElement),
                expectedList: [{ label: ':part-state' }, { label: ':another-part-state' }],
                unexpectedList: [{ label: ':root-state' }],
            }));
            assertCompletions(entryPath, ({ filePath, carets }) => ({
                message: 'after existing state',
                actualList: service.onCompletion(filePath, carets.afterUsedState),
                expectedList: [{ label: ':part-state' }],
                unexpectedList: [{ label: ':root-state' }, { label: ':another-part-state' }],
            }));
            assertCompletions(entryPath, ({ filePath, carets }) => ({
                message: 'after 2 levels of pseudo-elements',
                actualList: service.onCompletion(filePath, carets.inDeepPseudoElement),
                expectedList: [{ label: ':xxx' }],
            }));
        });
        it('should suggest enum possible parameters', () => {
            const { service, assertCompletions, fs } = testLangService(
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
                { testOnNativeFileSystem: tempDir.path },
            );
            const entryPath = fs.join(tempDir.path, 'entry.st.css');

            assertCompletions(entryPath, ({ filePath, carets }) => ({
                message: 'empty',
                actualList: service.onCompletion(filePath, carets.empty),
                expectedList: [{ label: 'shirt' }, { label: 'hat' }],
            }));
            assertCompletions(entryPath, ({ filePath, carets }) => ({
                message: 'partial',
                actualList: service.onCompletion(filePath, carets.partial),
                expectedList: [{ label: 'shirt' }],
                unexpectedList: [{ label: 'hat' }],
            }));
        });
    });
});
