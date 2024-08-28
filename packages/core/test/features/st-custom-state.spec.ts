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
                                    e2(enum(red, green, blue)) green;
                    }
                    .num {
                        -st-states: n1(number), 
                                    n2(number()),
                                    n3(number(min(2), max(6), multipleOf(2))),
                                    n4(number) 4;
                    }
                    .str {
                        -st-states: s1(string), 
                                    s2(string()),
                                    s3(string(minLength(2), maxLength(5), contains(abc), regex("^user"))),
                                    s4(string) def val;
                    }
                    .map {
                        -st-states: m1("[some-attr]"), 
                                    m2('.global-cls'), 
                                    m3("[attr='$0$1']"),
                                    m4(".color-$0", enum(red, green, blue) green);
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
                },
                e2: {
                    type: 'enum',
                    arguments: ['red', 'green', 'blue'],
                    defaultValue: 'green',
                },
            });
            expect(classes.num['-st-states'], 'number states').to.eql({
                n1: { type: 'number', arguments: [], defaultValue: '' },
                n2: { type: 'number', arguments: [], defaultValue: '' },
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
                },
                n4: { type: 'number', arguments: [], defaultValue: '4' },
            });
            expect(classes.str['-st-states'], 'string states').to.eql({
                s1: { type: 'string', arguments: [], defaultValue: '' },
                s2: { type: 'string', arguments: [], defaultValue: '' },
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
                },
                s4: { type: 'string', arguments: [], defaultValue: 'def val' },
            });
            expect(classes.map['-st-states'], 'mapped states').to.eql({
                m1: '[some-attr]',
                m2: '.global-cls',
                m3: "[attr='$0$1']",
                m4: {
                    type: 'template',
                    template: '.color-$0',
                    params: [
                        {
                            type: 'enum',
                            arguments: ['red', 'green', 'blue'],
                            defaultValue: 'green',
                        },
                    ],
                },
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
                        'unknown',
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
                        [STCustomState.sysValidationErrors.enum.NO_OPTIONS_DEFINED()],
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
                        '.no-placeholder',
                    )} */
                    -st-states: s1('.no-placeholder', string);
                }
                .b {
                    /* @analyze-error(unexpected param definition) word('.y')  ${stCustomStateDiagnostics.UNKNOWN_STATE_TYPE(
                        's1 parameter',
                        "'.y'",
                    )} */
                    -st-states: s1('.b$0', '.y');
                }
                .c {
                    /* @analyze-error(missing param definition) ${stCustomStateDiagnostics.TEMPLATE_MISSING_PARAMETER(
                        's1',
                    )} */
                    -st-states: s1('.c$0', ,);
                }
                .d {
                    /* @analyze-error(multiple parameters) ${stCustomStateDiagnostics.TEMPLATE_MULTI_PARAMETERS(
                        's1',
                    )} */
                    -st-states: s1('.c$0', string, number);
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
                        ['string', 'number'],
                    )} */
                    -st-states: s1(string, number);
                }
                .b {
                    /* @analyze-error(multi validation args) ${stCustomStateDiagnostics.TOO_MANY_ARGS_IN_VALIDATOR(
                        's2',
                        'contains',
                        ['x', 'y'],
                    )} */
                    -st-states: s2(string(contains(x, y)));
                }
                .c {
                    /* @transform-error(unknown str validator) ${stCustomStateDiagnostics.DEFAULT_PARAM_FAILS_VALIDATION(
                        's3',
                        '',
                        [STCustomState.sysValidationErrors.string.UKNOWN_VALIDATOR('unknown')],
                    )} */
                    -st-states: s3(string(unknown()));
                }
                .d {
                    /* @transform-error(unknown num validator) ${stCustomStateDiagnostics.DEFAULT_PARAM_FAILS_VALIDATION(
                        's4',
                        '',
                        [STCustomState.sysValidationErrors.number.UKNOWN_VALIDATOR('unknown')],
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
                                'abc',
                            ),
                        ],
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
                                ['small', 'large'],
                            ),
                        ],
                    )} */
                    -st-states: e1(enum(small, large)) huge;
                }
                .c {
                    /* @transform-error(template param) ${stCustomStateDiagnostics.DEFAULT_PARAM_FAILS_VALIDATION(
                        'tn1',
                        'abc',
                        [
                            STCustomState.sysValidationErrors.number.NUMBER_TYPE_VALIDATION_FAILED(
                                'abc',
                            ),
                        ],
                    )} */
                    -st-states: tn1('[x=$0]', number abc);
                }
            `);
        });
        it('should report state that start with a dash (-)', () => {
            // ToDo: consider removing this restriction https://github.com/wix/stylable/issues/2625
            testStylableCore(`
                .a {
                    /* @analyze-error ${stCustomStateDiagnostics.STATE_STARTS_WITH_HYPHEN(
                        '-some-state',
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
