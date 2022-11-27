import { STCustomState, CSSPseudoClass } from '@stylable/core/dist/features';
import { nativePseudoClasses } from '@stylable/core/dist/index-internal';
import {
    testStylableCore,
    shouldReportNoDiagnostics,
    diagnosticBankReportToStrings,
} from '@stylable/core-test-kit';
import { expect } from 'chai';

const cssPseudoClassDiagnostics = diagnosticBankReportToStrings(CSSPseudoClass.diagnostics);
const stCustomStateDiagnostics = diagnosticBankReportToStrings(STCustomState.diagnostics);

describe('features/css-pseudo-class', () => {
    it('should preserve native pseudo classes', () => {
        const src = nativePseudoClasses.map((name) => `.root:${name}{}`).join('\n');

        const { sheets } = testStylableCore(src);

        const { meta } = sheets['/entry.st.css'];
        shouldReportNoDiagnostics(meta);
        expect(meta.targetAst!.toString()).to.eql(src.replace(/\.root/g, '.entry__root'));
    });
    it('should report unknown pseudo-class', () => {
        testStylableCore(`
            /* 
                @transform-error ${cssPseudoClassDiagnostics.UNKNOWN_STATE_USAGE(
                    'unknown-p-class'
                )} 
                @rule .entry__root:unknown-p-class
            */
            .root:unknown-p-class {}
        `);
    });
    describe('st-custom-state', () => {
        it('should transform boolean state', () => {
            const { sheets } = testStylableCore(`
                .root {
                    -st-states: bool,
                                exBool(boolean);
                }

                /* @rule(boolean) .entry__root.entry--bool */
                .root:bool {}

                /* @rule(explicit boolean) .entry__root.entry--exBool */
                .root:exBool {}

                /* @rule(nested) .entry__root:not(.entry--bool) */
                .root:not(:bool) {}
            `);

            const { meta } = sheets['/entry.st.css'];
            shouldReportNoDiagnostics(meta);
        });
        describe('string parameter', () => {
            it('should transform string state', () => {
                const { sheets } = testStylableCore(`
                    .root {
                        -st-states: str(string),
                                    strWithDef(string) defVal,
                                    strWithDefSpace(string) def val;
                    }
    
                    /* @rule(base) .entry__root.entry---str-3-val */
                    .root:str(val) {}
    
                    /* @rule(strip quotation) .entry__root.entry---str-3-val */
                    .root:str("val") {}
    
                    /* @rule(strip quotation single) .entry__root.entry---str-3-val */
                    .root:str('val') {}
    
                    /* @rule(space in value) .entry__root.entry---str-7-one_two */
                    .root:str(one two) {}
    
                    /* @rule(with default) .entry__root.entry---strWithDef-6-defVal */
                    .root:strWithDef {}
                    
                    /* @rule(with default) .entry__root.entry---strWithDefSpace-7-def_val */
                    .root:strWithDefSpace {}

                    /* @rule(escape param) .entry__root.entry---str-2-\\.x */
                    .root:str(.x) {}
                `);

                const { meta } = sheets['/entry.st.css'];
                shouldReportNoDiagnostics(meta);
            });
            it('should transform with no diagnostics for valid values', () => {
                const { sheets } = testStylableCore(`
                    .root {
                        -st-states: rgx(string(regex('^user'))),
                                    cont(string(contains(abc))),
                                    multi(string(minLength(2), maxLength(6)));
                    }
    
                    /* @rule(regex) .entry__root.entry---rgx-10-user-first */
                    .root:rgx(user-first) {}

                    /* @rule(contains) .entry__root.entry---cont-9-123abc456 */
                    .root:cont(123abc456) {}

                    /* @rule(multi-min/max) .entry__root.entry---multi-4-1234 */
                    .root:multi(1234) {}

                    /* @rule(eql min) .entry__root.entry---multi-2-12 */
                    .root:multi(12) {}

                    /* @rule(eql max) .entry__root.entry---multi-6-123456 */
                    .root:multi(123456) {}
                `);

                const { meta } = sheets['/entry.st.css'];
                shouldReportNoDiagnostics(meta);
            });
            it('should report validation errors', () => {
                testStylableCore(`
                    .root {
                        -st-states: rgx(string(regex('^user'))),
                                    cont(string(contains(abc))),
                                    multi(string(minLength(10), maxLength(2)));
                    }

                    /* 
                        @transform-error(no param) ${stCustomStateDiagnostics.NO_STATE_ARGUMENT_GIVEN(
                            'rgx',
                            'string'
                        )} 
                        @rule(no param) .entry__root.entry---rgx-0-
                    */
                    .root:rgx {}

                    /* 
                        @transform-error(no param with parans) ${stCustomStateDiagnostics.NO_STATE_ARGUMENT_GIVEN(
                            'rgx',
                            'string'
                        )} 
                        @rule(no param with parans) .entry__root.entry---rgx-0-
                    */
                    .root:rgx() {}
    
                    /* 
                        @transform-error(regex) ${stCustomStateDiagnostics.FAILED_STATE_VALIDATION(
                            'rgx',
                            'robot',
                            [
                                STCustomState.sysValidationErrors.string.REGEX_VALIDATION_FAILED(
                                    '^user',
                                    'robot'
                                ),
                            ]
                        )} 
                        @rule(regex) .entry__root.entry---rgx-5-robot
                    */
                    .root:rgx(robot) {}

                    /* 
                        @transform-error(contains) ${stCustomStateDiagnostics.FAILED_STATE_VALIDATION(
                            'cont',
                            'xyz',
                            [
                                STCustomState.sysValidationErrors.string.CONTAINS_VALIDATION_FAILED(
                                    'abc',
                                    'xyz'
                                ),
                            ]
                        )} 
                        @rule(contains) .entry__root.entry---cont-3-xyz
                    */
                    .root:cont(xyz) {}

                    /* 
                        @transform-error(multi) ${stCustomStateDiagnostics.FAILED_STATE_VALIDATION(
                            'multi',
                            '12345',
                            [
                                STCustomState.sysValidationErrors.string.MIN_LENGTH_VALIDATION_FAILED(
                                    '10',
                                    '12345'
                                ),
                                STCustomState.sysValidationErrors.string.MAX_LENGTH_VALIDATION_FAILED(
                                    '2',
                                    '12345'
                                ),
                            ]
                        )} 
                        @rule(multi) .entry__root.entry---multi-5-12345
                    */
                    .root:multi(12345) {}
                `);
            });
        });
        describe('number parameter', () => {
            it('should transform number state', () => {
                const { sheets } = testStylableCore(`
                    .root {
                        -st-states: num(number),
                                    numWithDef(number) 42;
                    }
    
                    /* @rule(base) .entry__root.entry---num-1-5 */
                    .root:num(5) {}
    
                    /* @rule(with default) .entry__root.entry---numWithDef-2-42 */
                    .root:numWithDef {}
                `);

                const { meta } = sheets['/entry.st.css'];
                shouldReportNoDiagnostics(meta);
            });
            it('should transform with no diagnostics for valid values', () => {
                const { sheets } = testStylableCore(`
                    .root {
                        -st-states: base(number),
                                    minFive(number(min(5))),
                                    maxFive(number(max(5))),
                                    multipleOfThree(number(multipleOf(3))),
                                    multi(number(min(10), multipleOf(2)));
                    }
    
                    /* @rule(base) .entry__root.entry---base-2-42*/
                    .root:base(42) {}
                    
                    /* @rule(min) .entry__root.entry---minFive-1-9 */
                    .root:minFive(9) {}

                    /* @rule(equal min) .entry__root.entry---minFive-1-5 */
                    .root:minFive(5) {}

                    /* @rule(max) .entry__root.entry---maxFive-1-2 */
                    .root:maxFive(2) {}

                    /* @rule(equal max) .entry__root.entry---maxFive-1-5 */
                    .root:maxFive(5) {}

                    /* @rule(multipleOf) .entry__root.entry---multipleOfThree-2-12 */
                    .root:multipleOfThree(12) {}

                    /* @rule(multi validations) .entry__root.entry---multi-2-14 */
                    .root:multi(14) {}
                `);

                const { meta } = sheets['/entry.st.css'];
                shouldReportNoDiagnostics(meta);
            });
            it('should report validation errors', () => {
                testStylableCore(`
                    .root {
                        -st-states: base(number),
                                    minFive(number(min(5))),
                                    maxFive(number(max(5))),
                                    multipleOfThree(number(multipleOf(3))),
                                    multi(number(min(10), multipleOf(2)));
                    }

                    /* 
                        @transform-error(no param) ${stCustomStateDiagnostics.NO_STATE_ARGUMENT_GIVEN(
                            'base',
                            'number'
                        )} 
                        @rule(no param) .entry__root.entry---base-0-
                    */
                    .root:base {}

                    /* 
                        @transform-error(no param with parans) ${stCustomStateDiagnostics.NO_STATE_ARGUMENT_GIVEN(
                            'base',
                            'number'
                        )} 
                        @rule(no param with parans) .entry__root.entry---base-0-
                    */
                    .root:base() {}
    
                    /* 
                        @transform-error(base) ${stCustomStateDiagnostics.FAILED_STATE_VALIDATION(
                            'base',
                            'text',
                            [
                                STCustomState.sysValidationErrors.number.NUMBER_TYPE_VALIDATION_FAILED(
                                    'text'
                                ),
                            ]
                        )} 
                        @rule(base) .entry__root.entry---base-4-text
                    */
                    .root:base(text) {}
                    
                    /* 
                        @transform-error(min) ${stCustomStateDiagnostics.FAILED_STATE_VALIDATION(
                            'minFive',
                            '4',
                            [
                                STCustomState.sysValidationErrors.number.MIN_VALIDATION_FAILED(
                                    '4',
                                    '5'
                                ),
                            ]
                        )} 
                        @rule(min) .entry__root.entry---minFive-1-4
                    */
                    .root:minFive(4) {}

                    /* 
                        @transform-error(max) ${stCustomStateDiagnostics.FAILED_STATE_VALIDATION(
                            'maxFive',
                            '6',
                            [
                                STCustomState.sysValidationErrors.number.MAX_VALIDATION_FAILED(
                                    '6',
                                    '5'
                                ),
                            ]
                        )} 
                        @rule(max) .entry__root.entry---maxFive-1-6
                    */
                    .root:maxFive(6) {}

                    /* 
                        @transform-error(multipleOf) ${stCustomStateDiagnostics.FAILED_STATE_VALIDATION(
                            'multipleOfThree',
                            '4',
                            [
                                STCustomState.sysValidationErrors.number.MULTIPLE_OF_VALIDATION_FAILED(
                                    '4',
                                    '3'
                                ),
                            ]
                        )} 
                        @rule(multipleOf) .entry__root.entry---multipleOfThree-1-4
                    */
                    .root:multipleOfThree(4) {}

                    /* 
                        @transform-error(multi validations) ${stCustomStateDiagnostics.FAILED_STATE_VALIDATION(
                            'multi',
                            '7',
                            [
                                STCustomState.sysValidationErrors.number.MIN_VALIDATION_FAILED(
                                    '7',
                                    '10'
                                ),
                                STCustomState.sysValidationErrors.number.MULTIPLE_OF_VALIDATION_FAILED(
                                    '7',
                                    '2'
                                ),
                            ]
                        )} 
                        @rule(multi validations) .entry__root.entry---multi-1-7
                    */
                    .root:multi(7) {}
                `);
            });
        });
        describe('enum parameter', () => {
            it('should transform enum state', () => {
                const { sheets } = testStylableCore(`
                    .root {
                        -st-states: opts(enum(small, large)),
                                    optsWithDef(enum(one, two, three)) three;
                    }
    
                    /* @rule(base) .entry__root.entry---opts-5-small */
                    .root:opts(small) {}
    
                    /* @rule(with default) .entry__root.entry---optsWithDef-5-three */
                    .root:optsWithDef {}
                `);

                const { meta } = sheets['/entry.st.css'];
                shouldReportNoDiagnostics(meta);
            });
            it('should report validation errors', () => {
                testStylableCore(`
                    .root {
                        -st-states: size(enum(small, large));
                    }

                    /* 
                        @transform-error(no param) ${stCustomStateDiagnostics.NO_STATE_ARGUMENT_GIVEN(
                            'size',
                            'enum'
                        )} 
                        @rule(no param) .entry__root.entry---size-0-
                    */
                    .root:size {}

                    /* 
                        @transform-error(no param with parans) ${stCustomStateDiagnostics.NO_STATE_ARGUMENT_GIVEN(
                            'size',
                            'enum'
                        )} 
                        @rule(no param with parans) .entry__root.entry---size-0-
                    */
                    .root:size() {}
                    
                    /* 
                        @transform-error ${stCustomStateDiagnostics.FAILED_STATE_VALIDATION(
                            'size',
                            'huge',
                            [
                                STCustomState.sysValidationErrors.enum.ENUM_TYPE_VALIDATION_FAILED(
                                    'huge',
                                    ['small', 'large']
                                ),
                            ]
                        )} 
                        @rule .entry__root.entry---size-4-huge
                    */
                   .root:size(huge) {}
                `);
            });
        });
        describe('custom mapped parameter', () => {
            it('should transform mapped state (quoted)', () => {
                const { sheets } = testStylableCore(`
                    .root {
                        -st-states: cls(".x"),
                                    escapedAndTrimmed("  .y[data-z=\\"value\\"]  "),
                                    nested(":not(:focus-within):not(:hover)"),
                                    valueAsGlobal(":cls");
                    }
    
                    /* @rule(base) .entry__root.x */
                    .root:cls {}
    
                    /* @rule(escaped and trimmed) .entry__root.y[data-z="value"] */
                    .root:escapedAndTrimmed {}

                    /* @rule(nested) .entry__root:not(:focus-within):not(:hover) */
                    .root:nested {}

                    /* @rule(take value as global) .entry__root:cls */
                    .root:valueAsGlobal {}
                `);

                const { meta } = sheets['/entry.st.css'];
                shouldReportNoDiagnostics(meta);
            });
            it('should transform parameter into custom template', () => {
                const { sheets } = testStylableCore(`
                    .root {
                        -st-states: class-name(".$0", string),
                                    multi-insertion(".$0[attr='$0']", string),
                                    paramOnly("$0", string);
                    }
    
                    /* @rule(base) .entry__root.abc */
                    .root:class-name(abc) {}

                    /* @rule(strip quotes) .entry__root.abc */
                    .root:class-name("abc") {}

                    /* @rule(multi insertion) .entry__root.abc[attr='abc'] */
                    .root:multi-insertion("abc") {}

                    /* @rule(nested complex) .entry__root:is(.a .b) */
                    .root:paramOnly(":is(.a .b)") {}

                    /* @rule(no escape) .entry__root.abc */
                    .root:paramOnly(.abc) {}

                    /* @rule(preserve escape) .entry__root.ab\\.c */
                    .root:paramOnly(.ab\\.c) {}
                `);

                const { meta } = sheets['/entry.st.css'];
                shouldReportNoDiagnostics(meta);
            });
            it('should report invalid template selector', () => {
                /**
                 * currently only checks template with parameter
                 * for backwards compatibility standalone template can accept
                 * any kind of selector - we might want to limit this in a future
                 * major version.
                 */
                testStylableCore(`
                    .root {
                        -st-states: classAndThenParam(".x$0", string),
                                    paramAndThenClass("$0.x", string),
                                    size("[size='$0']", number);
                    }

                    /* 
                        @transform-error(multi) ${stCustomStateDiagnostics.UNSUPPORTED_MULTI_SELECTOR(
                            'classAndThenParam',
                            '.x.a,.b'
                        )}
                        @rule(multi) .entry__root:classAndThenParam(.a,.b) 
                    */
                    .root:classAndThenParam(.a,.b) {}
    
                    /* 
                        @transform-error(complex) ${stCustomStateDiagnostics.UNSUPPORTED_COMPLEX_SELECTOR(
                            'classAndThenParam',
                            '.x.a .b'
                        )}
                        @rule(complex) .entry__root:classAndThenParam(.a .b) 
                    */
                    .root:classAndThenParam(.a .b) {}

                    /* 
                        @transform-error(invalid) ${stCustomStateDiagnostics.INVALID_SELECTOR(
                            'classAndThenParam',
                            '.x:unclosed('
                        )}
                        @rule(invalid) .entry__root:classAndThenParam(":unclosed(") 
                    */
                    .root:classAndThenParam(":unclosed(") {}

                    /* 
                        @transform-error(invalid start) ${stCustomStateDiagnostics.UNSUPPORTED_INITIAL_SELECTOR(
                            'paramAndThenClass',
                            'div.x'
                        )}
                        @rule(invalid start) .entry__root:paramAndThenClass(div) 
                    */
                    .root:paramAndThenClass(div) {}

                    /* 
                        @transform-error(invalid start2) ${stCustomStateDiagnostics.UNSUPPORTED_INITIAL_SELECTOR(
                            'paramAndThenClass',
                            '*.x'
                        )}
                        @rule(invalid start2) .entry__root:paramAndThenClass(*) 
                    */
                    .root:paramAndThenClass(*) {}
                    
                    /* 
                        @transform-error(param validation) ${stCustomStateDiagnostics.FAILED_STATE_VALIDATION(
                            'size',
                            'text',
                            [
                                STCustomState.sysValidationErrors.number.NUMBER_TYPE_VALIDATION_FAILED(
                                    'text'
                                ),
                            ]
                        )} 
                        @rule(param validation) .entry__root[size='text']
                    */
                    .root:size(text) {}
                `);
            });
        });
        it('should handle escaped characters', () => {
            const { sheets } = testStylableCore(
                `
                .root {
                    -st-states: bool\\.ean,
                                str\\.ing(string),
                                num\\.ber(number),
                                en\\.um(enum(x, y)),
                                map\\.ped(".x");
                }

                /* @rule(escaped) .entry\\.__root.entry\\.--bool\\.ean */
                .root:bool\\.ean {}

                /* @rule(string) .entry\\.__root.entry\\.---str\\.ing-3-abc */
                .root:str\\.ing(abc) {}

                /* @rule(number) .entry\\.__root.entry\\.---num\\.ber-1-5 */
                .root:num\\.ber(5) {}

                /* @rule(enum) .entry\\.__root.entry\\.---en\\.um-1-y */
                .root:en\\.um(y) {}

                /* @rule(mapped) .entry\\.__root.x */
                .root:map\\.ped {}
            `,
                {
                    stylableConfig: {
                        resolveNamespace(namespace) {
                            return namespace + '.';
                        },
                    },
                }
            );

            const { meta } = sheets['/entry.st.css'];
            shouldReportNoDiagnostics(meta);
        });
    });
    describe(`st-var`, () => {
        /* ToDo: consider dropping support for this */
        it('should support value() concatenate value into default', () => {
            const { sheets } = testStylableCore(`
                :vars {
                    idPrefix: id-;
                }

                .root {
                    -st-states: s1(string) value(idPrefix)default;
                }

                /* @rule(default) .entry__root.entry---s1-10-id-default */
                .root:s1 {}
            `);

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);
        });
        it('should support value() within string validation config', () => {
            const { sheets } = testStylableCore(`
                :vars {
                    validPrefix: user;
                }

                .a {
                    -st-states: state1(string(contains(value(validPrefix))));
                }

                /* @rule .entry__a.entry---state1-8-userName */
                .a:state1(userName) {}
            `);

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);
        });
        it('should support value() within enum definition / call', () => {
            const { sheets } = testStylableCore(`
                :vars {
                    optionA: a;
                    optionB: b;
                    optionC: c;
                }

                .root {
                    -st-states: 
                        option(enum(
                            value(optionA),
                            value(optionB)
                        )) value(optionB);
                }

                /* @rule(default) .entry__root.entry---option-1-b */
                .root:option {}

                /* @rule(target value) .entry__root.entry---option-1-a */
                .root:option(value(optionA)) {}
                
                /* 
                    @x-transform-error(target invalid) invalid optionC
                    @rule(target invalid) .entry__root.entry---option-1-c 
                */
                .root:option(value(optionC)) {}
            `);

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta); // ToDo: `target invalid` should report
        });
    });
    describe(`st-mixin`, () => {
        it.skip('should override value() within var definition / call', () => {
            // mixins could be able to gain more power by overriding st-var in state definitions and selectors
            const { sheets } = testStylableCore(`
                :vars {
                    optionA: a;
                    optionB: b;
                    optionC: c;
                    optionD: c;
                }

                .mix {
                    -st-states: 
                        option(enum(
                            value(optionA),
                            value(optionB)
                        )) value(optionB);
                }
                .mix:option {}
                .mix:option(value(optionA)) {}

                /* 
                    @rule[1](default) .entry__into.entry---option-1-d 
                    @rule[2](target value) .entry__into.entry---option-1-c 
                */
                .into {
                    -st-mixin: mix(
                        optionA value(optionC),
                        optionB value(optionD)
                    );
                }
            `);

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);
        });
        it(`should mix custom state`, () => {
            const { sheets } = testStylableCore({
                '/base.st.css': `
                    .root {
                        -st-states: toggled;
                    }
                    .root:toggled {
                        value: from base;
                    }
                `,
                '/extend.st.css': `
                    @st-import Base from './base.st.css';
                    Base {}
                    .root {
                        -st-extends: Base;
                    }
                    .root:toggled {
                        value: from extend;
                    }
                `,
                '/entry.st.css': `
                    @st-import Extend, [Base] from './extend.st.css';

                    /* @rule[1] 
                    .entry__a.base--toggled {
                        value: from base;
                    } */
                    .a {
                        -st-mixin: Base;
                    }

                    /* 
                    ToDo: change to 1 once empty AST is filtered
                    @rule[2] 
                    .entry__a.base--toggled {
                        value: from extend;
                    } */
                    .a {
                        -st-mixin: Extend;
                    }
                `,
            });

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);
        });
        it(`should mix imported class with custom-pseudo-state`, () => {
            // ToDo: fix case where extend.st.css has .root between mix rules: https://shorturl.at/cwBMP
            const { sheets } = testStylableCore({
                '/base.st.css': `
                    .root {
                        /* not going to be mixed through -st-extends */
                        id: base-root;
                        -st-states: state;
                    }
                `,
                '/extend.st.css': `
                    @st-import Base from './base.st.css';
                    .root {
                        -st-extends: Base;
                    }
                    .mix {
                        -st-extends: Base;
                        id: extend-mix;
                    }
                    .mix:state {
                        id: extend-mix-state;
                    };
                    .root:state {
                        id: extend-root-state;
                    }

                `,
                '/enrich.st.css': `
                    @st-import MixRoot, [mix as mixClass] from './extend.st.css';
                    MixRoot {
                        id: enrich-MixRoot;
                    }
                    MixRoot:state {
                        id: enrich-MixRoot-state;
                    }
                    .mixClass {
                        id: enrich-mixClass;
                    }
                    .mixClass:state {
                        id: enrich-mixClass-state;
                    }
                `,
                '/entry.st.css': `
                    @st-import [MixRoot, mixClass] from './enrich.st.css';

                    /*
                        @rule[0] .entry__a { -st-extends: Base; id: extend-mix; }
                        @rule[1] .entry__a.base--state { id: extend-mix-state; }
                        @rule[2] .entry__a { id: enrich-mixClass; }
                        @rule[3] .entry__a.base--state { id: enrich-mixClass-state; }
                    */
                    .a {
                        -st-mixin: mixClass;
                    }

                    /*
                        @rule[0] .entry__a { -st-extends: Base; }
                        @rule[1] .entry__a .extend__mix { -st-extends: Base; id: extend-mix; }
                        @rule[2] .entry__a .extend__mix.base--state { id: extend-mix-state; }
                        @rule[3] .entry__a.base--state { id: extend-root-state; }
                        @rule[4] .entry__a { id: enrich-MixRoot; }
                        @rule[5] .entry__a.base--state { id: enrich-MixRoot-state; }
                    */
                    .a {
                        -st-mixin: MixRoot;
                    }
                `,
            });

            const { meta } = sheets['/entry.st.css'];

            shouldReportNoDiagnostics(meta);
        });
    });
    describe('css-class (inheritance)', () => {
        it('should resolve state from a local extended classes', () => {
            const { sheets } = testStylableCore(`
                .root {
                    -st-states: s1;
                }
                .class {
                    -st-states: s2;
                }

                .fromRoot {
                    -st-extends: root;
                }
                .fromClass {
                    -st-extends: class;
                }

                /* @rule .entry__fromRoot.entry--s1 */
                .fromRoot:s1 {}

                /* @rule .entry__fromClass.entry--s2 */
                .fromClass:s2 {}
            `);

            const { meta } = sheets['/entry.st.css'];
            shouldReportNoDiagnostics(meta);
        });
        it('should resolve extended state', () => {
            const { sheets } = testStylableCore({
                '/comp.st.css': `
                    .root {
                        -st-states: x;
                    }
                `,
                '/entry.st.css': `
                    @st-import Comp from './comp.st.css';

                    .local {
                        -st-extends: Comp;
                    }

                    /* @rule .entry__local.comp--x */
                    .local:x {}
                `,
            });

            const { meta } = sheets['/entry.st.css'];
            shouldReportNoDiagnostics(meta);
        });
        it('should resolve 2nd level inherited state', () => {
            const { sheets } = testStylableCore({
                '/comp.st.css': `
                    .root {
                        -st-states: x;
                    }
                `,
                '/proxy.st.css': `
                    @st-import Comp from './comp.st.css';    
                    .root {
                        -st-extends: Comp
                    }
                `,
                '/entry.st.css': `
                    @st-import Proxy from './proxy.st.css';

                    .local {
                        -st-extends: Proxy;
                    }

                    /* @rule .entry__local.comp--x */
                    .local:x {}
                `,
            });

            const { meta } = sheets['/entry.st.css'];
            shouldReportNoDiagnostics(meta);
        });
    });
    describe('css-type', () => {
        it('should resolve state from element type', () => {
            const { sheets } = testStylableCore({
                '/comp.st.css': `
                    .root {
                        -st-states: x;
                    }
                `,
                '/pass-through.st.css': `
                    @st-import Comp from './comp.st.css';
                    .root Comp {}
                `,
                '/entry.st.css': `
                    @st-import [Comp] from './pass-through.st.css';

                    /* @rule .entry__root .comp__root.comp--x */
                    .root Comp:x {}
                `,
            });

            const { meta } = sheets['/entry.st.css'];
            shouldReportNoDiagnostics(meta);
        });
    });
    describe('css-pseudo-element', () => {
        it('should resolve state from inherited part', () => {
            const { sheets } = testStylableCore({
                '/comp.st.css': `
                    .part {
                        -st-states: x;
                    }
                `,
                '/entry.st.css': `
                    @st-import Comp from './comp.st.css';

                    /* @rule(from element) .entry__root .comp__root .comp__part.comp--x */
                    .root Comp::part:x {}

                    .local {
                        -st-extends: Comp;
                    }

                    /* @rule(from extend) .entry__local .comp__part.comp--x */
                    .local::part:x {}
                `,
            });

            const { meta } = sheets['/entry.st.css'];
            shouldReportNoDiagnostics(meta);
        });
        it('should resolve state from inherited part that inherits the state', () => {
            const { sheets } = testStylableCore({
                '/comp.st.css': `
                    .root {
                        -st-states: x, c;
                    }
                `,
                '/extend.st.css': `
                    @st-import Comp from './comp.st.css';
                    .part {
                        -st-extends: Comp;
                        -st-states: y, c;
                    }
                `,
                '/entry.st.css': `
                    @st-import Extend from './extend.st.css';

                    .local {
                        -st-extends: Extend;
                    }

                    /* @rule(from base) .entry__local .extend__part.comp--x */
                    .local::part:x {}

                    /* @rule(from extend) .entry__local .extend__part.extend--y */
                    .local::part:y {}

                    /* @rule(override from extend) .entry__local .extend__part.extend--c */
                    .local::part:c {}
                `,
            });

            const { meta } = sheets['/entry.st.css'];
            shouldReportNoDiagnostics(meta);
        });
    });
    describe('css-media', () => {
        it('handle scoping inside media queries', () => {
            const { sheets } = testStylableCore(`
                @media (max-width: 300px) {
                    .a {
                        -st-states: x;
                    }

                    /* @rule(boolean) .entry__a.entry--x */
                    .a:x {}
                }
            `);

            const { meta } = sheets['/entry.st.css'];
            shouldReportNoDiagnostics(meta);
        });
    });
});
