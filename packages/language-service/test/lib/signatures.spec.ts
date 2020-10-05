import { expect } from 'chai';
import {
    ParameterInformation,
    SignatureHelp,
    SignatureInformation,
} from 'vscode-css-languageservice';
import { getSignatureHelp } from '../../test-kit/asserters';

describe('Signature Help', () => {
    xdescribe('TS Paramful Mixin', () => {
        const str = "'25','lala','b'";

        str.split('').forEach((_c, i) => {
            const prefix = str.slice(0, i);
            it(
                'Provides signature help and identifies active parameter, with prefix ' + prefix,
                () => {
                    const filePath = 'mixins/imported-mixins-paramful-signature.st.css';

                    const sig = getSignatureHelp(filePath, prefix);

                    const exp: SignatureHelp = {
                        activeSignature: 0,
                        activeParameter: prefix.match(/,/g) ? prefix.match(/,/g)!.length : 0,
                        signatures: [
                            SignatureInformation.create(
                                "paramfulMixin(numParam: string, strParam: string, aliasedParam: string, enumParam: 'a' | 'b'): object",
                                undefined,
                                ParameterInformation.create('numParam: string'),
                                ParameterInformation.create('strParam: string'),
                                ParameterInformation.create('aliasedParam: string'),
                                ParameterInformation.create("enumParam: 'a' | 'b'")
                            ),
                        ],
                    };

                    expect(sig).to.not.equal(null);
                    expect(sig).to.deep.equal(exp);
                }
            ).timeout(5000);
        });
    });

    xdescribe('TS Paramless Mixin', () => {
        it('Provides signature help with no parameters', () => {
            const filePath = 'mixins/imported-mixins-paramless-signature.st.css';

            const sig = getSignatureHelp(filePath, '');

            const exp: SignatureHelp = {
                activeSignature: 0,
                activeParameter: 0,
                signatures: [SignatureInformation.create('paramlessMixin(): object', undefined)],
            };

            expect(sig).to.not.equal(null);
            expect(sig).to.deep.equal(exp);
        }).timeout(5000);
    });

    xdescribe('TS Paramful Mixin - Default Import', () => {
        const str = "'25','lala','b'";

        str.split('').forEach((_c, i) => {
            const prefix = str.slice(0, i);
            it(
                'Provides signature help and identifies active parameter, with prefix ' + prefix,
                () => {
                    const filePath = 'mixins/imported-mixins-default-paramful-signature.st.css';

                    const sig = getSignatureHelp(filePath, prefix);

                    const exp: SignatureHelp = {
                        activeSignature: 0,
                        activeParameter: prefix.match(/,/g) ? prefix.match(/,/g)!.length : 0,
                        signatures: [
                            SignatureInformation.create(
                                'mixin(pct: string): object',
                                undefined,
                                ParameterInformation.create('pct: string')
                            ),
                        ],
                    };

                    expect(sig).to.not.equal(null);
                    expect(sig).to.deep.equal(exp);
                }
            ).timeout(5000);
        });
    });

    describe('JS Paramful Mixin', () => {
        const str = "'25','lala','b'";

        str.split('').forEach((_c, i) => {
            const prefix = str.slice(0, i);
            it(
                'Provides signature help and identifies active parameter, with prefix ' + prefix,
                () => {
                    const filePath = 'mixins/imported-mixins-paramful-js-signature.st.css';

                    const sig = getSignatureHelp(filePath, prefix);

                    const exp: SignatureHelp = {
                        activeSignature: 0,
                        activeParameter: prefix.match(/,/g) ? prefix.match(/,/g)!.length : 0,
                        signatures: [
                            SignatureInformation.create(
                                "aMixin(strParam: string, numParam: string, enumParam: 'a'|'b'): object",
                                'A mixin with some params',
                                ParameterInformation.create('strParam: string', 'A string param'),
                                ParameterInformation.create('numParam: string', 'A num param'),
                                ParameterInformation.create("enumParam: 'a'|'b'", 'An enum param')
                            ),
                        ],
                    };

                    expect(sig).to.not.equal(null);
                    expect(sig).to.deep.equal(exp);
                }
            ).timeout(5000);
        });
    });

    describe('JS Paramless Mixin', () => {
        it('Provides signature help with no parameters', () => {
            const filePath = 'mixins/imported-mixins-paramless-js-signature.st.css';

            const sig = getSignatureHelp(filePath, '');

            const exp: SignatureHelp = {
                activeSignature: 0,
                activeParameter: 0,
                signatures: [
                    SignatureInformation.create('aBareMixin(): object', 'A mixin with no params'),
                ],
            };

            expect(sig).to.not.equal(null);
            expect(sig).to.deep.equal(exp);
        }).timeout(5000);
    });

    xdescribe('JS Paramful Mixin with .d.ts', () => {
        const str = "'25','lala','b'";

        str.split('').forEach((_c, i) => {
            const prefix = str.slice(0, i);
            it(
                'Provides signature help and identifies active parameter, with prefix ' + prefix,
                () => {
                    const filePath = 'mixins/imported-mixins-paramful-dts-signature.st.css';

                    const sig = getSignatureHelp(filePath, prefix);

                    const exp: SignatureHelp = {
                        activeSignature: 0,
                        activeParameter: prefix.match(/,/g) ? prefix.match(/,/g)!.length : 0,
                        signatures: [
                            SignatureInformation.create(
                                "paramfulMixin(numParam: string, strParam: string, aliasedParam: string, enumParam: 'a'|'b'): object",
                                undefined,
                                ParameterInformation.create('numParam: stNumber<0,200>'),
                                ParameterInformation.create('strParam: styl.stString'),
                                ParameterInformation.create('aliasedParam: lalaString'),
                                ParameterInformation.create("enumParam: 'a'|'b'")
                            ),
                        ],
                    };

                    expect(sig).to.not.equal(null);
                    expect(sig).to.deep.equal(exp);
                }
            ).timeout(5000);
        });
    });

    xdescribe('JS Paramless Mixin with .d.ts', () => {
        it('Provides signature help with no parameters', () => {
            const filePath = 'mixins/imported-mixins-paramless-dts-signature.st.css';

            const sig = getSignatureHelp(filePath, '');

            const exp: SignatureHelp = {
                activeSignature: 0,
                activeParameter: 0,
                signatures: [SignatureInformation.create('paramlessMixin(): object', undefined)],
            };

            expect(sig).to.not.equal(null);
            expect(sig).to.deep.equal(exp);
        }).timeout(5000);
    });

    describe('No signature', () => {
        it('outside param area after parentheses', () => {
            const filePath = 'mixins/imported-mixins-paramful-signature-outside-1.st.css';

            const sig = getSignatureHelp(filePath, '');

            expect(sig).to.equal(null);
        });

        it('outside param area in mixin name', () => {
            const filePath = 'mixins/imported-mixins-paramful-signature-outside-2.st.css';

            const sig = getSignatureHelp(filePath, '');

            expect(sig).to.equal(null);
        });

        it('in value()', () => {
            const filePath = 'variables/inside-value-local-vars.st.css';

            const sig = getSignatureHelp(filePath, '');

            expect(sig).to.equal(null);
        });
    });

    describe('State with parameters', () => {
        describe('definition', () => {
            describe('type hinting', () => {
                const types = ['string', 'number', 'enum', 'tag'];

                types.forEach((str) =>
                    str.split('').forEach((_c, i) => {
                        const prefix = str.slice(0, i);
                        it(
                            'Provides signature help and identifies state definition, with prefix ' +
                                prefix,
                            () => {
                                const filePath =
                                    'states/with-param/state-def-with-param-start.st.css';

                                const sig = getSignatureHelp(filePath, prefix);

                                const exp: SignatureHelp = {
                                    activeSignature: 0,
                                    activeParameter: 0,
                                    signatures: [
                                        SignatureInformation.create(
                                            'Supported state types:\n- "string | number | enum | tag"',
                                            undefined,
                                            ParameterInformation.create(
                                                'string | number | enum | tag'
                                            )
                                        ),
                                    ],
                                };

                                expect(sig).to.not.equal(null);
                                expect(sig).to.deep.equal(exp);
                            }
                        );
                    })
                );

                it('Provides signature help and identifies state definition (caret at end of state definition)', () => {
                    const filePath = 'states/with-param/state-def-with-param-end.st.css';

                    const sig = getSignatureHelp(filePath, '');

                    const exp: SignatureHelp = {
                        activeSignature: 0,
                        activeParameter: 0,
                        signatures: [
                            SignatureInformation.create(
                                'Supported state types:\n- "string | number | enum | tag"',
                                undefined,
                                ParameterInformation.create('string | number | enum | tag')
                            ),
                        ],
                    };

                    expect(sig).to.not.equal(null);
                    expect(sig).to.deep.equal(exp);
                });
            });

            describe('string validator hinting', () => {
                const validators = ['regex', 'contains', 'minLength', 'maxLength'];

                validators.forEach((validator) =>
                    validator.split('').forEach((_c, i) => {
                        const prefix = validator.slice(0, i);
                        it(
                            'Provides validator signature help for a local string state type definition, with prefix ' +
                                prefix,
                            () => {
                                const filePath =
                                    'states/with-param/string/local-state-string-validators.st.css';

                                const sig = getSignatureHelp(filePath, prefix);

                                const exp: SignatureHelp = {
                                    activeSignature: 0,
                                    activeParameter: 0,
                                    signatures: [
                                        SignatureInformation.create(
                                            'Supported "string" validator types:\n- "regex, contains, minLength, maxLength"',
                                            undefined,
                                            ParameterInformation.create(
                                                'regex, contains, minLength, maxLength'
                                            )
                                        ),
                                    ],
                                };

                                expect(sig).to.not.equal(null);
                                expect(sig).to.deep.equal(exp);
                            }
                        );
                    })
                );

                it('Provides signature help and identifies state definition (including validator)', () => {
                    const filePath = 'states/with-param/state-def-with-param-middle.st.css';

                    const sig = getSignatureHelp(filePath, '');

                    const exp: SignatureHelp = {
                        activeSignature: 0,
                        activeParameter: 0,
                        signatures: [
                            SignatureInformation.create(
                                'Supported state types:\n- "string | number | enum | tag"',
                                undefined,
                                ParameterInformation.create('string | number | enum | tag')
                            ),
                        ],
                    };

                    expect(sig).to.not.equal(null);
                    expect(sig).to.deep.equal(exp);
                });
            });
        });

        describe('usage', () => {
            const str = 'hello';

            str.split('').forEach((_c, i) => {
                const prefix = str.slice(0, i);
                it(
                    'Provides signature help and identifies local state type definition, with prefix ' +
                        prefix,
                    () => {
                        const filePath = 'states/with-param/local-state-param-suggestion.st.css';

                        const sig = getSignatureHelp(filePath, prefix);

                        const exp: SignatureHelp = {
                            activeSignature: 0,
                            activeParameter: 0,
                            signatures: [
                                SignatureInformation.create(
                                    'hello(string)',
                                    undefined,
                                    ParameterInformation.create('string')
                                ),
                            ],
                        };

                        expect(sig).to.not.equal(null);
                        expect(sig).to.deep.equal(exp);
                    }
                );
            });

            str.split('').forEach((_c, i) => {
                const prefix = str.slice(0, i);
                it(
                    'Provides signature help and identifies imported state type definition, with prefix ' +
                        prefix,
                    () => {
                        const filePath = 'states/with-param/imported-state-param-suggestion.st.css';

                        const sig = getSignatureHelp(filePath, prefix);

                        const exp: SignatureHelp = {
                            activeSignature: 0,
                            activeParameter: 0,
                            signatures: [
                                SignatureInformation.create(
                                    'shmover(number)',
                                    undefined,
                                    ParameterInformation.create('number')
                                ),
                            ],
                        };

                        expect(sig).to.not.equal(null);
                        expect(sig).to.deep.equal(exp);
                    }
                );
            });

            str.split('').forEach((_c, i) => {
                const prefix = str.slice(0, i);
                it(
                    'Provides signature help and identifies imported state type definition and validators, with prefix ' +
                        prefix,
                    () => {
                        const filePath =
                            'states/with-param/imported-state-param-and-validators-suggestion.st.css';

                        const sig = getSignatureHelp(filePath, prefix);

                        const exp: SignatureHelp = {
                            activeSignature: 0,
                            activeParameter: 0,
                            signatures: [
                                SignatureInformation.create(
                                    'shmover(number(min(3), max(42)))',
                                    undefined,
                                    ParameterInformation.create('number(min(3), max(42))')
                                ),
                            ],
                        };

                        expect(sig).to.not.equal(null);
                        expect(sig).to.deep.equal(exp);
                    }
                );
            });
        });
    });

    describe('JS 3rd Party Mixin', () => {
        const str = "'25','lala','b'";

        str.split('').forEach((_c, i) => {
            const prefix = str.slice(0, i);
            it(
                'Provides signature help and identifies active parameter from 3rd party, with prefix ' +
                    prefix,
                () => {
                    const filePath = 'mixins/imported-mixins-third-party.st.css';

                    const sig = getSignatureHelp(filePath, prefix);

                    const exp: SignatureHelp = {
                        activeSignature: 0,
                        activeParameter: prefix.match(/,/g) ? prefix.match(/,/g)!.length : 0,
                        signatures: [
                            SignatureInformation.create(
                                "aMixin(strParam: string, numParam: string, enumParam: 'a'|'b'): object",
                                'A mixin with some params',
                                ParameterInformation.create('strParam: string', 'A string param'),
                                ParameterInformation.create('numParam: string', 'A num param'),
                                ParameterInformation.create("enumParam: 'a'|'b'", 'An enum param')
                            ),
                        ],
                    };

                    expect(sig).to.not.equal(null);
                    expect(sig).to.deep.equal(exp);
                }
            ).timeout(5000);
        });
    });
});
