import { expect, use } from 'chai';
import chaiSubset = require('chai-subset');
import * as postcss from 'postcss';
import { valueMapping } from '../src/index';
import { nativeFunctionsDic, nativePseudoClasses } from '../src/native-reserved-lists';
import { mediaQuery, styleRules } from './matchers/results';
import { expectWarnings, expectWarningsFromTransform } from './utils/diagnostics';
import { generateStylableResult, generateStylableRoot, processSource } from './utils/generate-test-util';

const valueParser = require('postcss-value-parser');

use(chaiSubset); // move all of these to a central place
use(styleRules);
use(mediaQuery);

// testing concerns for feature
// - states belonging to an extended class (multi level)
// - lookup order

describe('pseudo-states', () => {

    describe('process', () => {
        // What does it do?
        // Works in the scope of a single file, collecting state definitions for later usage

        describe('boolean', () => {

            it('should collect state definitions as null (for boolean)', () => {
                const { classes, diagnostics } = processSource(`
                    .root {
                        -st-states: state1, state2;
                    }
                `, { from: 'path/to/style.css' });

                expect(diagnostics.reports.length, 'no reports').to.eql(0);
                expect(classes).to.flatMatch({
                    root: {
                        [valueMapping.states]: {
                            state1: null,
                            state2: null
                        }
                    }
                });
            });

        });

        describe('advanced type', () => {

            describe('string', () => {

                it('as a simple validator', () => {
                    const res = processSource(`
                        .root {
                            -st-states: state1(string);
                        }
                    `, { from: 'path/to/style.css' });

                    expect(res.diagnostics.reports.length, 'no reports').to.eql(0);

                    expect(res.classes).to.containSubset({
                        root: {
                            [valueMapping.states]: {
                                state1: {
                                    type: 'string'
                                }

                            }
                        }
                    });
                });

                it('as a validation type with no nested validations', () => {
                    const res = processSource(`
                        .root {
                            -st-states: state1(string());
                        }
                    `, { from: 'path/to/style.css' });

                    expect(res.diagnostics.reports.length, 'no reports').to.eql(0);

                    expect(res.classes).to.containSubset({
                        root: {
                            [valueMapping.states]: {
                                state1: {
                                    type: 'string'
                                }
                            }
                        }
                    });
                });

                it('including a default value', () => {
                    const res = processSource(`
                        .root {
                            -st-states: state1(string) some Default String;
                        }
                    `, { from: 'path/to/style.css' });

                    expect(res.diagnostics.reports.length, 'no reports').to.eql(0);
                    expect(res.classes).to.containSubset({
                        root: {
                            [valueMapping.states]: {
                                state1: {
                                    defaultValue: 'some Default String',
                                    type: 'string'
                                }
                            }
                        }
                    });
                });

                it('with a regex validator', () => {
                    const res = processSource(`
                        .root {
                            -st-states: state1(string("^user"));
                        }
                    `, { from: 'path/to/style.css' });

                    expect(res.diagnostics.reports.length, 'no reports').to.eql(0);

                    expect(res.classes).to.containSubset({
                        root: {
                            [valueMapping.states]: {
                                state1: {
                                    type: 'string',
                                    arguments: ['^user']
                                }
                            }
                        }
                    });
                });

                it('with a single nested validator', () => {
                    const res = processSource(`
                        .root {
                            -st-states: state1(string(minLength(2)));
                        }
                    `, { from: 'path/to/style.css' });

                    expect(res.diagnostics.reports.length, 'no reports').to.eql(0);

                    expect(res.classes).to.containSubset({
                        root: {
                            [valueMapping.states]: {
                                state1: {
                                    type: 'string',
                                    arguments: [
                                        {
                                            name: 'minLength',
                                            args: ['2']
                                        }
                                    ]
                                }
                            }
                        }
                    });
                });

                it('with multiple validators', () => {
                    // this test also shows that all validator params are treated as strings
                    const res = processSource(`
                        .root {
                            -st-states: state1(string(minLength(2), maxLength("7")));
                        }
                    `, { from: 'path/to/style.css' });

                    expect(res.diagnostics.reports.length, 'no reports').to.eql(0);

                    expect(res.classes).to.containSubset({
                        root: {
                            [valueMapping.states]: {
                                state1: {
                                    type: 'string',
                                    arguments: [
                                        {
                                            name: 'minLength',
                                            args: ['2']
                                        },
                                        {
                                            name: 'maxLength',
                                            args: ['7']
                                        }
                                    ]
                                }
                            }
                        }
                    });
                });

                it('with a nested validator and a regex validator', () => {
                    const res = processSource(`
                        .root {
                            -st-states: state1(string("^user", contains(user)));
                        }
                    `, { from: 'path/to/style.css' });

                    expect(res.diagnostics.reports.length, 'no reports').to.eql(0);

                    expect(res.classes).to.containSubset({
                        root: {
                            [valueMapping.states]: {
                                state1: {
                                    type: 'string',
                                    arguments: [
                                        '^user',
                                        {
                                            name: 'contains',
                                            args: ['user']
                                        }
                                    ]
                                }
                            }
                        }
                    });
                });
            });

            describe('number', () => {
                it('as a simple validator', () => {
                    const res = processSource(`
                        .root {
                            -st-states: state1(number), state2(number());
                        }
                    `, { from: 'path/to/style.css' });

                    expect(res.diagnostics.reports.length, 'no reports').to.eql(0);

                    expect(res.classes).to.containSubset({
                        root: {
                            [valueMapping.states]: {
                                state1: {
                                    type: 'number'
                                },
                                state2: {
                                    type: 'number'
                                }
                            }
                        }
                    });
                });

                it('including a default value', () => {
                    const res = processSource(`
                        .root {
                            -st-states: state1(number) 7;
                        }
                    `, { from: 'path/to/style.css' });

                    expect(res.diagnostics.reports.length, 'no reports').to.eql(0);
                    expect(res.classes).to.containSubset({
                        root: {
                            [valueMapping.states]: {
                                state1: {
                                    defaultValue: '7',
                                    type: 'number'
                                }
                            }
                        }
                    });
                });
            });

            describe('enum', () => {
                it('as a simple validator', () => {
                    const res = processSource(`
                        .root {
                            -st-states: size(enum(small, medium, large)), color(enum(red, green, blue));
                        }
                    `, { from: 'path/to/style.css' });

                    expect(res.diagnostics.reports.length, 'no reports').to.eql(0);

                    expect(res.classes).to.containSubset({
                        root: {
                            [valueMapping.states]: {
                                size: {
                                    type: 'enum',
                                    arguments: ['small', 'medium', 'large']
                                },
                                color: {
                                    type: 'enum',
                                    arguments: ['red', 'green', 'blue']
                                }
                            }
                        }
                    });
                });

                it('including a default value', () => {
                    const res = processSource(`
                        .root {
                            -st-states: size(enum(small, large)) small;
                        }
                    `, { from: 'path/to/style.css' });

                    expect(res.diagnostics.reports.length, 'no reports').to.eql(0);
                    expect(res.classes).to.containSubset({
                        root: {
                            [valueMapping.states]: {
                                size: {
                                    defaultValue: 'small',
                                    type: 'enum',
                                    arguments: ['small', 'large']
                                }
                            }
                        }
                    });
                });
            });
        });

        describe('custom mapping', () => {

            it('collect typed classes with mapping states', () => {
                const res = processSource(`
                    .root {
                        -st-states: state1, state2("[data-mapped]");
                    }
                `, { from: 'path/to/style.css' });

                expect(res.diagnostics.reports.length, 'no reports').to.eql(0);
                expect(res.classes).to.flatMatch({
                    root: {
                        [valueMapping.states]: {
                            state1: null, // boolean
                            state2: '[data-mapped]'
                        }
                    }
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
                                content: `.root:${nativeClass}{}`
                            }
                        }
                    });

                    expect(res).to.have.styleRules([`.entry--root:${nativeClass}{}`]);
                    expect(res.meta.diagnostics.reports, 'no diagnostics reported for native states').to.eql([]);
                });
            });

        });

        describe('boolean', () => {

            it('should transfrom to lowercase stylable data-attribute selector [data-NS-state]', () => {
                const res = generateStylableResult({
                    entry: `/entry.st.css`,
                    files: {
                        '/entry.st.css': {
                            namespace: 'entry',
                            content: `
                            .my-class {
                                -st-states: state1, State2;
                            }
                            .my-class:state1 {}
                            .my-class:State2 {}
                            `
                        }
                    }
                });

                expect(res.meta.diagnostics.reports, 'no diagnostics reported for native states').to.eql([]);
                expect(res).to.have.styleRules({
                    1: '.entry--my-class[data-entry-state1] {}',
                    2: '.entry--my-class[data-entry-state2] {}'
                });
            });

            it('should transfrom to lowercase stylable data-attribute selector [data-NS-state]', () => {
                const res = generateStylableResult({
                    entry: `/entry.st.css`,
                    files: {
                        '/entry.st.css': {
                            namespace: 'entry',
                            content: `
                            .my-class {
                                -st-states: state1, State2;
                            }
                            .my-class:state1 {}
                            .my-class:State2 {}
                            `
                        }
                    }
                });

                expect(res.meta.diagnostics.reports, 'no diagnostics reported for native states').to.eql([]);
                expect(res).to.have.styleRules({
                    1: '.entry--my-class[data-entry-state1] {}',
                    2: '.entry--my-class[data-entry-state2] {}'
                });
            });

            it('should resolve nested pseudo-states', () => {
                const res = generateStylableResult({
                    entry: '/entry.st.css',
                    usedFiles: [
                        '/entry.st.css'
                    ],
                    files: {
                        '/entry.st.css': {
                            namespace: 'entry',
                            content: `
                                .root {
                                     -st-states: state1;
                                }
                                .root:not(:state1) {}
                            `
                        }
                    }
                });

                expect(res.meta.diagnostics.reports, 'no diagnostics reported for native states').to.eql([]);
                expect(res).to.have.styleRules({
                    1: '.entry--root:not([data-entry-state1]) {}'
                });
            });

        });

        describe('advanced type / validation', () => {

            describe('string', () => {

                it('should transform string validator', () => {
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
                                `
                            }
                        }
                    });

                    expect(res.meta.diagnostics.reports, 'no diagnostics reported for native states').to.eql([]);
                    expect(res).to.have.styleRules({
                        1: '.entry--my-class[data-entry-state1="someString"] {}'
                    });
                });

                it('should support default values for string validator', () => {
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
                                `
                            }
                        }
                    });

                    expect(res.meta.diagnostics.reports, 'no diagnostics reported for native states').to.eql([]);
                    expect(res).to.have.styleRules({
                        1: '.entry--my-class[data-entry-statewithdefault="myDefault String"] {}'
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
                                `
                            }
                        }
                    });

                    expect(res.meta.diagnostics.reports, 'no diagnostics reported for native states').to.eql([]);
                    expect(res).to.have.styleRules({
                        1: '.entry--my-class[data-entry-statewithdefault="username"] {}'
                    });
                });

                // TODO: test for case insensitivity in validators

                describe('specific validators', () => {
                    it('should transform string using a valid regex validation', () => {
                        const res = generateStylableResult({
                            entry: `/entry.st.css`,
                            files: {
                                '/entry.st.css': {
                                    namespace: 'entry',
                                    content: `
                                    .my-class {
                                        -st-states: state1( string("^user") );
                                    }
                                    .my-class:state1(userName) {}
                                    `
                                }
                            }
                        });

                        expect(res.meta.diagnostics.reports, 'no diagnostics reported for native states').to.eql([]);
                        expect(res).to.have.styleRules({
                            1: '.entry--my-class[data-entry-state1="userName"] {}'
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
                                        -st-states: state1( string("^user") );
                                    }
                                    |.my-class:state1(failingParameter)| {}
                                    `
                                }
                            }
                        };

                        const res = expectWarningsFromTransform(config, [{
                            // tslint:disable-next-line:max-line-length
                            message: 'pseudo-state "state1" with parameter "failingParameter" failed validation:\n - string type failed regex "^user" validation with: "failingParameter"',
                            file: '/entry.st.css'
                        }]);
                        expect(res).to.have.styleRules({
                            1: '.entry--my-class[data-entry-state1="failingParameter"] {}'
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
                                    `
                                }
                            }
                        });

                        expect(res.meta.diagnostics.reports, 'no diagnostics reported for native states').to.eql([]);
                        expect(res).to.have.styleRules({
                            1: '.entry--my-class[data-entry-state1="userName"] {}'
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
                                    `
                                }
                            }
                        });

                        expect(res.meta.diagnostics.reports, 'no diagnostics reported for native states').to.eql([]);
                        expect(res).to.have.styleRules({
                            1: '.entry--my-class[data-entry-state1="userName"] {}'
                        });
                    });

                    // tslint:disable-next-line:max-line-length
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
                                    `
                                }
                            }
                        };

                        const res = expectWarningsFromTransform(config, [{
                            // tslint:disable-next-line:max-line-length
                            message: 'pseudo-state "state1" with parameter "wrongState" failed validation:\n - parameter "wrongState" of type string should contain string: "user"',
                            file: '/entry.st.css'
                        }]);
                        expect(res).to.have.styleRules({
                            1: '.entry--my-class[data-entry-state1="wrongState"] {}'
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
                                        -st-states: state1(string("^user", minLength(3), maxLength(5)));
                                    }
                                    .my-class:state1(user) {}
                                    `
                                }
                            }
                        });

                        expect(res.meta.diagnostics.reports, 'no diagnostics reported for native states').to.eql([]);
                        expect(res).to.have.styleRules({
                            1: '.entry--my-class[data-entry-state1="user"] {}'
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
                                    `
                                }
                            }
                        };

                        const res = expectWarningsFromTransform(config, [{
                            // tslint:disable-next-line:max-line-length
                            message: 'pseudo-state "state1" with parameter "user" failed validation:\n - parameter "user" failed min length (7) validation',
                            file: '/entry.st.css'
                        }]);
                        expect(res).to.have.styleRules({
                            1: '.entry--my-class[data-entry-state1="user"] {}'
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
                                    `
                                }
                            }
                        };

                        const res = expectWarningsFromTransform(config, [{
                            // tslint:disable-next-line:max-line-length
                            message: 'pseudo-state "state1" with parameter "user" failed validation:\n - parameter "user" failed max length (3) validation',
                            file: '/entry.st.css'
                        }]);
                        expect(res).to.have.styleRules({
                            1: '.entry--my-class[data-entry-state1="user"] {}'
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
                                        -st-states: state1(string(maxLength(3), "^case"));
                                    }
                                    |.my-class:state1($user$)| {}
                                    `
                                }
                            }
                        };

                        const res = expectWarningsFromTransform(config, [{
                            // tslint:disable-next-line:max-line-length
                            message: 'pseudo-state "state1" with parameter "user" failed validation:\n - parameter "user" failed max length (3) validation\n - string type failed regex "^case" validation with: "user"',
                            file: '/entry.st.css'
                        }]);
                        expect(res).to.have.styleRules({
                            1: '.entry--my-class[data-entry-state1="user"] {}'
                        });
                    });

                    it('should warn when trying to use an unknown string validator', () => {
                        // TODO: test -st-states and not usage
                        const config = {
                            entry: `/entry.st.css`,
                            files: {
                                '/entry.st.css': {
                                    namespace: 'entry',
                                    content: `
                                    .my-class {
                                        -st-states: state1(string(missing(someValue)));
                                    }
                                    |.my-class:state1($passedValue$)| {}
                                    `
                                }
                            }
                        };

                        const res = expectWarningsFromTransform(config, [
                            // tslint:disable-next-line:max-line-length
                            { message: 'pseudo-state invoked unknown string validator "missing(someValue)" with "passedValue"', file: '/entry.st.css' }
                        ]);
                        expect(res).to.have.styleRules({
                            1: '.entry--my-class[data-entry-state1="passedValue"] {}'
                        });
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
                                `
                            }
                        }
                    });

                    expect(res.meta.diagnostics.reports, 'no diagnostics reported for native states').to.eql([]);
                    expect(res).to.have.styleRules({
                        1: '.entry--my-class[data-entry-state1="42"] {}'
                    });
                });

                it('should warn when a non-number default value is invoked', () => {
                    const config = { // TODO: change testing flow to test during definition not usage
                        entry: `/entry.st.css`,
                        files: {
                            '/entry.st.css': {
                                namespace: 'entry',
                                content: `
                                .my-class{
                                    -st-states: state1(number) defaultBlah;
                                }
                                |.my-class:$state1$| {}
                                `
                            }
                        }
                    };

                    const res = expectWarningsFromTransform(config, [{
                        message: 'pseudo-state value "defaultBlah" does not match type "number" of "state1"',
                        file: '/entry.st.css'
                    }]);
                    expect(res).to.have.styleRules({
                        1: '.entry--my-class[data-entry-state1="defaultBlah"] {}'
                    });
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
                                `
                            }
                        }
                    };

                    const res = expectWarningsFromTransform(config, [{
                        // tslint:disable-next-line:max-line-length
                        message: 'pseudo-state "state1" with parameter "blah" failed validation:\n - "blah" should be of type number but failed validation',
                        file: '/entry.st.css'
                    }]);
                    expect(res).to.have.styleRules({
                        1: '.entry--my-class[data-entry-state1="blah"] {}'
                    });
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
                                    `
                                }
                            }
                        };

                        const res = expectWarningsFromTransform(config, [{
                            // tslint:disable-next-line:max-line-length
                            message: 'pseudo-state "state1" with parameter "1" failed validation:\n - parameter "1" failed min(3) validation',
                            file: '/entry.st.css'
                        }
                        ]);
                        expect(res).to.have.styleRules({
                            1: '.entry--my-class[data-entry-state1="1"] {}'
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
                                    `
                                }
                            }
                        };

                        const res = expectWarningsFromTransform(config, [{
                            // tslint:disable-next-line:max-line-length
                            message: 'pseudo-state "state1" with parameter "42" failed validation:\n - parameter "42" failed max(5) validation',
                            file: '/entry.st.css'
                        }
                        ]);
                        expect(res).to.have.styleRules({
                            1: '.entry--my-class[data-entry-state1="42"] {}'
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
                                    `
                                }
                            }
                        };

                        const res = expectWarningsFromTransform(config, [{
                            // tslint:disable-next-line:max-line-length
                            message: 'pseudo-state "state1" with parameter "42" failed validation:\n - parameter "42" should be a multiple of 5',
                            file: '/entry.st.css'
                        }
                        ]);
                        expect(res).to.have.styleRules({
                            1: '.entry--my-class[data-entry-state1="42"] {}'
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
                                    `
                                }
                            }
                        };

                        const res = expectWarningsFromTransform(config, []);
                        expect(res).to.have.styleRules({
                            1: '.entry--my-class[data-entry-state1="40"] {}'
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
                                    .my-class:size(huge) {}
                                    `
                                }
                            }
                        };

                        const res = expectWarningsFromTransform(config, [{
                            // tslint:disable-next-line:max-line-length
                            message: [
                                'pseudo-state "size" with parameter "huge" failed validation:',
                                'pseudo-state definition must include at least one option'
                            ].join('\n'),
                            file: '/entry.st.css'
                        }]);
                        expect(res).to.have.styleRules({
                            1: '.entry--my-class[data-entry-size="huge"] {}'
                        });
                    });

                    it('should warn when a default value does not equal one of the options provided', () => {
                        const config = {
                            entry: `/entry.st.css`,
                            files: {
                                '/entry.st.css': {
                                    namespace: 'entry',
                                    content: `
                                    .my-class {
                                        -st-states: size( enum(small, large)) |huge|;
                                    }
                                    .my-class:size(huge) {}
                                    `
                                }
                            }
                        };

                        const res = expectWarningsFromTransform(config, [{
                            // tslint:disable-next-line:max-line-length
                            message: [
                                'pseudo-state "size" with parameter "huge" failed validation:',
                                'pseudo-state default value must equal one of the options provided'
                            ].join('\n'),
                            file: '/entry.st.css'
                        }]);
                        expect(res).to.have.styleRules({
                            1: '.entry--my-class[data-entry-size="huge"] {}'
                        });
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
                                `
                            }
                        }
                    });

                    expect(res.meta.diagnostics.reports, 'no diagnostics reported for native states').to.eql([]);
                    expect(res).to.have.styleRules({
                        1: '.entry--my-class[data-entry-size="small"] {}'
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
                                `
                            }
                        }
                    });

                    expect(res.meta.diagnostics.reports, 'no diagnostics reported for native states').to.eql([]);
                    expect(res).to.have.styleRules({
                        1: '.entry--my-class[data-entry-size="small"] {}'
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
                                `
                            }
                        }
                    };

                    const res = expectWarningsFromTransform(config, [{
                        // tslint:disable-next-line:max-line-length
                        message: [
                            'pseudo-state "size" with parameter "huge" failed validation:',
                            'pseudo-state value should equal one of the options: "small, large"'
                        ].join('\n'),
                        file: '/entry.st.css'
                    }]);
                    expect(res).to.have.styleRules({
                        1: '.entry--my-class[data-entry-size="huge"] {}'
                    });
                });
            });
        });

        describe('custom mapping', () => {

            it('should tranform any quoted string (trimmed)', () => {
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
                            `
                        }
                    }
                });

                expect(res).to.have.styleRules({
                    1: '.entry--my-class.X {}',
                    2: '.entry--my-class.y[data-z="value"] {}'
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
                            `
                        }
                    }
                });

                expect(res).to.have.styleRules({
                    1: '.entry--root:not(:focus-within):not(:hover) {}'
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
                            `
                        },
                        '/inner.st.css': {
                            namespace: 'inner',
                            content: `
                                .root {
                                    -st-states: my-state;
                                }
                            `
                        }
                    }
                });

                expect(res.meta.diagnostics.reports, 'no diagnostics reported for imported states').to.eql([]);
                expect(res).to.have.styleRules({
                    1: '.entry--my-class.inner--root[data-inner-my-state] {}'
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
                            `
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
                            `
                        },
                        '/extended-state.st.css': {
                            namespace: 'extendedState',
                            content: `
                                .root {
                                    -st-states: my-state;
                                }
                            `
                        }
                    }
                });

                expect(res).to.have.styleRules({
                    2: '.entry--direct.extendedState--root[data-entry-my-state] {}',
                    3: '.entry--proxy.proxyState--root[data-entry-my-state] {}'
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
                            `
                        },
                        '/imported.st.css': {
                            namespace: 'imported',
                            content: `
                                .inner {
                                    -st-states: my-state;
                                }
                            `
                        }
                    }
                });

                expect(res).to.have.styleRules({
                    1: '.entry--local.imported--root .imported--inner[data-imported-my-state] {}',
                    2: '.imported--root .imported--inner[data-imported-my-state] {}'
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
                            `
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
                            `
                        },
                        '/with-state.st.css': {
                            namespace: 'withState',
                            content: `
                                .root {
                                    -st-states: my-state;
                                }
                            `
                        }
                    }
                });

                expect(res).to.have.styleRules({
                    1: '.entry--my-class.type--root .type--element[data-withstate-my-state] {}'
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
                            `
                        }
                    }
                });

                expect(res).to.have.mediaQuery(0).with.styleRules({
                    1: '.entry--my-class[data-entry-my-state] {}'
                });
            });

        });
    });

    describe('diagnostics', () => {

        // TODO: Add warning implementation
        xit('should return warning for state without selector', () => {
            expectWarnings(`
                |:hover|{

                }
            `, [{ message: 'global states are not supported, use .root:hover instead', file: 'main.css' }]);
        });

        it('should trigger a warning when trying target an unknown state and keep the state', () => {
            const config = {
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `|.root:$unknownState$|{}`
                    }
                }
            };

            const res = expectWarningsFromTransform(config, [
                { message: 'unknown pseudo class "unknownState"', file: '/entry.st.css' }
            ]);
            expect(res, 'keep unknown state').to.have.styleRules([`.entry--root:unknownState{}`]);
        });

        it('should warn when defining states in complex selector', () => { // TODO: add more complex scenarios
            expectWarnings(`
                .gaga:hover {
                    |-st-states|:shmover;
                }
            `, [{ message: 'cannot define pseudo states inside complex selectors', file: 'main.css' }]);
        });

        it('should warn when defining a state inside an element selector', () => {
            expectWarnings(`
                MyElement {
                    |-st-states|:shmover;
                }
            `, [{ message: 'cannot define pseudo states inside element selectors', file: 'main.css' }]);
        });

        it('should warn when overriding class states', () => { // TODO: move to pseudo-states spec
            expectWarnings(`
                .root {
                    -st-states: mystate;
                }
                .root {
                    |-st-states: mystate2;|
                }
            `, [{ message: 'override "-st-states" on typed rule "root"', file: 'main.css' }]);
        });

        // it('should check for state name collision in the same definition', () => {});

        // it('should check for type collision in states with the same name', () => {});

        // describe('native', () => {
        //     it('should warn when overriding native states', () => {});
        // });

        // describe('boolean', () => {});

        // describe('custom validation', () => {});

        // describe('custom mapping', () => {});

    });

});
