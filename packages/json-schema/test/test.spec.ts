import { generateStylableResult } from '@stylable/core/test-utils';
import { flatMatch } from '@stylable/core/tests/matchers/flat-match';
import { expect, use } from 'chai';
import { extractSchema } from '../src';

use(flatMatch);

describe('Stylable JSON Schema Extractor', () => {
    describe('local symbols', () => {
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
                $id: '/entry.st.css',
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
            expect(res.properties.Comp).to.flatMatch({
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
            expect(res.properties.myVar).to.flatMatch({
                type: 'var'
            });
        });
    });

    describe('states', () => {
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

        it('schema with a boolean stateX', () => {
            const mock = generateStylableResult({
                entry: '/entry.st.css',
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `Comp{
                            -st-states: someState;
                        }`
                    }
                }
            });

            const res = extractSchema(mock.meta, '/');
            expect(res.properties).to.flatMatch({
                Comp: {
                    type: 'element'
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

        it.skip('mapped states', () => {
            /**/
        });
        it.skip('state validators', () => {
            /**/
        });
    });

    describe('extends', () => {
        it('with an extended local class', () => {
            const mock = generateStylableResult({
                entry: '/entry.st.css',
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                                    .extended {}
                                    .root {
                                        -st-extends: extended;
                                    }
                                `
                    }
                }
            });

            const res = extractSchema(mock.meta, '/');
            expect(res.properties)
                .to.be.an('object')
                .that.deep.include({
                    root: {
                        type: 'class',
                        extends: {
                            $ref: 'extended'
                        }
                    }
                });
        });

        it('with an extended local element', () => {
            const mock = generateStylableResult({
                entry: '/entry.st.css',
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                                    Element {}
                                    .root {
                                        -st-extends: Element;
                                    }
                                `
                    }
                }
            });

            const res = extractSchema(mock.meta, '/');
            expect(res.properties)
                .to.be.an('object')
                .that.deep.include({
                    root: {
                        type: 'class',
                        extends: {
                            $ref: 'Element'
                        }
                    }
                });
        });

        describe.skip('native elements', () => {
            /**/
        });

        describe('imported', () => {
            it('with an extended default import', () => {
                const mock = generateStylableResult({
                    entry: '/entry.st.css',
                    files: {
                        '/entry.st.css': {
                            namespace: 'entry',
                            content: `
                                        :import {
                                            -st-from: './imported.st.css';
                                            -st-default: Comp;
                                        }
                                        .root {
                                            -st-extends: Comp;
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
                expect(res.properties).to.flatMatch({
                    root: {
                        type: 'class',
                        extends: {
                            $ref: './imported.st.css#root'
                        }
                    }
                });
            });

            it('with an extended named import', () => {
                const mock = generateStylableResult({
                    entry: '/entry.st.css',
                    files: {
                        '/entry.st.css': {
                            namespace: 'entry',
                            content: `
                                        :import {
                                            -st-from: './imported.st.css';
                                            -st-named: part;
                                        }
                                        .root {
                                            -st-extends: part;
                                        }
                                    `
                        },
                        '/imported.st.css': {
                            namespace: 'entry',
                            content: `.part{}`
                        }
                    }
                });

                const res = extractSchema(mock.meta, '/');
                expect(res.properties)
                    .to.be.an('object')
                    .that.deep.include({
                        root: {
                            type: 'class',
                            extends: {
                                $ref: './imported.st.css#part'
                            }
                        }
                    });
            });

            it('with an extended named import using an alias', () => {
                const mock = generateStylableResult({
                    entry: '/entry.st.css',
                    files: {
                        '/entry.st.css': {
                            namespace: 'entry',
                            content: `
                                        :import {
                                            -st-from: './imported.st.css';
                                            -st-named: part as myPart;
                                        }
                                        .root {
                                            -st-extends: myPart;
                                        }
                                    `
                        },
                        '/imported.st.css': {
                            namespace: 'entry',
                            content: `.part{}`
                        }
                    }
                });

                const res = extractSchema(mock.meta, '/');
                expect(res.properties)
                    .to.be.an('object')
                    .that.deep.include({
                        root: {
                            type: 'class',
                            extends: {
                                $ref: './imported.st.css#part'
                            }
                        }
                    });
            });

            it('with an extended default import from a 3rd party', () => {
                const mock = generateStylableResult({
                    entry: '/entry.st.css',
                    files: {
                        '/entry.st.css': {
                            namespace: 'entry',
                            content: `
                                        :import {
                                            -st-from: 'mock-package/imported.st.css';
                                            -st-default: Comp;
                                        }
                                        .root {
                                            -st-extends: Comp;
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
                expect(res.properties).to.flatMatch({
                    root: {
                        type: 'class',
                        extends: {
                            $ref: 'mock-package/imported.st.css#root'
                        }
                    }
                });
            });

            it('with an extended named import from a 3rd party', () => {
                const mock = generateStylableResult({
                    entry: '/entry.st.css',
                    files: {
                        '/entry.st.css': {
                            namespace: 'entry',
                            content: `
                                        :import {
                                            -st-from: 'mock-package/imported.st.css';
                                            -st-named: part;
                                        }
                                        .root {
                                            -st-extends: part;
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
                        root: {
                            type: 'class',
                            extends: {
                                $ref: 'mock-package/imported.st.css#part'
                            }
                        }
                    });
            });

            it('with an extended named import using an alias from a 3rd party', () => {
                const mock = generateStylableResult({
                    entry: '/entry.st.css',
                    files: {
                        '/entry.st.css': {
                            namespace: 'entry',
                            content: `
                                        :import {
                                            -st-from: 'mock-package/imported.st.css';
                                            -st-named: part as myPart;
                                        }
                                        .root {
                                            -st-extends: myPart;
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
                        root: {
                            type: 'class',
                            extends: {
                                $ref: 'mock-package/imported.st.css#part'
                            }
                        }
                    });
            });
        });
    });
});
