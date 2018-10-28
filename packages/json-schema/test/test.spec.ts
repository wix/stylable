import { generateStylableResult } from '@stylable/core/test-utils';
import { expect } from 'chai';
import { extractSchema } from '../src';

describe('Stylable JSON Schema Extractor', () => {
    describe('extract local symbols', () => {
        it('schema with a class', () => {
            const mock = generateStylableResult({
                entry: '/entry.st.css',
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `.root{}`
                    }
                }
            });

            const res = extractSchema(mock.meta, '/');
            expect(res).to.eql({
                $schema: 'http://json-schema.org/draft-06/schema#',
                $id: 'src/...date-display.st.css',
                $ref: 'stylable/module',
                properties: {
                    root: {
                        type: 'class'
                    }
                }
            });
        });

        it('schema with a element', () => {
            const mock = generateStylableResult({
                entry: '/entry.st.css',
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `Comp{}`
                    }
                }
            });

            const res = extractSchema(mock.meta, '/');
            expect(res.properties.Comp).to.contain({
                type: 'element'
            });
        });

        it('schema with a var', () => {
            const mock = generateStylableResult({
                entry: '/entry.st.css',
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `:vars { myVar: red; }`
                    }
                }
            });

            const res = extractSchema(mock.meta, '/');
            expect(res.properties.myVar).to.contain({
                type: 'var'
            });
        });
    });

    describe('extract states', () => {
        it('schema with a boolean state', () => {
            const mock = generateStylableResult({
                entry: '/entry.st.css',
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `.root{
                            -st-states: someState;
                        }`
                    }
                }
            });

            const res = extractSchema(mock.meta, '/');
            expect(res.properties).to.eql({
                root: {
                    type: 'class',
                    states: {
                        someState: {
                            type: 'boolean'
                        }
                    }
                }
            });
        });

        it('with a string state with a default', () => {
            const mock = generateStylableResult({
                entry: '/entry.st.css',
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `.root{
                            -st-states: someState(string) myState;
                        }`
                    }
                }
            });

            const res = extractSchema(mock.meta, '/');
            expect(res.properties).to.eql({
                root: {
                    type: 'class',
                    states: {
                        someState: {
                            type: 'string',
                            default: 'myState'
                        }
                    }
                }
            });
        });

        it('schema with an enum state', () => {
            const mock = generateStylableResult({
                entry: '/entry.st.css',
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `.root{
                            -st-states: size( enum(small, medium, large) );
                        }`
                    }
                }
            });

            const res = extractSchema(mock.meta, '/');
            expect(res.properties).to.eql({
                root: {
                    type: 'class',
                    states: {
                        size: {
                            type: 'enum',
                            enum: ['small', 'medium', 'large']
                        }
                    }
                }
            });
        });

        it('schema with a number state', () => {
            const mock = generateStylableResult({
                entry: '/entry.st.css',
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `.root{
                            -st-states: size(number);
                        }`
                    }
                }
            });

            const res = extractSchema(mock.meta, '/');
            expect(res.properties).to.eql({
                root: {
                    type: 'class',
                    states: {
                        size: {
                            type: 'number'
                        }
                    }
                }
            });
        });

        it('schema with a tags state', () => {
            const mock = generateStylableResult({
                entry: '/entry.st.css',
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `.root{
                            -st-states: size(tag);
                        }`
                    }
                }
            });

            const res = extractSchema(mock.meta, '/');
            expect(res.properties).to.eql({
                root: {
                    type: 'class',
                    states: {
                        size: {
                            type: 'tag'
                        }
                    }
                }
            });
        });
    });

    describe('imported', () => {
        it('with an imported default element', () => {
            const mock = generateStylableResult({
                entry: '/entry.st.css',
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                                    :import{
                                        -st-from: './imported.st.css';
                                        -st-default: Comp;
                                    }
                                `
                    },
                    '/imported.st.css': {
                        namespace: 'entry',
                        content: `.root{}`
                    }
                }
            });

            const res = extractSchema(mock.meta, '/');
            expect(res.properties)
                .to.be.an('object')
                .that.deep.include({
                    Comp: {
                        $ref: './imported.st.css#default'
                    }
                });
        });

        it('with an imported named class', () => {
            const mock = generateStylableResult({
                entry: '/entry.st.css',
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                                    :import{
                                        -st-from: './imported.st.css';
                                        -st-named: part;
                                    }
                                `
                    },
                    '/imported.st.css': {
                        namespace: 'entry',
                        content: `
                            .root{}
                            .part{}
                        `
                    }
                }
            });

            const res = extractSchema(mock.meta, '/');
            expect(res.properties)
                .to.be.an('object')
                .that.deep.include({
                    part: {
                        $ref: './imported.st.css#part'
                    }
                });
        });

        it('with an imported named element', () => {
            const mock = generateStylableResult({
                entry: '/entry.st.css',
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                                    :import{
                                        -st-from: './imported.st.css';
                                        -st-named: Comp;
                                    }
                                `
                    },
                    '/imported.st.css': {
                        namespace: 'entry',
                        content: `Comp{}`
                    }
                }
            });

            const res = extractSchema(mock.meta, '/');
            expect(res.properties)
                .to.be.an('object')
                .that.deep.include({
                    Comp: {
                        $ref: './imported.st.css#Comp'
                    }
                });
        });

        it('with an imported default element from 3rd-party', () => {
            const mock = generateStylableResult({
                entry: '/entry.st.css',
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                                    :import{
                                        -st-from: 'mock-package/imported.st.css';
                                        -st-default: Comp;
                                    }
                                `
                    },
                    '/node_modules/mock-package/imported.st.css': {
                        namespace: 'entry',
                        content: `Comp{}`
                    }
                }
            });

            const res = extractSchema(mock.meta, '/');
            expect(res.properties)
                .to.be.an('object')
                .that.deep.include({
                    Comp: {
                        $ref: 'mock-package/imported.st.css#default'
                    }
                });
        });

        it('with an imported named class from 3rd-party', () => {
            const mock = generateStylableResult({
                entry: '/entry.st.css',
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                                    :import{
                                        -st-from: 'mock-package/imported.st.css';
                                        -st-named: part;
                                    }
                                `
                    },
                    '/node_modules/mock-package/imported.st.css': {
                        namespace: 'entry',
                        content: `.part{}`
                    }
                }
            });

            const res = extractSchema(mock.meta, '/');
            expect(res.properties)
                .to.be.an('object')
                .that.deep.include({
                    part: {
                        $ref: 'mock-package/imported.st.css#part'
                    }
                });
        });

        it('with an imported named element from 3rd-party', () => {
            const mock = generateStylableResult({
                entry: '/entry.st.css',
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                                    :import{
                                        -st-from: 'mock-package/imported.st.css';
                                        -st-named: Comp;
                                    }
                                `
                    },
                    '/node_modules/mock-package/imported.st.css': {
                        namespace: 'entry',
                        content: `.root{}`
                    }
                }
            });

            const res = extractSchema(mock.meta, '/');
            expect(res.properties)
                .to.be.an('object')
                .that.deep.include({
                    Comp: {
                        $ref: 'mock-package/imported.st.css#Comp'
                    }
                });
        });
    });
});
