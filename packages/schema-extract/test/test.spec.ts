import { flatMatch } from '@stylable/core-test-kit';
import { expect, use } from 'chai';
import path from 'path';
import {
    extractSchema,
    stylableClass,
    stylableCssVar,
    stylableElement,
    stylableModule,
    stylableVar
} from '../src';

use(flatMatch);

describe('Stylable JSON Schema Extractor', () => {
    describe('local symbols', () => {
        it('schema with a class', () => {
            const res = extractSchema('.root{}', '/entry.st.css', '/', path);

            expect(res).to.eql({
                $id: '/entry.st.css',
                $ref: stylableModule,
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
                            type: 'enum',
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
                -st-named: part;
            }
            :vars {
                myColor: red;
            }
            .root {
                -st-states: userSelected;
                -st-extends: Comp;
            }
            .otherPart {
                -st-states: size( enum(s, m, l) );
                -st-extends: part;
            }
        `;

        const res = extractSchema(css, '/entry.st.css', '/', path);

        expect(res).to.eql({
            $id: '/entry.st.css',
            $ref: stylableModule,
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
                    }
                },
                Comp: {},
                part: {},
                myColor: {
                    $ref: stylableVar
                },
                otherPart: {
                    $ref: stylableClass,
                    states: {
                        size: {
                            type: 'enum',
                            enum: ['s', 'm', 'l']
                        }
                    },
                    extends: {
                        $ref: '/imported.st.css#part'
                    }
                }
            }
        });
    });
});
