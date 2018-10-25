import { generateStylableResult } from '@stylable/core/test-utils';
import { expect } from 'chai';
import { extractSchema } from '../src';

describe('Stylable JSON Schema Extractor', () => {
    describe('extract basic classes and elements', () => {
        it('extracts a schema with a class', () => {
            const mock = generateStylableResult({
                entry: '/entry.st.css',
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `.root{}`
                    }
                }
            });

            const res = extractSchema(mock.meta);
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

        it('extracts a schema with a element', () => {
            const mock = generateStylableResult({
                entry: '/entry.st.css',
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `Comp{}`
                    }
                }
            });

            const res = extractSchema(mock.meta);
            expect(res.properties.Comp).to.contain({
                type: 'element'
            });
        });
    });

    describe('extract states', () => {
        it('extracts a class schema with a boolean state', () => {
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

            const res = extractSchema(mock.meta);
            expect(res).to.eql({
                $schema: 'http://json-schema.org/draft-06/schema#',
                $id: 'src/...date-display.st.css',
                $ref: 'stylable/module',
                properties: {
                    root: {
                        type: 'class',
                        states: {
                            someState: {
                                type: 'boolean'
                            }
                        }
                    }
                }
            });
        });

        it('extracts a class schema with a string state with a default', () => {
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

            const res = extractSchema(mock.meta);
            expect(res).to.eql({
                $schema: 'http://json-schema.org/draft-06/schema#',
                $id: 'src/...date-display.st.css',
                $ref: 'stylable/module',
                properties: {
                    root: {
                        type: 'class',
                        states: {
                            someState: {
                                type: 'string',
                                default: 'myState'
                            }
                        }
                    }
                }
            });
        });

        it('extracts a class schema with a enum state', () => {
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

            const res = extractSchema(mock.meta);
            expect(res).to.eql({
                $schema: 'http://json-schema.org/draft-06/schema#',
                $id: 'src/...date-display.st.css',
                $ref: 'stylable/module',
                properties: {
                    root: {
                        type: 'class',
                        states: {
                            size: {
                                type: 'enum',
                                enum: ['small', 'medium', 'large']
                            }
                        }
                    }
                }
            });
        });

        xit('extracts a schema with an element', () => { // TODO: figure out whether to resolve Comp or ref (abs/rel)
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
                        content: `.root{
                            -st-states: someState;
                        }`
                    }
                }
            });

            const res = extractSchema(mock.meta);
            expect(res.properties.Comp).to.contain({
                type: 'element',
                states: {
                    someState: {
                        type: 'boolean'
                    }
                }
            });
        });
    });
});
