import { expect } from 'chai';
import { createRange } from '@stylable/language-service/dist/lib/completion-providers';
import { getFormattingEdits } from '../test-kit/asserters';
import { deindent } from '@stylable/core-test-kit';

describe('Formatting', () => {
    it('should format an entire stylesheet', () => {
        const res = getFormattingEdits('.root { color: red      ;}');

        expect(res).to.eql([
            {
                range: createRange(0, 0, 0, 26),
                newText: '.root {\n    color: red;\n}',
            },
        ]);
    });

    it('should format a specific range', () => {
        const res = getFormattingEdits('.root { color: red      ;}', { start: 14, end: 25 });

        expect(res).to.eql([
            {
                range: createRange(0, 14, 0, 25),
                newText: ' red;',
            },
        ]);
    });

    describe('vscode formatting options', () => {
        it('should format with tabs', () => {
            const res = getFormattingEdits('.root { color: red      ;}', undefined, {
                insertSpaces: false,
                tabSize: 4,
            });

            expect(res).to.eql([
                {
                    range: createRange(0, 0, 0, 26),
                    newText: '.root {\n\tcolor: red;\n}',
                },
            ]);
        });

        it('should format with 2 spaces', () => {
            const res = getFormattingEdits('.root { color: red      ;}', undefined, {
                insertSpaces: true,
                tabSize: 2,
            });

            expect(res).to.eql([
                {
                    range: createRange(0, 0, 0, 26),
                    newText: '.root {\n  color: red;\n}',
                },
            ]);
        });

        it('should format with a final new line', () => {
            const res = getFormattingEdits('.root { color: red      ;}', undefined, {
                insertSpaces: true,
                tabSize: 4,
                insertFinalNewline: true,
            });

            expect(res).to.eql([
                {
                    range: createRange(0, 0, 0, 26),
                    newText: '.root {\n    color: red;\n}\n',
                },
            ]);
        });

        it('should format trimming final lines', () => {
            const res = getFormattingEdits('.root { color: red      ;}\n\n', undefined, {
                insertSpaces: true,
                tabSize: 4,
                trimFinalNewlines: true,
            });

            expect(res).to.eql([
                {
                    range: createRange(0, 0, 2, 0),
                    newText: '.root {\n    color: red;\n}',
                },
            ]);
        });

        xit('should format and not trim whitespaces', () => {
            // this vscode option is not supported by JSBeautify
            const res = getFormattingEdits('.root { color: red      ;       \n}', undefined, {
                insertSpaces: true,
                tabSize: 4,
                trimTrailingWhitespace: false,
            });

            expect(res).to.eql([
                {
                    range: createRange(0, 0, 2, 0),
                    newText: '.root {\n    color: red;\n}         ',
                },
            ]);
        });
    });
    describe('experimental', () => {
        const experimentalOptions = {
            experimental: true,
            tabSize: 4,
            insertSpaces: true,
        };
        it('should format an entire stylesheet', () => {
            const res = getFormattingEdits(
                '.root { color: red      ;}',
                undefined,
                experimentalOptions
            );

            expect(res).to.eql([
                {
                    range: createRange(0, 0, 0, 26),
                    newText:
                        deindent(`
                        .root {
                            color: red;
                        }
                    `) + '\n',
                },
            ]);
        });
        it('should format with new formatter (check indent diff)', () => {
            const res = getFormattingEdits(
                '.a{prop:\ngreen,\nblue}',
                undefined,
                experimentalOptions
            );

            expect(res).to.eql([
                {
                    range: createRange(0, 0, 2, 5),
                    newText:
                        deindent(`
                        .a {
                            prop:
                                green,
                                blue;
                        }
                    `) + '\n',
                },
            ]);
        });
        it.skip('should format a specific range', () => {
            const res = getFormattingEdits(
                '.a { color: red      ;}\n.b { color: green      ;}',
                { start: 25, end: 50 },
                experimentalOptions
            );

            expect(res).to.eql([
                {
                    range: createRange(0, 25, 1, 25),
                    newText:
                        deindent(`
                        .b {
                            color: green;
                        }
                    `) + '\n',
                },
            ]);
        });
        it('should temporarily format all document for a specific range', () => {
            const res = getFormattingEdits(
                '.a{color:red}.b{color:green}',
                { start: 13, end: 28 },
                experimentalOptions
            );

            expect(res).to.eql([
                {
                    range: createRange(0, 0, 0, 28),
                    newText:
                        deindent(`
                        .a {
                            color: red;
                        }

                        .b {
                            color: green;
                        }
                    `) + '\n',
                },
            ]);
        });
        it('should not format on invalid CSS ', () => {
            const res = getFormattingEdits('.unclosed{color:red', undefined, experimentalOptions);

            expect(res).to.eql([]);
        });
        describe('config', () => {
            // ToDo: handle more configuration options
            it('should use "tabSize" config (-> "indent" string)', () => {
                const res = getFormattingEdits('@xxx[\na,b];.root{color:red}', undefined, {
                    experimental: true,
                    tabSize: 2,
                    insertSpaces: true,
                });

                expect(res).to.eql([
                    {
                        range: createRange(0, 0, 1, 21),
                        newText:
                            deindent(`
                                @xxx [
                                  a,
                                  b
                                ];
                                
                                .root {
                                  color: red;
                                }
                            `) + '\n',
                    },
                ]);
            });
            it('should use "endWithNewline" config', () => {
                const res = getFormattingEdits('.root{color:red}', undefined, {
                    experimental: true,
                    endWithNewline: false,
                    tabSize: 4,
                    insertSpaces: true,
                });

                expect(res).to.eql([
                    {
                        range: createRange(0, 0, 0, 16),
                        newText: deindent(`                                
                                .root {
                                    color: red;
                                }
                            `),
                    },
                ]);
            });
            it('should use "wrapLineLength" config', () => {
                const res = getFormattingEdits('.root{prop:123456789 123456789}', undefined, {
                    experimental: true,
                    wrapLineLength: 20,
                    tabSize: 4,
                    insertSpaces: true,
                });

                expect(res).to.eql([
                    {
                        range: createRange(0, 0, 0, 31),
                        newText:
                            deindent(`                                
                                .root {
                                    prop: 123456789
                                          123456789;
                                }
                            `) + '\n',
                    },
                ]);
            });
        });
    });
});
