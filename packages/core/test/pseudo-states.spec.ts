import { expectWarnings, expectWarningsFromTransform } from '@stylable/core-test-kit';
import { generateStylableResult, processSource } from '@stylable/core-test-kit';
import { flatMatch, mediaQuery, styleRules } from '@stylable/core-test-kit';
import { expect, use } from 'chai';
import chaiSubset from 'chai-subset';
import { processorWarnings, valueMapping } from '../src';
import { nativePseudoClasses } from '../src/native-reserved-lists';
import { stateErrors } from '../src/pseudo-states';

use(chaiSubset); // move all of these to a central place
use(styleRules);
use(mediaQuery);
use(flatMatch);

// testing concerns for feature
// - states belonging to an extended class (multi level)
// - lookup order

describe('pseudo-states', () => {
    describe('process', () => {
        // What does it do?
        // Works in the scope of a single file, collecting state definitions for later usage

        describe('boolean', () => {
            it('should collect state definitions as null (for boolean)', () => {
                const { classes, diagnostics } = processSource(
                    `
                    .root {
                        -st-states: state1, state2;
                    }
                `,
                    { from: 'path/to/style.css' }
                );

                expect(diagnostics.reports.length, 'no reports').to.eql(0);
                expect(classes).to.flatMatch({
                    root: {
                        [valueMapping.states]: {
                            state1: null,
                            state2: null,
                        },
                    },
                });
            });

            it('should support explicit boolean state definition', () => {
                const res = processSource(
                    `
                    .root {
                        -st-states: state1(boolean);
                    }
                `,
                    { from: 'path/to/style.css' }
                );

                expect(res.diagnostics.reports.length, 'no reports').to.eql(0);

                expect(res.classes).to.containSubset({
                    root: {
                        [valueMapping.states]: {
                            state1: null,
                        },
                    },
                });
            });
        });

        describe('advanced type', () => {
            it('should warn when a state receieves more than a single state type', () => {
                expectWarnings(
                    `
                    .root{
                        |-st-states: $state1(string, number(x))$|;
                    }
                `,
                    [
                        {
                            message: stateErrors.TOO_MANY_STATE_TYPES('state1', [
                                'string',
                                'number(x)',
                            ]),
                            file: 'main.css',
                        },
                    ]
                );
            });

            it('should warn when a state function receives no arguments', () => {
                expectWarnings(
                    `
                    .root{
                        |-st-states: $state1()$|;
                    }
                `,
                    [
                        {
                            message: stateErrors.NO_STATE_TYPE_GIVEN('state1'),
                            file: 'main.css',
                        },
                    ]
                );
            });

            it('should warn when a validator function receives more than a single argument', () => {
                expectWarnings(
                    `
                    .my-class {
                        |-st-states: $state1( string( contains(one, two) ) )$|;
                    }
                `,
                    [
                        {
                            message: stateErrors.TOO_MANY_ARGS_IN_VALIDATOR('state1', 'contains', [
                                'one',
                                'two',
                            ]),
                            file: 'main.css',
                        },
                    ]
                );
            });

            it('should warn when encountering an unknown type', () => {
                expectWarnings(
                    `
                    .my-class {
                        |-st-states: state1( $unknown$ )|;
                    }
                `,
                    [
                        {
                            message: stateErrors.UNKNOWN_STATE_TYPE('state1', 'unknown'),
                            file: 'main.css',
                        },
                    ]
                );
            });

            describe('string', () => {
                it('as a simple validator', () => {
                    const res = processSource(
                        `
                        .root {
                            -st-states: state1(string);
                        }
                    `,
                        { from: 'path/to/style.css' }
                    );

                    expect(res.diagnostics.reports.length, 'no reports').to.eql(0);

                    expect(res.classes).to.containSubset({
                        root: {
                            [valueMapping.states]: {
                                state1: {
                                    type: 'string',
                                },
                            },
                        },
                    });
                });

                it('as a validation type with no nested validations', () => {
                    const res = processSource(
                        `
                        .root {
                            -st-states: state1(string());
                        }
                    `,
                        { from: 'path/to/style.css' }
                    );

                    expect(res.diagnostics.reports.length, 'no reports').to.eql(0);

                    expect(res.classes).to.containSubset({
                        root: {
                            [valueMapping.states]: {
                                state1: {
                                    type: 'string',
                                },
                            },
                        },
                    });
                });

                it('including a default value', () => {
                    const res = processSource(
                        `
                        .root {
                            -st-states: state1(string) some Default String;
                        }
                    `,
                        { from: 'path/to/style.css' }
                    );

                    expect(res.diagnostics.reports.length, 'no reports').to.eql(0);
                    expect(res.classes).to.containSubset({
                        root: {
                            [valueMapping.states]: {
                                state1: {
                                    defaultValue: 'some Default String',
                                    type: 'string',
                                },
                            },
                        },
                    });
                });

                it('with a regex validator', () => {
                    const res = processSource(
                        `
                        .root {
                            -st-states: state1( string( regex("^user") ));
                        }
                    `,
                        { from: 'path/to/style.css' }
                    );

                    expect(res.diagnostics.reports.length, 'no reports').to.eql(0);

                    expect(res.classes).to.containSubset({
                        root: {
                            [valueMapping.states]: {
                                state1: {
                                    type: 'string',
                                    arguments: [
                                        {
                                            name: 'regex',
                                            args: ['^user'],
                                        },
                                    ],
                                },
                            },
                        },
                    });
                });

                it('with a single nested validator', () => {
                    const res = processSource(
                        `
                        .root {
                            -st-states: state1(string(minLength(2)));
                        }
                    `,
                        { from: 'path/to/style.css' }
                    );

                    expect(res.diagnostics.reports.length, 'no reports').to.eql(0);

                    expect(res.classes).to.containSubset({
                        root: {
                            [valueMapping.states]: {
                                state1: {
                                    type: 'string',
                                    arguments: [
                                        {
                                            name: 'minLength',
                                            args: ['2'],
                                        },
                                    ],
                                },
                            },
                        },
                    });
                });

                it('with multiple validators', () => {
                    // this test also shows that all validator params are treated as strings
                    const res = processSource(
                        `
                        .root {
                            -st-states: state1(string(minLength(2), maxLength("7")));
                        }
                    `,
                        { from: 'path/to/style.css' }
                    );

                    expect(res.diagnostics.reports.length, 'no reports').to.eql(0);

                    expect(res.classes).to.containSubset({
                        root: {
                            [valueMapping.states]: {
                                state1: {
                                    type: 'string',
                                    arguments: [
                                        {
                                            name: 'minLength',
                                            args: ['2'],
                                        },
                                        {
                                            name: 'maxLength',
                                            args: ['7'],
                                        },
                                    ],
                                },
                            },
                        },
                    });
                });

                it('with a nested validator and a regex validator', () => {
                    const res = processSource(
                        `
                        .root {
                            -st-states: state1(string( regex("^user"), contains(user) ));
                        }
                    `,
                        { from: 'path/to/style.css' }
                    );

                    expect(res.diagnostics.reports.length, 'no reports').to.eql(0);

                    expect(res.classes).to.containSubset({
                        root: {
                            [valueMapping.states]: {
                                state1: {
                                    type: 'string',
                                    arguments: [
                                        {
                                            name: 'regex',
                                            args: ['^user'],
                                        },
                                        {
                                            name: 'contains',
                                            args: ['user'],
                                        },
                                    ],
                                },
                            },
                        },
                    });
                });
            });

            describe('number', () => {
                it('as a simple validator', () => {
                    const res = processSource(
                        `
                        .root {
                            -st-states: state1(number), state2(number());
                        }
                    `,
                        { from: 'path/to/style.css' }
                    );

                    expect(res.diagnostics.reports.length, 'no reports').to.eql(0);

                    expect(res.classes).to.containSubset({
                        root: {
                            [valueMapping.states]: {
                                state1: {
                                    type: 'number',
                                },
                                state2: {
                                    type: 'number',
                                },
                            },
                        },
                    });
                });

                it('including a default value', () => {
                    const res = processSource(
                        `
                        .root {
                            -st-states: state1(number) 7;
                        }
                    `,
                        { from: 'path/to/style.css' }
                    );

                    expect(res.diagnostics.reports.length, 'no reports').to.eql(0);
                    expect(res.classes).to.containSubset({
                        root: {
                            [valueMapping.states]: {
                                state1: {
                                    defaultValue: '7',
                                    type: 'number',
                                },
                            },
                        },
                    });
                });
            });

            describe('enum', () => {
                it('as a simple validator', () => {
                    const res = processSource(
                        `
                        .root {
                            -st-states: size(enum(small, medium, large)), color(enum(red, green, blue));
                        }
                    `,
                        { from: 'path/to/style.css' }
                    );

                    expect(res.diagnostics.reports.length, 'no reports').to.eql(0);

                    expect(res.classes).to.containSubset({
                        root: {
                            [valueMapping.states]: {
                                size: {
                                    type: 'enum',
                                    arguments: ['small', 'medium', 'large'],
                                },
                                color: {
                                    type: 'enum',
                                    arguments: ['red', 'green', 'blue'],
                                },
                            },
                        },
                    });
                });

                it('including a default value', () => {
                    const res = processSource(
                        `
                        .root {
                            -st-states: size(enum(small, large)) small;
                        }
                    `,
                        { from: 'path/to/style.css' }
                    );

                    expect(res.diagnostics.reports.length, 'no reports').to.eql(0);
                    expect(res.classes).to.containSubset({
                        root: {
                            [valueMapping.states]: {
                                size: {
                                    defaultValue: 'small',
                                    type: 'enum',
                                    arguments: ['small', 'large'],
                                },
                            },
                        },
                    });
                });
            });

            describe('tag', () => {
                it('as a simple validator', () => {
                    const res = processSource(
                        `
                        .root {
                            -st-states: category(tag);
                        }
                    `,
                        { from: 'path/to/style.css' }
                    );

                    expect(res.diagnostics.reports.length, 'no reports').to.eql(0);

                    expect(res.classes).to.containSubset({
                        root: {
                            [valueMapping.states]: {
                                category: {
                                    type: 'tag',
                                },
                            },
                        },
                    });
                });

                it('including a default value', () => {
                    const res = processSource(
                        `
                        .root {
                            -st-states: category(tag) movie;
                        }
                    `,
                        { from: 'path/to/style.css' }
                    );

                    expect(res.diagnostics.reports.length, 'no reports').to.eql(0);
                    expect(res.classes).to.containSubset({
                        root: {
                            [valueMapping.states]: {
                                category: {
                                    defaultValue: 'movie',
                                    type: 'tag',
                                },
                            },
                        },
                    });
                });
            });
        });

        describe('custom mapping', () => {
            it('collect typed classes with mapping states', () => {
                const res = processSource(
                    `
                    .root {
                        -st-states: state1, state2("[data-mapped]");
                    }
                `,
                    { from: 'path/to/style.css' }
                );

                expect(res.diagnostics.reports.length, 'no reports').to.eql(0);
                expect(res.classes).to.flatMatch({
                    root: {
                        [valueMapping.states]: {
                            state1: null, // boolean
                            state2: '[data-mapped]',
                        },
                    },
                });
            });
        });
    });

    describe('transform', () => {
        // What does it do?
        // Replaces all custom state definitions (based on information gather during processing)
        // with their final selector string

        describe('native', () => {
            nativePseudoClasses.forEach((nativeClass: string) => {
                it(`should keep native ${nativeClass} pseudo-class`, () => {
                    const res = generateStylableResult({
                        entry: '/entry.css',
                        files: {
                            '/entry.css': {
                                namespace: 'entry',
                                content: `.root:${nativeClass}{}`,
                            },
                        },
                    });

                    expect(res).to.have.styleRules([`.entry__root:${nativeClass}{}`]);
                    expect(
                        res.meta.diagnostics.reports,
                        'no diagnostics reported for native states'
                    ).to.eql([]);
                });
            });
        });

        describe('boolean', () => {
            it('should resolve nested pseudo-states', () => {
                const res = generateStylableResult({
                    entry: '/entry.st.css',
                    usedFiles: ['/entry.st.css'],
                    files: {
                        '/entry.st.css': {
                            namespace: 'entry',
                            content: `
                                .root {
                                     -st-states: state1;
                                }
                                .root:not(:state1) {}
                            `,
                        },
                    },
                });

                expect(
                    res.meta.diagnostics.reports,
                    'no diagnostics reported for native states'
                ).to.eql([]);
                expect(res).to.have.styleRules({
                    1: '.entry__root:not(.entry--state1) {}',
                });
            });

            it('should support explicitly defined boolean state type', () => {
                const res = generateStylableResult({
                    entry: `/entry.st.css`,
                    files: {
                        '/entry.st.css': {
                            namespace: 'entry',
                            content: `
                            .my-class {
                                -st-states: state1(boolean);
                            }
                            .my-class:state1 {}
                            `,
                        },
                    },
                });

                expect(
                    res.meta.diagnostics.reports,
                    'no diagnostics reported for native states'
                ).to.eql([]);
                expect(res).to.have.styleRules({
                    1: '.entry__my-class.entry--state1 {}',
                });
            });
        });

        describe('advanced type / validation', () => {
            xit('should default to a boolean state when state is a function but receives no type', () => {
                // TODO: Make this pass?

                const res = generateStylableResult({
                    entry: `/entry.st.css`,
                    files: {
                        '/entry.st.css': {
                            namespace: 'entry',
                            content: `
                            .my-class| {
                                -st-states: |state1|();
                            }
                            .my-class:state1 {}
                            `,
                        },
                    },
                });

                // const res = expectWarningsFromTransform(config, [{
                //     message: [
                //         'pseudo-state "state1" expected a definition of a single type, but received none'
                //     ].join('\n'),
                //     file: '/entry.st.css'
                // }]);
                expect(res).to.have.styleRules({
                    1: '.entry__my-class[data-entry-state1] {}',
                });
            });

            it('should strip quotation marks when transform any state parameter', () => {
                const res = generateStylableResult({
                    entry: `/entry.st.css`,
                    files: {
                        '/entry.st.css': {
                            namespace: 'entry',
                            content: `
                            .my-class {
                                -st-states: state1(string);
                            }
                            .my-class:state1("someString") {}
                            `,
                        },
                    },
                });

                expect(
                    res.meta.diagnostics.reports,
                    'no diagnostics reported for native states'
                ).to.eql([]);
                expect(res).to.have.styleRules({
                    1: '.entry__my-class.entry---state1-10-someString {}',
                });
            });

            it('should use an attribute selector for illegal param syntax (and replaces spaces with underscoes)', () => {
                const res = generateStylableResult({
                    entry: `/entry.st.css`,
                    files: {
                        '/entry.st.css': {
                            namespace: 'entry',
                            content: `
                            .root {
                                -st-states: state( string());
                            }
                            .root:state(user name) {}
                            `,
                        },
                    },
                });

                expect(
                    res.meta.diagnostics.reports,
                    'no diagnostics reported for native states'
                ).to.eql([]);
                expect(res).to.have.styleRules({
                    1: '.entry__root[class~="entry---state-9-user_name"] {}',
                });
            });

            describe('string', () => {
                it('should transform string type', () => {
                    const res = generateStylableResult({
                        entry: `/entry.st.css`,
                        files: {
                            '/entry.st.css': {
                                namespace: 'entry',
                                content: `
                                .my-class {
                                    -st-states: state1(string);
                                }
                                .my-class:state1(someString) {}
                                `,
                            },
                        },
                    });

                    expect(
                        res.meta.diagnostics.reports,
                        'no diagnostics reported for native states'
                    ).to.eql([]);
                    expect(res).to.have.styleRules({
                        1: '.entry__my-class.entry---state1-10-someString {}',
                    });
                });

                it('should support default values for string type', () => {
                    const res = generateStylableResult({
                        entry: `/entry.st.css`,
                        files: {
                            '/entry.st.css': {
                                namespace: 'entry',
                                content: `
                                .my-class {
                                    -st-states: stateWithDefault(string) myDefault String;
                                }
                                .my-class:stateWithDefault {}
                                `,
                            },
                        },
                    });

                    expect(
                        res.meta.diagnostics.reports,
                        'no diagnostics reported for native states'
                    ).to.eql([]);
                    expect(res).to.have.styleRules({
                        1: '.entry__my-class[class~="entry---stateWithDefault-16-myDefault_String"] {}',
                    });
                });

                it('should supprt default values through a variable', () => {
                    const res = generateStylableResult({
                        entry: `/entry.st.css`,
                        files: {
                            '/entry.st.css': {
                                namespace: 'entry',
                                content: `
                                :vars {
                                    myID: user;
                                }

                                .my-class {
                                    -st-states: stateWithDefault(string) value(myID)name;
                                }
                                .my-class:stateWithDefault {}
                                `,
                            },
                        },
                    });

                    expect(
                        res.meta.diagnostics.reports,
                        'no diagnostics reported for native states'
                    ).to.eql([]);
                    expect(res).to.have.styleRules({
                        1: '.entry__my-class.entry---stateWithDefault-8-username {}',
                    });
                });

                describe('specific validators', () => {
                    it('should transform string using a valid regex validation', () => {
                        const res = generateStylableResult({
                            entry: `/entry.st.css`,
                            files: {
                                '/entry.st.css': {
                                    namespace: 'entry',
                                    content: `
                                    .my-class {
                                        -st-states: state1( string( regex("^user") ));
                                    }
                                    .my-class:state1(userName) {}
                                    `,
                                },
                            },
                        });

                        expect(
                            res.meta.diagnostics.reports,
                            'no diagnostics reported for native states'
                        ).to.eql([]);
                        expect(res).to.have.styleRules({
                            1: '.entry__my-class.entry---state1-8-userName {}',
                        });
                    });

                    it('should warn when using an invalid regex validation', () => {
                        const config = {
                            entry: `/entry.st.css`,
                            files: {
                                '/entry.st.css': {
                                    namespace: 'entry',
                                    content: `
                                    .my-class {
                                        -st-states: state1( string( regex("^user") ));
                                    }
                                    |.my-class:state1(failingParameter)| {}
                                    `,
                                },
                            },
                        };

                        const res = expectWarningsFromTransform(config, [
                            {
                                message: [
                                    'pseudo-state "state1" with parameter "failingParameter" failed validation:',
                                    'expected "failingParameter" to match regex "^user"',
                                ].join('\n'),
                                file: '/entry.st.css',
                            },
                        ]);
                        expect(res).to.have.styleRules({
                            1: '.entry__my-class.entry---state1-16-failingParameter {}',
                        });
                    });

                    it('should transform string using a valid contains validator', () => {
                        const res = generateStylableResult({
                            entry: `/entry.st.css`,
                            files: {
                                '/entry.st.css': {
                                    namespace: 'entry',
                                    content: `
                                    .my-class {
                                        -st-states: state1(string(contains(user)));
                                    }
                                    .my-class:state1(userName) {}
                                    `,
                                },
                            },
                        });

                        expect(
                            res.meta.diagnostics.reports,
                            'no diagnostics reported for native states'
                        ).to.eql([]);
                        expect(res).to.have.styleRules({
                            1: '.entry__my-class.entry---state1-8-userName {}',
                        });
                    });

                    it('should transform string using a contains validator with a variable', () => {
                        const res = generateStylableResult({
                            entry: `/entry.st.css`,
                            files: {
                                '/entry.st.css': {
                                    namespace: 'entry',
                                    content: `
                                    :vars {
                                        validPrefix: user;
                                    }

                                    .my-class {
                                        -st-states: state1(string(contains(value(validPrefix))));
                                    }
                                    .my-class:state1(userName) {}
                                    `,
                                },
                            },
                        });

                        expect(
                            res.meta.diagnostics.reports,
                            'no diagnostics reported for native states'
                        ).to.eql([]);
                        expect(res).to.have.styleRules({
                            1: '.entry__my-class.entry---state1-8-userName {}',
                        });
                    });

                    it('should transform string using an invalid contains validator (mainintaing passed values)', () => {
                        const config = {
                            entry: `/entry.st.css`,
                            files: {
                                '/entry.st.css': {
                                    namespace: 'entry',
                                    content: `
                                    .my-class {
                                        -st-states: state1(string(contains(user)));
                                    }
                                    |.my-class:state1($wrongState$)| {}
                                    `,
                                },
                            },
                        };

                        const res = expectWarningsFromTransform(config, [
                            {
                                message: [
                                    'pseudo-state "state1" with parameter "wrongState" failed validation:',
                                    'expected "wrongState" to contain string "user"',
                                ].join('\n'),
                                file: '/entry.st.css',
                            },
                        ]);
                        expect(res).to.have.styleRules({
                            1: '.entry__my-class.entry---state1-10-wrongState {}',
                        });
                    });

                    it('should transform using multiple validators (regex, minLength, maxLength)', () => {
                        const res = generateStylableResult({
                            entry: `/entry.st.css`,
                            files: {
                                '/entry.st.css': {
                                    namespace: 'entry',
                                    content: `
                                    .my-class {
                                        -st-states: state1( string( regex("^user"), minLength(3), maxLength(5) ));
                                    }
                                    .my-class:state1(user) {}
                                    `,
                                },
                            },
                        });

                        expect(
                            res.meta.diagnostics.reports,
                            'no diagnostics reported for native states'
                        ).to.eql([]);
                        expect(res).to.have.styleRules({
                            1: '.entry__my-class.entry---state1-4-user {}',
                        });
                    });

                    it('should transform and warn when passing an invalid value to a minLength validator', () => {
                        const config = {
                            entry: `/entry.st.css`,
                            files: {
                                '/entry.st.css': {
                                    namespace: 'entry',
                                    content: `
                                    .my-class {
                                        -st-states: state1(string(minLength(7)));
                                    }
                                    |.my-class:state1($user$)| {}
                                    `,
                                },
                            },
                        };

                        const res = expectWarningsFromTransform(config, [
                            {
                                message: [
                                    'pseudo-state "state1" with parameter "user" failed validation:',
                                    'expected "user" to be of length longer than or equal to 7',
                                ].join('\n'),
                                file: '/entry.st.css',
                            },
                        ]);
                        expect(res).to.have.styleRules({
                            1: '.entry__my-class.entry---state1-4-user {}',
                        });
                    });

                    it('should transform and warn when passing an invalid value to a maxLength validator', () => {
                        const config = {
                            entry: `/entry.st.css`,
                            files: {
                                '/entry.st.css': {
                                    namespace: 'entry',
                                    content: `
                                    .my-class {
                                        -st-states: state1(string(maxLength(3)));
                                    }
                                    |.my-class:state1($user$)| {}
                                    `,
                                },
                            },
                        };

                        const res = expectWarningsFromTransform(config, [
                            {
                                message: [
                                    'pseudo-state "state1" with parameter "user" failed validation:',
                                    'expected "user" to be of length shorter than or equal to 3',
                                ].join('\n'),
                                file: '/entry.st.css',
                            },
                        ]);
                        expect(res).to.have.styleRules({
                            1: '.entry__my-class.entry---state1-4-user {}',
                        });
                    });

                    it('should transform and warn when passing an invalid value to a multiple validators', () => {
                        const config = {
                            entry: `/entry.st.css`,
                            files: {
                                '/entry.st.css': {
                                    namespace: 'entry',
                                    content: `
                                    .my-class {
                                        -st-states: state1( string( maxLength(3), regex("^case") ));
                                    }
                                    |.my-class:state1($user$)| {}
                                    `,
                                },
                            },
                        };

                        const res = expectWarningsFromTransform(config, [
                            {
                                message: [
                                    'pseudo-state "state1" with parameter "user" failed validation:',
                                    'expected "user" to be of length shorter than or equal to 3',
                                    'expected "user" to match regex "^case"',
                                ].join('\n'),
                                file: '/entry.st.css',
                            },
                        ]);
                        expect(res).to.have.styleRules({
                            1: '.entry__my-class.entry---state1-4-user {}',
                        });
                    });

                    it('should warn when trying to use an unknown string validator', () => {
                        const config = {
                            entry: `/entry.st.css`,
                            files: {
                                '/entry.st.css': {
                                    namespace: 'entry',
                                    content: `
                                    .my-class {
                                        |-st-states: $state1(string(missing()))$|;
                                    }
                                    `,
                                },
                            },
                        };

                        expectWarningsFromTransform(config, [
                            {
                                message: [
                                    'pseudo-state "state1" default value "" failed validation:',
                                    'encountered unknown string validator "missing"',
                                ].join('\n'),
                                file: '/entry.st.css',
                            },
                        ]);
                    });
                });
            });

            describe('number', () => {
                it('should transform number validator', () => {
                    const res = generateStylableResult({
                        entry: `/entry.st.css`,
                        files: {
                            '/entry.st.css': {
                                namespace: 'entry',
                                content: `
                                .my-class {
                                    -st-states: state1(number);
                                }
                                .my-class:state1(42) {}
                                `,
                            },
                        },
                    });

                    expect(
                        res.meta.diagnostics.reports,
                        'no diagnostics reported for native states'
                    ).to.eql([]);
                    expect(res).to.have.styleRules({
                        1: '.entry__my-class[class~="entry---state1-2-42"] {}',
                    });
                });

                it('should warn when a non-number default value is invoked', () => {
                    const config = {
                        entry: `/entry.st.css`,
                        files: {
                            '/entry.st.css': {
                                namespace: 'entry',
                                content: `
                                .my-class{
                                    |-st-states: $state1(number) defaultBlah$|;
                                }
                                `,
                            },
                        },
                    };

                    expectWarningsFromTransform(config, [
                        {
                            message: [
                                'pseudo-state "state1" default value "defaultBlah" failed validation:',
                                'expected "defaultBlah" to be of type number',
                            ].join('\n'),
                            file: '/entry.st.css',
                        },
                    ]);
                });

                it('should warn on an non-number value passed', () => {
                    const config = {
                        entry: `/entry.st.css`,
                        files: {
                            '/entry.st.css': {
                                namespace: 'entry',
                                content: `
                                .my-class{
                                    -st-states: state1(number);
                                }
                                |.my-class:state1(blah)| {}
                                `,
                            },
                        },
                    };

                    const res = expectWarningsFromTransform(config, [
                        {
                            message: [
                                'pseudo-state "state1" with parameter "blah" failed validation:',
                                'expected "blah" to be of type number',
                            ].join('\n'),
                            file: '/entry.st.css',
                        },
                    ]);
                    expect(res).to.have.styleRules({
                        1: '.entry__my-class.entry---state1-4-blah {}',
                    });
                });

                it('should warn when trying to use an unknown number validator', () => {
                    const config = {
                        entry: `/entry.st.css`,
                        files: {
                            '/entry.st.css': {
                                namespace: 'entry',
                                content: `
                                .my-class {
                                    |-st-states: $state1( number( missing() ))$|;
                                }
                                `,
                            },
                        },
                    };

                    expectWarningsFromTransform(config, [
                        {
                            message: [
                                'pseudo-state "state1" default value "" failed validation:',
                                'encountered unknown number validator "missing"',
                            ].join('\n'),
                            file: '/entry.st.css',
                        },
                    ]);
                });

                describe('specific validators', () => {
                    it('should warn on invalid min validator', () => {
                        const config = {
                            entry: `/entry.st.css`,
                            files: {
                                '/entry.st.css': {
                                    namespace: 'entry',
                                    content: `
                                    .my-class{
                                        -st-states: state1(number(min(3)));
                                    }
                                    |.my-class:state1(1)| {}
                                    `,
                                },
                            },
                        };

                        const res = expectWarningsFromTransform(config, [
                            {
                                message: [
                                    'pseudo-state "state1" with parameter "1" failed validation:',
                                    'expected "1" to be larger than or equal to 3',
                                ].join('\n'),
                                file: '/entry.st.css',
                            },
                        ]);
                        expect(res).to.have.styleRules({
                            1: '.entry__my-class[class~="entry---state1-1-1"] {}',
                        });
                    });

                    it('should warn on invalid max validator', () => {
                        const config = {
                            entry: `/entry.st.css`,
                            files: {
                                '/entry.st.css': {
                                    namespace: 'entry',
                                    content: `
                                    .my-class{
                                        -st-states: state1(number(max(5)));
                                    }
                                    |.my-class:state1(42)| {}
                                    `,
                                },
                            },
                        };

                        const res = expectWarningsFromTransform(config, [
                            {
                                message: [
                                    'pseudo-state "state1" with parameter "42" failed validation:',
                                    'expected "42" to be lesser then or equal to 5',
                                ].join('\n'),
                                file: '/entry.st.css',
                            },
                        ]);
                        expect(res).to.have.styleRules({
                            1: '.entry__my-class[class~="entry---state1-2-42"] {}',
                        });
                    });

                    it('should warn on invalid multipleOf validator', () => {
                        const config = {
                            entry: `/entry.st.css`,
                            files: {
                                '/entry.st.css': {
                                    namespace: 'entry',
                                    content: `
                                    .my-class{
                                        -st-states: state1(number(multipleOf(5)));
                                    }
                                    |.my-class:state1(42)| {}
                                    `,
                                },
                            },
                        };

                        const res = expectWarningsFromTransform(config, [
                            {
                                message: [
                                    'pseudo-state "state1" with parameter "42" failed validation:',
                                    'expected "42" to be a multiple of 5',
                                ].join('\n'),
                                file: '/entry.st.css',
                            },
                        ]);
                        expect(res).to.have.styleRules({
                            1: '.entry__my-class[class~="entry---state1-2-42"] {}',
                        });
                    });

                    it('should not warn on valid min/max/multipleOf validator', () => {
                        const config = {
                            entry: `/entry.st.css`,
                            files: {
                                '/entry.st.css': {
                                    namespace: 'entry',
                                    content: `
                                    .my-class{
                                        -st-states: state1(number(min(3), max(100), multipleOf(5)));
                                    }
                                    |.my-class:state1(40)| {}
                                    `,
                                },
                            },
                        };

                        const res = expectWarningsFromTransform(config, []);
                        expect(res).to.have.styleRules({
                            1: '.entry__my-class[class~="entry---state1-2-40"] {}',
                        });
                    });
                });
            });

            describe('enum', () => {
                describe('definition', () => {
                    it('should warn when an enum is defined with no options', () => {
                        const config = {
                            entry: `/entry.st.css`,
                            files: {
                                '/entry.st.css': {
                                    namespace: 'entry',
                                    content: `
                                    .my-class {
                                        |-st-states: size( enum() )|;
                                    }
                                    `,
                                },
                            },
                        };

                        expectWarningsFromTransform(config, [
                            {
                                message: [
                                    'pseudo-state "size" default value "" failed validation:',
                                    'expected enum to be defined with one option or more',
                                ].join('\n'),
                                file: '/entry.st.css',
                            },
                        ]);
                    });

                    it('should warn when a default value does not equal one of the options provided', () => {
                        const config = {
                            entry: `/entry.st.css`,
                            files: {
                                '/entry.st.css': {
                                    namespace: 'entry',
                                    content: `
                                    .my-class {
                                        |-st-states: $size( enum(small, large)) huge$|;
                                    }
                                    `,
                                },
                            },
                        };

                        expectWarningsFromTransform(config, [
                            {
                                message: [
                                    'pseudo-state "size" default value "huge" failed validation:',
                                    'expected "huge" to be one of the options: "small, large"',
                                ].join('\n'),
                                file: '/entry.st.css',
                            },
                        ]);
                    });
                });

                it('should transform enum validator', () => {
                    const res = generateStylableResult({
                        entry: `/entry.st.css`,
                        files: {
                            '/entry.st.css': {
                                namespace: 'entry',
                                content: `
                                .my-class {
                                    -st-states: size( enum(small, large) );
                                }
                                .my-class:size(small) {}
                                `,
                            },
                        },
                    });

                    expect(
                        res.meta.diagnostics.reports,
                        'no diagnostics reported for native states'
                    ).to.eql([]);
                    expect(res).to.have.styleRules({
                        1: '.entry__my-class.entry---size-5-small {}',
                    });
                });

                it('should transform enum validator with variables in definition and usage', () => {
                    const res = generateStylableResult({
                        entry: `/entry.st.css`,
                        files: {
                            '/entry.st.css': {
                                namespace: 'entry',
                                content: `
                                :vars {
                                    small: small;
                                    large: large;
                                }
                                .my-class {
                                    -st-states: size( enum( value(small), value(large) ) );
                                }
                                .my-class:size(value(small)) {}
                                `,
                            },
                        },
                    });

                    expect(
                        res.meta.diagnostics.reports,
                        'no diagnostics reported for native states'
                    ).to.eql([]);
                    expect(res).to.have.styleRules({
                        1: '.entry__my-class.entry---size-5-small {}',
                    });
                });

                it('should warn when a value does not match any of the enum options', () => {
                    const config = {
                        entry: `/entry.st.css`,
                        files: {
                            '/entry.st.css': {
                                namespace: 'entry',
                                content: `
                                .my-class {
                                    -st-states: size( enum(small, large) );
                                }
                                |.my-class:size(huge)| {}
                                `,
                            },
                        },
                    };

                    const res = expectWarningsFromTransform(config, [
                        {
                            message: [
                                'pseudo-state "size" with parameter "huge" failed validation:',
                                'expected "huge" to be one of the options: "small, large"',
                            ].join('\n'),
                            file: '/entry.st.css',
                        },
                    ]);
                    expect(res).to.have.styleRules({
                        1: '.entry__my-class.entry---size-4-huge {}',
                    });
                });
            });

            describe('tag', () => {
                it('should transform tag validator', () => {
                    const res = generateStylableResult({
                        entry: `/entry.st.css`,
                        files: {
                            '/entry.st.css': {
                                namespace: 'entry',
                                content: `
                                .my-class {
                                    -st-states: category( tag );
                                }
                                .my-class:category(movie) {}
                                `,
                            },
                        },
                    });

                    expect(
                        res.meta.diagnostics.reports,
                        'no diagnostics reported for native states'
                    ).to.eql([]);
                    expect(res).to.have.styleRules({
                        1: '.entry__my-class.entry---category-5-movie {}',
                    });
                });

                it('should transform tag validator with a variable in its usage', () => {
                    const res = generateStylableResult({
                        entry: `/entry.st.css`,
                        files: {
                            '/entry.st.css': {
                                namespace: 'entry',
                                content: `
                                :vars {
                                    category: disco;
                                }
                                .my-class {
                                    -st-states: category( tag() );
                                }
                                .my-class:category(value(category)) {}
                                `,
                            },
                        },
                    });

                    expect(
                        res.meta.diagnostics.reports,
                        'no diagnostics reported for native states'
                    ).to.eql([]);
                    expect(res).to.have.styleRules({
                        1: '.entry__my-class.entry---category-5-disco {}',
                    });
                });

                it('should warn when a value includes a space', () => {
                    const config = {
                        entry: `/entry.st.css`,
                        files: {
                            '/entry.st.css': {
                                namespace: 'entry',
                                content: `
                                .my-class {
                                    -st-states: category( tag );
                                }
                                |.my-class:category($one two$)| {}
                                `,
                            },
                        },
                    };

                    const res = expectWarningsFromTransform(config, [
                        {
                            message: [
                                'pseudo-state "category" with parameter "one two" failed validation:',
                                'expected "one two" to be a single value with no spaces',
                            ].join('\n'),
                            file: '/entry.st.css',
                        },
                    ]);
                    expect(res).to.have.styleRules({
                        1: '.entry__my-class[class~="entry---category-7-one_two"] {}',
                    });
                });
            });
        });

        describe('custom mapping', () => {
            it('should transform any quoted string (trimmed)', () => {
                const res = generateStylableResult({
                    entry: `/entry.st.css`,
                    files: {
                        '/entry.st.css': {
                            namespace: 'entry',
                            content: `
                            .my-class {
                                -st-states: my-state('.X'), my-other-state("  .y[data-z=\\"value\\"]  ");
                            }
                            .my-class:my-state {}
                            .my-class:my-other-state {}
                            `,
                        },
                    },
                });

                expect(res).to.have.styleRules({
                    1: '.entry__my-class.X {}',
                    2: '.entry__my-class.y[data-z="value"] {}',
                });
            });

            it('should not transform any internal state look-alike', () => {
                const res = generateStylableResult({
                    entry: `/entry.st.css`,
                    files: {
                        '/entry.st.css': {
                            namespace: 'entry',
                            content: `
                                .root {
                                    -st-states: open(":not(:focus-within):not(:hover)");
                                }
                                .root:open {}
                            `,
                        },
                    },
                });

                expect(res).to.have.styleRules({
                    1: '.entry__root:not(:focus-within):not(:hover) {}',
                });
            });
        });

        describe('inheritance', () => {
            it('should resolve extended type state', () => {
                const res = generateStylableResult({
                    entry: `/entry.st.css`,
                    files: {
                        '/entry.st.css': {
                            namespace: 'entry',
                            content: `
                                :import {
                                    -st-from: "./inner.st.css";
                                    -st-default: Inner;
                                }
                                .my-class {
                                    -st-extends: Inner;
                                }
                                .my-class:my-state {}
                            `,
                        },
                        '/inner.st.css': {
                            namespace: 'inner',
                            content: `
                                .root {
                                    -st-states: my-state;
                                }
                            `,
                        },
                    },
                });

                expect(
                    res.meta.diagnostics.reports,
                    'no diagnostics reported for imported states'
                ).to.eql([]);
                expect(res).to.have.styleRules({
                    1: '.entry__my-class.inner--my-state {}',
                });
            });

            it('should resolve override type state', () => {
                const res = generateStylableResult({
                    entry: `/entry.st.css`,
                    files: {
                        '/entry.st.css': {
                            namespace: 'entry',
                            content: `
                                :import {
                                    -st-from: "./extended-state.st.css";
                                    -st-default: ExtendedState;
                                }
                                :import {
                                    -st-from: "./proxy-state.st.css";
                                    -st-default: ProxyState;
                                }
                                .direct {
                                    -st-extends: ExtendedState;
                                    -st-states: my-state;
                                }
                                .proxy {
                                    -st-extends: ProxyState;
                                    -st-states: my-state;
                                }
                                .direct:my-state {}
                                .proxy:my-state {}
                            `,
                        },
                        '/proxy-state.st.css': {
                            namespace: 'proxyState',
                            content: `
                                :import {
                                    -st-from: "./inner.st.css";
                                    -st-default: ExtendedState;
                                }
                                .root {
                                    -st-extends: ExtendedState;
                                }
                            `,
                        },
                        '/extended-state.st.css': {
                            namespace: 'extendedState',
                            content: `
                                .root {
                                    -st-states: my-state;
                                }
                            `,
                        },
                    },
                });

                expect(res).to.have.styleRules({
                    2: '.entry__direct.entry--my-state {}',
                    3: '.entry__proxy.entry--my-state {}',
                });
            });

            it('state lookup when exported as element', () => {
                const result = generateStylableResult({
                    entry: `/entry.st.css`,
                    files: {
                        '/entry.st.css': {
                            namespace: 'entry',
                            content: `
                                :import{
                                    -st-from: "./index.st.css";
                                    -st-named: Element;
                                }
                                .root Element:disabled{}
                            `,
                        },
                        '/index.st.css': {
                            namespace: 'index',
                            content: `
                                :import{
                                    -st-from: "./element.st.css";
                                    -st-default: Element;
                                }
                                .root Element{}
                            `,
                        },
                        '/element.st.css': {
                            namespace: 'element',
                            content: `
                                .root {
                                    -st-states: disabled;
                                }
                            `,
                        },
                    },
                });

                expect(
                    result.meta.diagnostics.reports,
                    'no diagnostics reported for imported states'
                ).to.eql([]);
                expect(result).to.have.styleRules({
                    0: '.entry__root .element__root.element--disabled{}',
                });
            });

            it('should resolve state of pseudo-element', () => {
                const res = generateStylableResult({
                    entry: `/entry.st.css`,
                    files: {
                        '/entry.st.css': {
                            namespace: 'entry',
                            content: `
                                :import {
                                    -st-from: "./imported.st.css";
                                    -st-default: Imported;
                                }
                                .local {
                                    -st-extends: Imported;
                                }
                                .local::inner:my-state {}
                                Imported::inner:my-state {}
                            `,
                        },
                        '/imported.st.css': {
                            namespace: 'imported',
                            content: `
                                .inner {
                                    -st-states: my-state;
                                }
                            `,
                        },
                    },
                });

                expect(res).to.have.styleRules({
                    1: '.entry__local .imported__inner.imported--my-state {}',
                    2: '.imported__root .imported__inner.imported--my-state {}',
                });
            });

            it('should resolve state from pseudo-element that inherits the state ', () => {
                const res = generateStylableResult({
                    entry: `/entry.st.css`,
                    files: {
                        '/entry.st.css': {
                            namespace: 'entry',
                            content: `
                                :import{
                                    -st-from: "./type.st.css";
                                    -st-default: Type;
                                }
                                .my-class {
                                    -st-extends: Type;
                                }
                                .my-class::element:my-state {}
                            `,
                        },
                        '/type.st.css': {
                            namespace: 'type',
                            content: `
                                :import {
                                    -st-from: "./with-state.st.css";
                                    -st-default: WithState;
                                }
                                .element {
                                    -st-extends: WithState;
                                }
                            `,
                        },
                        '/with-state.st.css': {
                            namespace: 'withState',
                            content: `
                                .root {
                                    -st-states: my-state;
                                }
                            `,
                        },
                    },
                });

                expect(res).to.have.styleRules({
                    1: '.entry__my-class .type__element.withState--my-state {}',
                });
            });
        });

        describe('@media', () => {
            it('handle scoping inside media queries', () => {
                const res = generateStylableResult({
                    entry: `/entry.st.css`,
                    files: {
                        '/entry.st.css': {
                            namespace: 'entry',
                            content: `
                                @media (max-width: 300px) {
                                    .my-class {
                                        -st-states: my-state;
                                    }
                                    .my-class:my-state {}
                                }
                            `,
                        },
                    },
                });

                expect(res).to.have.mediaQuery(0).with.styleRules({
                    1: '.entry__my-class.entry--my-state {}',
                });
            });
        });

        describe('extends local root with states', () => {
            it('resolve states from extended local root', () => {
                const result = generateStylableResult({
                    entry: `/entry.st.css`,
                    files: {
                        '/entry.st.css': {
                            namespace: 'entry',
                            content: `
                                .root {
                                    -st-states: disabled;
                                }

                                .x {
                                    -st-extends: root;
                                }

                                .x:disabled {}
                            `,
                        },
                    },
                });

                expect(
                    result.meta.diagnostics.reports,
                    'no diagnostics reported for imported states'
                ).to.eql([]);
                expect(result).to.have.styleRules({
                    2: '.entry__x.entry--disabled {}',
                });
            });

            it('resolve states from extended local class', () => {
                const result = generateStylableResult({
                    entry: `/entry.st.css`,
                    files: {
                        '/entry.st.css': {
                            namespace: 'entry',
                            content: `
                                .y {
                                    -st-states: disabled;
                                }

                                .x {
                                    -st-extends: y;
                                }

                                .x:disabled {}
                            `,
                        },
                    },
                });

                expect(
                    result.meta.diagnostics.reports,
                    'no diagnostics reported for imported states'
                ).to.eql([]);
                expect(result).to.have.styleRules({
                    2: '.entry__x.entry--disabled {}',
                });
            });
        });

        describe('state after pseudo-element', () => {
            it('transform states after pseudo-element that extends states', () => {
                const result = generateStylableResult({
                    entry: `/entry.st.css`,
                    files: {
                        '/entry.st.css': {
                            namespace: 'entry',
                            content: `
                                :import {
                                    -st-from: "./menu.st.css";
                                    -st-default: Menu;
                                }

                                .menu1 {
                                    -st-extends: Menu;
                                }

                                .menu1::button:state {} /*TEST_SUBJECT*/
                            `,
                        },
                        '/menu.st.css': {
                            namespace: 'menu',
                            content: `
                                :import {
                                    -st-from: "./button.st.css";
                                    -st-default: Button;
                                }
                                .button {
                                    -st-extends: Button;
                                    -st-states: state;
                                }
                            `,
                        },
                        '/button.st.css': {
                            namespace: 'button',
                            content: ``,
                        },
                    },
                });

                // result.meta.outputAst.toString();
                expect(
                    result.meta.diagnostics.reports,
                    'no diagnostics reported for imported states'
                ).to.eql([]);
                expect(result).to.have.styleRules({
                    1: '.entry__menu1 .menu__button.menu--state {}',
                });
            });
        });
    });

    describe('diagnostics', () => {
        // TODO: Add warning implementation
        xit('should return warning for state without selector', () => {
            expectWarnings(
                `
                |:hover|{

                }
            `,
                [
                    {
                        message: 'global states are not supported, use .root:hover instead',
                        file: 'main.css',
                    },
                ]
            );
        });

        it('should trigger a warning when trying to target an unknown state and keep the state', () => {
            const config = {
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `|.root:$unknownState$|{}`,
                    },
                },
            };

            const res = expectWarningsFromTransform(config, [
                { message: stateErrors.UNKNOWN_STATE_USAGE('unknownState'), file: '/entry.st.css' },
            ]);
            expect(res, 'keep unknown state').to.have.styleRules([`.entry__root:unknownState{}`]);
        });

        it('should warn when defining states in complex selector', () => {
            // TODO: add more complex scenarios
            expectWarnings(
                `
                .gaga:hover {
                    |-st-states|:shmover;
                }
            `,
                [
                    {
                        message: 'cannot define pseudo states inside complex selectors',
                        file: 'main.css',
                    },
                ]
            );
        });

        it('should warn when defining a state inside an element selector', () => {
            expectWarnings(
                `
                MyElement {
                    |-st-states|:shmover;
                }
            `,
                [
                    // skipping root scoping warning
                    {
                        message: processorWarnings.UNSCOPED_ELEMENT('MyElement'),
                        file: 'main.css',
                        skip: true,
                    },
                    {
                        message: 'cannot define pseudo states inside element selectors',
                        file: 'main.css',
                    },
                ]
            );
        });

        it('should warn when overriding class states', () => {
            expectWarnings(
                `
                .root {
                    -st-states: mystate;
                }
                .root {
                    |-st-states: mystate2;|
                }
            `,
                [{ message: 'override "-st-states" on typed rule "root"', file: 'main.css' }]
            );
        });

        it('should warn when defining a state starting with a "-"', () => {
            expectWarnings(
                `
                .root {
                    |-st-states: $-someState$|;
                }
            `,
                [
                    {
                        message: stateErrors.STATE_STARTS_WITH_HYPHEN('-someState'),
                        file: 'main.css',
                        severity: 'error',
                    },
                ]
            );
        });

        // TODO: test for case insensitivity in validators

        // it('should check for state name collision in the same definition', () => {});

        // it('should check for type collision in states with the same name', () => {});
    });
});
