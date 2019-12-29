import { expect } from 'chai';
import * as path from 'path';

import { URI } from 'vscode-uri';
import { createRange, ProviderPosition } from '../../src/lib/completion-providers';
import * as asserters from '../../test-kit/asserters';
import { CASES_PATH } from '../../test-kit/stylable-fixtures-lsp';

describe('Definitions', () => {
    const getCasePath = (innerPath: string) => URI.file(path.join(CASES_PATH, innerPath)).fsPath;

    describe('Local elements', () => {
        it('should return first definition of class in same file', async () => {
            const defs = await asserters.getDefinition('definitions/local-class.st.css');
            expect(defs.length).to.equal(1);
            const def = defs[0];
            expect(def.uri).to.equal(getCasePath('definitions/local-class.st.css'));
            expect(def.range).to.eql(createRange(0, 1, 0, 6));
        });

        it('should return definition of var in same file', async () => {
            const defs = await asserters.getDefinition('definitions/local-var.st.css');
            expect(defs.length).to.equal(1);
            const def = defs[0];
            expect(def.uri).to.equal(getCasePath('definitions/local-var.st.css'));
            expect(def.range).to.eql(createRange(5, 4, 5, 7));
        });

        it('should return definition of custom selector in same file', async () => {
            const defs = await asserters.getDefinition('definitions/local-custom-selector.st.css');
            expect(defs.length).to.equal(1);
            const def = defs[0];
            expect(def.uri).to.equal(getCasePath('definitions/local-custom-selector.st.css'));
            expect(def.range).to.eql(createRange(4, 17, 4, 24));
        });

        it('should return definition of class in complex selector', async () => {
            const defs = await asserters.getDefinition('definitions/local-class-complex.st.css');
            expect(defs.length).to.equal(1);
            const def = defs[0];
            expect(def.uri).to.equal(getCasePath('definitions/local-class-complex.st.css'));
            expect(def.range).to.eql(createRange(0, 1, 0, 6));
        });
    });

    describe('Imported elements', () => {
        describe('Classes', () => {
            it('should return definition of imported class in -st-named', async () => {
                const defs = await asserters.getDefinition(
                    'definitions/imported-class-named.st.css'
                );
                expect(defs.length).to.equal(1);
                const def = defs[0];
                expect(def.uri).to.equal(getCasePath('definitions/import.st.css'));
                expect(def.range).to.eql(createRange(4, 1, 4, 5));
            });

            it('should return definition of imported class in -st-extend', async () => {
                const defs = await asserters.getDefinition(
                    'definitions/imported-class-extend.st.css'
                );
                expect(defs.length).to.equal(1);
                const def = defs[0];
                expect(def.uri).to.equal(getCasePath('definitions/import.st.css'));
                expect(def.range).to.eql(createRange(4, 1, 4, 5));
            });

            it('should return definition of imported class used as pseudo-element', async () => {
                const defs = await asserters.getDefinition(
                    'definitions/imported-class-pseudo-element.st.css'
                );
                expect(defs.length).to.equal(1);
                const def = defs[0];
                expect(def.uri).to.equal(getCasePath('definitions/import.st.css'));
                expect(def.range).to.eql(createRange(4, 1, 4, 5));
            });

            it('should return definition of imported class from 3rd party module', async () => {
                const defs = await asserters.getDefinition(
                    'definitions/imported-class-3rd-party.st.css'
                );
                expect(defs.length).to.equal(1);
                const def = defs[0];
                expect(def.uri).to.equal(
                    getCasePath('../node_modules/fake-stylable-package/stylesheet.st.css')
                );
                expect(def.range).to.eql(createRange(9, 1, 9, 6));
            });
        });

        describe('Vars', () => {
            it('should return definition of imported var in -st-named', async () => {
                const defs = await asserters.getDefinition('definitions/imported-var-named.st.css');
                expect(defs.length).to.equal(1);
                const def = defs[0];
                expect(def.uri).to.equal(getCasePath('definitions/import.st.css'));
                expect(def.range).to.eql(createRange(14, 4, 14, 8));
            });

            it('should return definition of 3rd party var in -st-named', async () => {
                const defs = await asserters.getDefinition(
                    'definitions/3rd-party-var-named.st.css'
                );
                expect(defs.length).to.equal(1);
                const def = defs[0];
                expect(def.uri).to.equal(
                    getCasePath('../node_modules/fake-stylable-package/stylesheet.st.css')
                );
                expect(def.range).to.eql(createRange(1, 4, 1, 10));
            });

            it('should return definition of imported var in RHS of rule', async () => {
                const defs = await asserters.getDefinition('definitions/imported-var-value.st.css');
                expect(defs.length).to.equal(1);
                const def = defs[0];
                expect(def.uri).to.equal(getCasePath('definitions/import.st.css'));
                expect(def.range).to.eql(createRange(14, 4, 14, 8));
            });
        });

        describe('Mixins and Formatters', () => {
            it('should return definition of JS mixin in -st-named', async () => {
                const defs = await asserters.getDefinition(
                    'definitions/imported-mixins-named-js.st.css'
                );
                expect(defs.length).to.equal(1);
                const def = defs[0];
                expect(def.uri).to.equal(getCasePath('mixins/js-mixins.js'));
                expect(def.range).to.eql(createRange(8, 8, 8, 14));
            });

            it('should return definition of 3rd party JS mixin in -st-named', async () => {
                const defs = await asserters.getDefinition(
                    'definitions/3rd-party-mixins-named-js.st.css'
                );
                expect(defs.length).to.equal(1);
                const def = defs[0];
                expect(def.uri).to.equal(
                    getCasePath('../node_modules/fake-stylable-package/js-mixins.js')
                );
                expect(def.range).to.eql(createRange(8, 8, 8, 14));
            });

            // Feature undergoing redesign
            xit('should return definition of TS mixin in -st-named', async () => {
                const defs = await asserters.getDefinition(
                    'definitions/imported-mixins-named-ts.st.css'
                );
                expect(defs.length).to.equal(1);
                const def = defs[0];
                expect(def.uri).to.equal(getCasePath('mixins/my-mixins.ts'));
                expect(def.range).to.eql(createRange(2, 16, 2, 29));
            });

            it('should return definition of JS mixin in use', async () => {
                const defs = await asserters.getDefinition(
                    'definitions/imported-mixins-value-js.st.css'
                );
                expect(defs.length).to.equal(1);
                const def = defs[0];
                expect(def.uri).to.equal(getCasePath('mixins/js-mixins.js'));
                expect(def.range).to.eql(createRange(26, 8, 26, 18));
            });

            xit('should return definition of TS mixin in use', async () => {
                const defs = await asserters.getDefinition(
                    'definitions/imported-mixins-value-ts.st.css'
                );
                expect(defs.length).to.equal(1);
                const def = defs[0];
                expect(def.uri).to.equal(getCasePath('mixins/my-mixins.ts'));
                expect(def.range).to.eql(createRange(19, 16, 19, 34));
            });
        });

        describe('States', () => {
            let callLocs = [
                { filePath: 'definitions/states-import.st.css', pos: new ProviderPosition(1, 22) },
                { filePath: 'definitions/states-default.st.css', pos: new ProviderPosition(5, 14) },
                { filePath: 'definitions/states-default.st.css', pos: new ProviderPosition(7, 14) },
                {
                    filePath: 'definitions/states-default.st.css',
                    pos: new ProviderPosition(16, 14)
                },
                {
                    filePath: 'definitions/states-default.st.css',
                    pos: new ProviderPosition(20, 14)
                },
                { filePath: 'definitions/states-deep.st.css', pos: new ProviderPosition(10, 33) },
                {
                    filePath: 'definitions/states-very-deep.st.css',
                    pos: new ProviderPosition(10, 16)
                }
            ];

            callLocs.forEach(cl => {
                it(
                    'Should find definition of rootState when called from file ' +
                        cl.filePath +
                        ' in position ' +
                        JSON.stringify(cl.pos),
                    async () => {
                        const defs = await asserters.getDefFromLoc(cl);
                        expect(defs.length).to.equal(1);
                        const def = defs[0];
                        expect(def.uri).to.equal(getCasePath('definitions/states-import.st.css'));
                        expect(def.range).to.eql(createRange(0, 1, 0, 5));
                    }
                );
            });

            callLocs = [
                { filePath: 'definitions/states-import.st.css', pos: new ProviderPosition(5, 21) },
                { filePath: 'definitions/states-default.st.css', pos: new ProviderPosition(7, 30) },
                {
                    filePath: 'definitions/states-default.st.css',
                    pos: new ProviderPosition(18, 15)
                },
                { filePath: 'definitions/states-named.st.css', pos: new ProviderPosition(5, 17) }
            ];

            callLocs.forEach(cl => {
                it(
                    "Should find definition of topState on element 'one' when called from file " +
                        cl.filePath +
                        ' in position ' +
                        JSON.stringify(cl.pos),
                    async () => {
                        const defs = await asserters.getDefFromLoc(cl);
                        expect(defs.length).to.equal(1);
                        const def = defs[0];
                        expect(def.uri).to.equal(getCasePath('definitions/states-import.st.css'));
                        expect(def.range).to.eql(createRange(4, 1, 4, 4));
                    }
                );
            });
        });
    });
});
