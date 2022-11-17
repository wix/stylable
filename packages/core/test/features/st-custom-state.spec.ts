import { STCustomState } from '@stylable/core/dist/features';
import {
    testStylableCore,
    shouldReportNoDiagnostics,
    diagnosticBankReportToStrings,
} from '@stylable/core-test-kit';
import { reservedFunctionalPseudoClasses } from '@stylable/core/dist/native-reserved-lists';
import { expect } from 'chai';

const stCustomStateDiagnostics = diagnosticBankReportToStrings(STCustomState.diagnostics);

describe('features/st-custom-state', () => {
    /**
     * This feature has no direct API atm
     * - definition is only integrated by -st-states in the css-class feature
     * - usage is in the transformation of css-pseudo-class
     *
     * In the future we might want to add standalone states
     * that can be defined, imported, and referenced
     */
    it('basic integration', () => {
        const { sheets } = testStylableCore(`
            .root {
                -st-states: a;
            }

            /* @rule .entry__root.entry--a */
            .root:a {}
        `);

        const { meta } = sheets['/entry.st.css'];
        shouldReportNoDiagnostics(meta);
    });
    describe('parsing/analyzing', () => {
        /* parsing is tested through the integration for now 
               as there is not direct user API to define states */
        it('should collect states on classes', () => {
            const { sheets } = testStylableCore(`
                    .bool {
                        -st-states: b1, b2(boolean);
                    }
                    .enum {
                        -st-states: e1(enum(small, medium, large)),
                                    e2(enum(red, green, blue)) green,
                                    e3(enum(red, green, blue), ".color-$0");
                    }
                    .num {
                        -st-states: n1(number), 
                                    n2(number()),
                                    n3(number(min(2), max(6), multipleOf(2))),
                                    n4(number) 4,
                                    n5(number(min(1), max(5)), "[color-$0]");
                    }
                    .str {
                        -st-states: s1(string), 
                                    s2(string()),
                                    s3(string(minLength(2), maxLength(5), contains(abc), regex("^user"))),
                                    s4(string) def val,
                                    s5(string(regex("^x")), '.$0');
                    }
                    .map {
                        -st-states: m1("[some-attr]"), m2('.global-cls'), m3("[attr='$0$1']"); /* ToDo: add test for template with placeholder like strings*/
                    }
                `);

            const { meta } = sheets['/entry.st.css'];
            const classes = meta.getAllClasses();
            shouldReportNoDiagnostics(meta);
            expect(classes.bool['-st-states'], 'boolean states').to.eql({
                b1: null,
                b2: null,
            });
            expect(classes.enum['-st-states'], 'enum states').to.eql({
                e1: {
                    type: 'enum',
                    arguments: ['small', 'medium', 'large'],
                    defaultValue: '',
                    template: '',
                },
                e2: {
                    type: 'enum',
                    arguments: ['red', 'green', 'blue'],
                    defaultValue: 'green',
                    template: '',
                },
                e3: {
                    type: 'enum',
                    arguments: ['red', 'green', 'blue'],
                    defaultValue: '',
                    template: '.color-$0',
                },
            });
            expect(classes.num['-st-states'], 'number states').to.eql({
                n1: { type: 'number', arguments: [], defaultValue: '', template: '' },
                n2: { type: 'number', arguments: [], defaultValue: '', template: '' },
                n3: {
                    type: 'number',
                    arguments: [
                        {
                            name: 'min',
                            args: ['2'],
                        },
                        {
                            name: 'max',
                            args: ['6'],
                        },
                        {
                            name: 'multipleOf',
                            args: ['2'],
                        },
                    ],
                    defaultValue: '',
                    template: '',
                },
                n4: { type: 'number', arguments: [], defaultValue: '4', template: '' },
                n5: {
                    type: 'number',
                    arguments: [
                        {
                            name: 'min',
                            args: ['1'],
                        },
                        {
                            name: 'max',
                            args: ['5'],
                        },
                    ],
                    defaultValue: '',
                    template: '[color-$0]',
                },
            });
            expect(classes.str['-st-states'], 'string states').to.eql({
                s1: { type: 'string', arguments: [], defaultValue: '', template: '' },
                s2: { type: 'string', arguments: [], defaultValue: '', template: '' },
                s3: {
                    type: 'string',
                    arguments: [
                        {
                            name: 'minLength',
                            args: ['2'],
                        },
                        {
                            name: 'maxLength',
                            args: ['5'],
                        },
                        {
                            name: 'contains',
                            args: ['abc'],
                        },
                        {
                            name: 'regex',
                            args: ['^user'],
                        },
                    ],
                    defaultValue: '',
                    template: '',
                },
                s4: { type: 'string', arguments: [], defaultValue: 'def val', template: '' },
                s5: {
                    type: 'string',
                    arguments: [
                        {
                            name: 'regex',
                            args: ['^x'],
                        },
                    ],
                    defaultValue: '',
                    template: '.$0',
                },
            });
            expect(classes.map['-st-states'], 'mapped states').to.eql({
                m1: '[some-attr]',
                m2: '.global-cls',
                m3: "[attr='$0$1']",
            });
        });
        it('should report missing state type', () => {
            const { sheets } = testStylableCore(`
                .a {
                    /* @analyze-warn ${stCustomStateDiagnostics.NO_STATE_TYPE_GIVEN('s1')} */
                    -st-states: s1();
                }
            `);

            const { meta } = sheets['/entry.st.css'];
            const classes = meta.getAllClasses();
            expect(classes.a['-st-states'], 'state collected as boolean').to.eql({
                s1: null,
            });
        });
        it('should report unknown state type', () => {
            const { sheets } = testStylableCore(`
                .a {
                    /* @analyze-error ${stCustomStateDiagnostics.UNKNOWN_STATE_TYPE(
                        's1',
                        'unknown'
                    )} */
                    -st-states: s1(unknown);
                }
            `);

            const { meta } = sheets['/entry.st.css'];
            const classes = meta.getAllClasses();
            expect(classes.a['-st-states'], 'state not collected').to.eql({});
        });
        it('should report on enum type with no options', () => {
            /* ToDo(tech-debt): move to analyze phase 
               - An issue while build-vars are supported to define default
            */
            testStylableCore(`
                .a {
                    /* @transform-error ${stCustomStateDiagnostics.DEFAULT_PARAM_FAILS_VALIDATION(
                        'e1',
                        '',
                        [STCustomState.sysValidationErrors.enum.NO_OPTIONS_DEFINED()]
                    )} */
                    -st-states: e1(enum());
                }
            `);
        });
        it('should report template issues', () => {
            testStylableCore(`
                .a {
                    /* @analyze-warn(missing placeholder) word(.no-placeholder) ${stCustomStateDiagnostics.TEMPLATE_MISSING_PLACEHOLDER(
                        's1',
                        '.no-placeholder'
                    )} */
                    -st-states: s1(string, '.no-placeholder');
                }
                .b {
                    /* @analyze-warn(unsupported placeholder) word(.x$1$99-$5.$with-no-digits-is-fine) ${stCustomStateDiagnostics.TEMPLATE_UNSUPPORTED_PLACEHOLDER(
                        's1',
                        '.x$1$99-$5.$with-no-digits-is-fine',
                        ['$1', '$99', '$5']
                    )} */
                    -st-states: s1(string, '.x$1$99-$5.$with-no-digits-is-fine');
                }
                .c {
                    /* @analyze-error(unexpected definition)  ${stCustomStateDiagnostics.TEMPLATE_UNEXPECTED_ARGS(
                        's1'
                    )} */
                    -st-states: s1('.x', '.y');
                }
            `);
        });
        it('should report on validator definition issues', () => {
            /* ToDo(tech-debt): move "unknown validator" to analyze phase 
                - An issue while build-vars are supported to define default
            */
            testStylableCore(`
                .a {
                    /* @analyze-error(multi types) ${stCustomStateDiagnostics.TOO_MANY_STATE_TYPES(
                        's1',
                        ['string', 'number']
                    )} */
                    -st-states: s1(string, number);
                }
                .a2 {
                    /* @analyze-error(multi types after template) ${stCustomStateDiagnostics.TOO_MANY_STATE_TYPES(
                        's1-2',
                        ['string', `".x"`, 'number']
                    )} */
                    -st-states: s1-2(string, ".x", number);
                }
                .b {
                    /* @analyze-error(multi validation args) ${stCustomStateDiagnostics.TOO_MANY_ARGS_IN_VALIDATOR(
                        's2',
                        'contains',
                        ['x', 'y']
                    )} */
                    -st-states: s2(string(contains(x, y)));
                }
                .c {
                    /* @transform-error(unknown str validator) ${stCustomStateDiagnostics.DEFAULT_PARAM_FAILS_VALIDATION(
                        's3',
                        '',
                        [STCustomState.sysValidationErrors.string.UKNOWN_VALIDATOR('unknown')]
                    )} */
                    -st-states: s3(string(unknown()));
                }
                .d {
                    /* @transform-error(unknown num validator) ${stCustomStateDiagnostics.DEFAULT_PARAM_FAILS_VALIDATION(
                        's4',
                        '',
                        [STCustomState.sysValidationErrors.number.UKNOWN_VALIDATOR('unknown')]
                    )} */
                    -st-states: s4(number(unknown()));
                }
            `);
        });
        it('should report on non invalid default value', () => {
            /* ToDo(tech-debt): move to analyze phase 
               - An issue while build-vars are supported to define default
            */
            testStylableCore(`
                .a {
                    /* @transform-error(multi types) ${stCustomStateDiagnostics.DEFAULT_PARAM_FAILS_VALIDATION(
                        'n1',
                        'abc',
                        [
                            STCustomState.sysValidationErrors.number.NUMBER_TYPE_VALIDATION_FAILED(
                                'abc'
                            ),
                        ]
                    )} */
                    -st-states: n1(number) abc;
                }
                .b {
                    /* @transform-error(multi types) ${stCustomStateDiagnostics.DEFAULT_PARAM_FAILS_VALIDATION(
                        'e1',
                        'huge',
                        [
                            STCustomState.sysValidationErrors.enum.ENUM_TYPE_VALIDATION_FAILED(
                                'huge',
                                ['small', 'large']
                            ),
                        ]
                    )} */
                    -st-states: e1(enum(small, large)) huge;
                }
            `);
        });
        it('should report state that start with a dash (-)', () => {
            // ToDo: consider removing this restriction https://github.com/wix/stylable/issues/2625
            testStylableCore(`
                .a {
                    /* @analyze-error ${stCustomStateDiagnostics.STATE_STARTS_WITH_HYPHEN(
                        '-some-state'
                    )} */
                    -st-states: -some-state;
                }
            `);
        });
        it('should not allow reserved pseudo classes as names', () => {
            // prettier-ignore
            testStylableCore(
                reservedFunctionalPseudoClasses.map((name) => `
                    .${name} {
                        /* @analyze-warn ${stCustomStateDiagnostics.RESERVED_NATIVE_STATE(name)} */
                        -st-states: ${name};
                    }`
                ).join('\n')
            );
        });
    });

    // it('should check for state name collision in the same definition', () => {});

    // it('should check for type collision in states with the same name', () => {});
});
