import { flatMatch } from '@stylable/core-test-kit';
import { expect, use } from 'chai';
import path from 'path';
import {
    extractSchema,
    stylableClass,
    stylableCssVar,
    stylableElement,
    stylableModule,
    stylableVar,
    StylableModuleSchema
} from '../src';
import { mockNamespace } from './mock-namespace';

use(flatMatch);

describe('Stylable JSON Schema Extractor', () => {
    describe('local symbols', () => {
        it('schema with a class', () => {
            const res = extractSchema('.root{}', '/entry.st.css', '/', path, mockNamespace);

            expect(res).to.eql({
                $id: '/entry.st.css',
                $ref: stylableModule,
                namespace: 'entry',
                properties: {
                    root: {
                        $ref: stylableClass
                    }
                }
            });
        });

        it('schema with a element', () => {
            const res = extractSchema('Comp{}', '/entry.st.css', '/', path);

            expect(res.properties!.Comp).to.eql({
                $ref: stylableElement
            });
        });

        it('schema with a var', () => {
            const res = extractSchema(':vars { myVar: red; }', '/entry.st.css', '/', path);

            expect(res.properties!.myVar).to.eql({
                $ref: stylableVar
            });
        });

        it('schema with a css var', () => {
            const res = extractSchema('.root { --myVar: red; }', '/entry.st.css', '/', path);

            expect(res.properties!['--myVar']).to.eql({
                $ref: stylableCssVar
            });
        });
    });

    describe('imported', () => {
        it('multiple uses of the same default import return a single module dependency', () => {
            const css = `
                :import {
                    -st-from: './imported.st.css';
                    -st-default: Comp;
                }
                .root {
                    -st-extends: Comp;
                }
                Comp {}
            `;

            const res = extractSchema(css, '/entry.st.css', '/', path, mockNamespace);

            expect(res).to.eql({
                $id: '/entry.st.css',
                $ref: stylableModule,
                namespace: 'entry',
                moduleDependencies: ['/imported.st.css'],
                properties: {
                    root: {
                        $ref: stylableClass,
                        extends: {
                            $ref: '/imported.st.css#root'
                        }
                    },
                    Comp: {
                        $ref: '/imported.st.css#root'
                    }
                }
            });
        });

        it('multiple uses of the same named import return a single module dependency', () => {
            const css = `
                :import {
                    -st-from: './imported.st.css';
                    -st-named: part;
                }
                .part {
                    -st-extends: part;
                }
            `;

            const res = extractSchema(css, '/entry.st.css', '/', path, mockNamespace);

            expect(res).to.eql({
                $id: '/entry.st.css',
                $ref: stylableModule,
                namespace: 'entry',
                moduleDependencies: ['/imported.st.css'],
                properties: {
                    root: {
                        $ref: stylableClass
                    },
                    part: {
                        $ref: '/imported.st.css#part',
                        extends: {
                            $ref: '/imported.st.css#part'
                        }
                    }
                }
            });
        });

        it('unused imports are omitted', () => {
            const css = `
                :import {
                    -st-from: './imported.st.css';
                    -st-named: part;
                }
                .root {}
            `;

            const res = extractSchema(css, '/entry.st.css', '/', path, mockNamespace);

            expect(res).to.eql({
                $id: '/entry.st.css',
                $ref: stylableModule,
                namespace: 'entry',
                properties: {
                    root: {
                        $ref: stylableClass
                    }
                }
            });
        });

        it('multiple imports being used', () => {
            const css = `
                :import {
                    -st-from: './imported1.st.css';
                    -st-default: Comp1;
                }
                :import {
                    -st-from: './imported2.st.css';
                    -st-default: Comp2;
                }
                .root {}
                Comp1 {}
                Comp2 {}
            `;

            const res = extractSchema(css, '/entry.st.css', '/', path, mockNamespace);

            expect(res).to.eql({
                $id: '/entry.st.css',
                $ref: stylableModule,
                namespace: 'entry',
                moduleDependencies: ['/imported1.st.css', '/imported2.st.css'],
                properties: {
                    root: {
                        $ref: stylableClass
                    },
                    Comp1: {
                        $ref: '/imported1.st.css#root'
                    },
                    Comp2: {
                        $ref: '/imported2.st.css#root'
                    }
                }
            });
        });
    });

    describe('states', () => {
        it('schema with a boolean state', () => {
            const css = `.root{
                    -st-states: someState;
                }`;

            const res = extractSchema(css, '/entry.st.css', '/', path);
            expect(res.properties).to.eql({
                root: {
                    $ref: stylableClass,
                    states: {
                        someState: {
                            type: 'boolean'
                        }
                    }
                }
            });
        });

        it('with a string state with a default', () => {
            const css = `.root{
                -st-states: someState(string) myState;
            }`;

            const res = extractSchema(css, '/entry.st.css', '/', path);
            expect(res.properties).to.eql({
                root: {
                    $ref: stylableClass,
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
            const css = `.root{
                -st-states: size( enum(small, medium, large) );
            }`;

            const res = extractSchema(css, '/entry.st.css', '/', path);
            expect(res.properties).to.eql({
                root: {
                    $ref: stylableClass,
                    states: {
                        size: {
                            type: 'string',
                            enum: ['small', 'medium', 'large']
                        }
                    }
                }
            });
        });

        it('schema with a number state', () => {
            const css = `.root{
                -st-states: size(number);
            }`;

            const res = extractSchema(css, '/entry.st.css', '/', path);
            expect(res.properties).to.eql({
                root: {
                    $ref: stylableClass,
                    states: {
                        size: {
                            type: 'number'
                        }
                    }
                }
            });
        });

        it('schema with a tags state', () => {
            const css = `.root{
                -st-states: size(tag);
            }`;

            const res = extractSchema(css, '/entry.st.css', '/', path);
            expect(res.properties).to.eql({
                root: {
                    $ref: stylableClass,
                    states: {
                        size: {
                            type: 'tag'
                        }
                    }
                }
            });
        });

        it('schema with mapped states', () => {
            const css = `.root{
                -st-states: state("custom");
            }`;

            const res = extractSchema(css, '/entry.st.css', '/', path);
            expect(res.properties).to.eql({
                root: {
                    $ref: stylableClass,
                    states: {
                        state: {
                            type: 'mapped'
                        }
                    }
                }
            });
        });
    });

    describe('extends', () => {
        it('with an extended local class', () => {
            const css = `
                .extended {}
                .root {
                    -st-extends: extended;
                }
            }`;

            const res = extractSchema(css, '/entry.st.css', '/', path);
            expect(res.properties)
                .to.be.an('object')
                .that.deep.include({
                    root: {
                        $ref: stylableClass,
                        extends: {
                            $ref: 'extended'
                        }
                    }
                });
        });

        it('with an extended local element', () => {
            const css = `
                Element {}
                .root {
                    -st-extends: Element;
                }
            `;

            const res = extractSchema(css, '/entry.st.css', '/', path);
            expect(res.properties)
                .to.be.an('object')
                .that.deep.include({
                    root: {
                        $ref: stylableClass,
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
                const css = `
                    :import {
                        -st-from: './imported.st.css';
                        -st-default: Comp;
                    }
                    .root {
                        -st-extends: Comp;
                    }
                `;

                const res = extractSchema(css, '/entry.st.css', '/', path);
                expect(res.properties).to.flatMatch({
                    root: {
                        $ref: stylableClass,
                        extends: {
                            $ref: '/imported.st.css#root'
                        }
                    }
                });
            });

            it('with an extended named import', () => {
                const css = `
                :import {
                    -st-from: './imported.st.css';
                    -st-named: part;
                }
                .root {
                    -st-extends: part;
                }
                `;

                const res = extractSchema(css, '/entry.st.css', '/', path);
                expect(res.properties)
                    .to.be.an('object')
                    .that.deep.include({
                        root: {
                            $ref: stylableClass,
                            extends: {
                                $ref: '/imported.st.css#part'
                            }
                        }
                    });
            });

            it('with an extended named import using an alias', () => {
                const css = `
                    :import {
                        -st-from: './imported.st.css';
                        -st-named: part as myPart;
                    }
                    .root {
                        -st-extends: myPart;
                    }
                `;

                const res = extractSchema(css, '/entry.st.css', '/', path);
                expect(res.properties)
                    .to.be.an('object')
                    .that.deep.include({
                        root: {
                            $ref: stylableClass,
                            extends: {
                                $ref: '/imported.st.css#part'
                            }
                        }
                    });
            });

            it('with an extended default import from a 3rd party', () => {
                const css = `
                    :import {
                        -st-from: 'mock-package/imported.st.css';
                        -st-default: Comp;
                    }
                    .root {
                        -st-extends: Comp;
                    }
                `;

                const res = extractSchema(css, '/entry.st.css', '/', path);
                expect(res.properties).to.flatMatch({
                    root: {
                        $ref: stylableClass,
                        extends: {
                            $ref: 'mock-package/imported.st.css#root'
                        }
                    }
                });
            });

            it('with an extended named import from a 3rd party', () => {
                const css = `
                    :import {
                        -st-from: 'mock-package/imported.st.css';
                        -st-named: part;
                    }
                    .root {
                        -st-extends: part;
                    }
                `;

                const res = extractSchema(css, '/entry.st.css', '/', path);
                expect(res.properties)
                    .to.be.an('object')
                    .that.deep.include({
                        root: {
                            $ref: stylableClass,
                            extends: {
                                $ref: 'mock-package/imported.st.css#part'
                            }
                        }
                    });
            });

            it('with an extended named import using an alias from a 3rd party', () => {
                const css = `
                    :import {
                        -st-from: 'mock-package/imported.st.css';
                        -st-named: part as myPart;
                    }
                    .root {
                        -st-extends: myPart;
                    }
                `;

                const res = extractSchema(css, '/entry.st.css', '/', path);
                expect(res.properties)
                    .to.be.an('object')
                    .that.deep.include({
                        root: {
                            $ref: stylableClass,
                            extends: {
                                $ref: 'mock-package/imported.st.css#part'
                            }
                        }
                    });
            });
        });
    });

    it('complex example', () => {
        const css = `
            :import {
                -st-from: './imported.st.css';
                -st-default: Comp;
                -st-named: part1, part2;
            }
            :vars {
                /**
                 * a var description
                 * @tag a var tag
                 */
                myColor: red;
            }
            /**
             * a description for root
             * @tag a tag for root
             */
            .root {
                -st-states: userSelected;
                -st-extends: Comp;
            }
            .otherPart {
                -st-states: size( enum(s, m, l) );
                -st-extends: part1;
            }
            /**
             * a description for part2
             * @tag a tag for part2
             */
            .part2 {}
        `;

        const res = extractSchema(css, '/entry.st.css', '/', path, mockNamespace);
        const expected: StylableModuleSchema = {
            $id: '/entry.st.css',
            $ref: stylableModule,
            namespace: 'entry',
            moduleDependencies: ['/imported.st.css'],
            properties: {
                root: {
                    $ref: stylableClass,
                    states: {
                        userSelected: {
                            type: 'boolean'
                        }
                    },
                    extends: {
                        $ref: '/imported.st.css#root'
                    },
                    description: 'a description for root',
                    docTags: { tag: 'a tag for root' }
                },
                part2: {
                    $ref: '/imported.st.css#part2',
                    description: 'a description for part2',
                    docTags: { tag: 'a tag for part2' }
                },
                myColor: {
                    $ref: stylableVar,
                    description: 'a var description',
                    docTags: { tag: 'a var tag' }
                },
                otherPart: {
                    $ref: stylableClass,
                    states: {
                        size: {
                            type: 'string',
                            enum: ['s', 'm', 'l']
                        }
                    },
                    extends: {
                        $ref: '/imported.st.css#part1'
                    }
                }
            }
        };

        expect(res).to.eql(expected);
    });
});
