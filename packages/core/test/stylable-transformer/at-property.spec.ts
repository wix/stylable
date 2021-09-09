import { processorWarnings } from '@stylable/core';
import { expectWarningsFromTransform, generateStylableResult } from '@stylable/core-test-kit';
import { expect } from 'chai';
import type * as postcss from 'postcss';
import { atPropertyValidationWarnings } from '@stylable/core/dist/validate-at-property';

describe('@property support', () => {
    it('should transform @property definition', () => {
        const { meta } = generateStylableResult({
            entry: `/entry.st.css`,
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                        @st-global-custom-property --global;
               
                        @property --global {
                            syntax: "<length>";
                            inherits: false;
                            initial-value: 0px;
                        }

                        @property --radius {
                            syntax: "<length>";
                            inherits: false;
                            initial-value: 0px;
                        }

                        .root {
                            --radius: 10px;
                            --global: 20px;
                        }
                        
                        `,
                },
            },
        });

        const prop1 = meta.outputAst!.nodes[0] as postcss.AtRule;
        const prop2 = meta.outputAst!.nodes[1] as postcss.AtRule;

        expect(prop1.params).to.equal('--global');
        expect(prop2.params).to.equal('--entry-radius');
    });

    it('should remove at property when used without a body', () => {
        const config = {
            entry: `/entry.st.css`,
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                    @property --x {
                        syntax: '<color>';
                        inherits: false;
                        initial-value: #c0ffee;
                    }
                    
                    @property --y;
                    `,
                },
            },
        };

        const result = expectWarningsFromTransform(config, []);

        const { nodes } = result.meta.outputAst!;
        const atProperty = nodes[0] as postcss.AtRule;

        expect(nodes).to.have.length(1);
        expect(atProperty.params).to.eql('--entry-x');
        expect(atProperty.nodes.length).to.be.greaterThan(0);
        expect(result.exports.vars).to.eql({
            x: '--entry-x',
            y: '--entry-y',
        });
    });

    it('should detect and export @property definition', () => {
        const { exports, meta } = generateStylableResult({
            entry: `/entry.st.css`,
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
               
                        @property --my-var {
                            syntax: "<length>";
                            inherits: false;
                            initial-value: 0px;
                        }
                        
                        `,
                },
            },
        });

        const prop1 = meta.outputAst!.nodes[0] as postcss.AtRule;

        expect(prop1.params).to.equal('--entry-my-var');

        expect(exports.vars).to.eql({
            'my-var': '--entry-my-var',
        });
    });
    it('should detect existing css variable and show warning', () => {
        const config = {
            entry: `/entry.st.css`,
            files: {
                '/a.st.css': {
                    namespace: 'a',
                    content: `
                        .root {
                            --my-var: red;
                        }
                    `,
                },
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                        @st-import [--my-var] from "./a.st.css";

                        |@property $--my-var$|;
                        `,
                },
            },
        };

        expectWarningsFromTransform(config, [
            {
                file: '/entry.st.css',
                message: processorWarnings.REDECLARE_SYMBOL('--my-var'),
            },
        ]);
    });

    describe('validation', () => {
        it('should emit warning when used without "syntax" descriptor', () => {
            const config = {
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                        |@property $--x$ {|
                            inherits: true;
                            initial-value: #c0ffee;
                        }
                        
                        `,
                    },
                },
            };

            const result = expectWarningsFromTransform(config, [
                {
                    file: '/entry.st.css',
                    message: atPropertyValidationWarnings.MISSING_REQUIRED_DESCRIPTOR('syntax'),
                },
            ]);

            expect(result.meta.outputAst!.nodes).to.have.length(1);
        });

        it('should emit warning when used without "inherits" descriptor', () => {
            const config = {
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                        |@property $--x$ {|
                            syntax: '<color>';
                            initial-value: #c0ffee;
                        }
                        
                        `,
                    },
                },
            };

            const result = expectWarningsFromTransform(config, [
                {
                    file: '/entry.st.css',
                    message: atPropertyValidationWarnings.MISSING_REQUIRED_DESCRIPTOR('inherits'),
                },
            ]);

            expect(result.meta.outputAst!.nodes).to.have.length(1);
        });

        it('should emit warning when used without "initial-value" descriptor and "syntax" descriptor is not "*"', () => {
            const config = {
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                        |@property $--x$ {|
                            syntax: '<color>';
                            inherits: false;
                        }
                        
                        `,
                    },
                },
            };

            const result = expectWarningsFromTransform(config, [
                {
                    file: '/entry.st.css',
                    message:
                        atPropertyValidationWarnings.MISSING_REQUIRED_INITIAL_VALUE_DESCRIPTOR(),
                },
            ]);

            expect(result.meta.outputAst!.nodes).to.have.length(1);
        });

        it('should detect valid at-property when used without "initial-value" descriptor and "syntax" descriptor is "*"', () => {
            const config = {
                entry: `/entry.st.css`,
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                        |@property $--x$ {|
                            syntax: '*';
                            inherits: false;
                        }
                        
                        `,
                    },
                },
            };

            const result = expectWarningsFromTransform(config, []);

            expect(result.meta.outputAst!.nodes).to.have.length(1);
        });
    });
});
