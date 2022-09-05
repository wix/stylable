import type { RuntimeStylesheet } from '@stylable/runtime';
import { expect } from 'chai';
import { moduleFactoryTestKit } from './test-kit';

describe('Module Factory', () => {
    it('should create a module for a single (no import/resolution) stylable file', () => {
        const testFile = '/entry.st.css';
        const { fs, factory, evalStylableModule } = moduleFactoryTestKit({
            [testFile]: '.root {}',
        });

        const moduleSource = factory(fs.readFileSync(testFile, 'utf8'), testFile);

        const exports = evalStylableModule(moduleSource, testFile);

        expect(exports).to.deep.include({
            classes: {
                root: 'entry__root',
            },
        });
    });

    it('should create a module with injectCSS=false', () => {
        const testFile = '/entry.st.css';
        const { fs, factory, evalStylableModule } = moduleFactoryTestKit(
            {
                [testFile]: '.root {background: red}',
            },
            { injectCSS: false }
        );

        const moduleSource = factory(fs.readFileSync(testFile, 'utf8'), testFile);

        const exports = evalStylableModule(moduleSource, testFile);

        expect(exports).to.deep.include({
            namespace: 'entry',
            classes: {
                root: 'entry__root',
            },
        });
        expect(moduleSource).to.not.match(/background/);
        expect(moduleSource).to.not.match(/injectCSS/);
    });

    it('should create a module with cross file use', () => {
        const testFile = '/entry.st.css';
        const importedFile = '/imported.st.css';

        const { fs, factory, evalStylableModule } = moduleFactoryTestKit({
            [testFile]: `
            :import {
                -st-from: "./imported.st.css";
                -st-named: part;
            }

            .part {
                color: green;
            }
            `,
            [importedFile]: '.part {}',
        });

        const moduleSource = factory(fs.readFileSync(testFile, 'utf8'), testFile);

        const exports = evalStylableModule(moduleSource, testFile);

        expect(exports).to.deep.include({
            classes: {
                root: 'entry__root',
                part: 'imported__part',
            },
        });
    });

    it('should generate runtime api', () => {
        const testFile = '/entry.st.css';

        const { fs, factory, evalStylableModule } = moduleFactoryTestKit({
            [testFile]: `
            .c1, .c2 {}
            @layer l1, l2;
            @keyframes k1;
            @keyframes k2;
            @property --p1;
            @property --p2;
            :vars {
                v1: red;
                v2: green;
            }
            `,
        });

        const moduleSource = factory(fs.readFileSync(testFile, 'utf8'), testFile);

        const exports = evalStylableModule<RuntimeStylesheet>(moduleSource, testFile);
        expect(Object.keys(exports).sort()).to.eql(
            [
                'namespace',
                'classes',
                'keyframes',
                'layers',
                'vars',
                'stVars',
                'cssStates',
                'style',
                'st',
            ].sort()
        );
        expect(exports.classes, 'classes').to.eql({
            root: 'entry__root',
            c1: 'entry__c1',
            c2: 'entry__c2',
        });
        expect(exports.layers, 'layers').to.eql({
            l1: 'entry__l1',
            l2: 'entry__l2',
        });
        expect(exports.keyframes, 'keyframes').to.eql({
            k1: 'entry__k1',
            k2: 'entry__k2',
        });
        expect(exports.vars, 'vars (properties)').to.eql({
            p1: '--entry-p1',
            p2: '--entry-p2',
        });
        expect(exports.stVars, 'stylable vars').to.eql({
            v1: 'red',
            v2: 'green',
        });
    });
    it('should generate runtime api from explicit export', () => {
        const testFile = '/entry.st.css';

        const { fs, factory, evalStylableModule } = moduleFactoryTestKit({
            [testFile]: `
            .c1, .c2 {}
            @layer l1, l2;
            @keyframes k1;
            @keyframes k2;
            @property --p1;
            @property --p2;
            :vars {
                v1: red;
                v2: green;
            }
            @st-export [
                c2,
                layer(l2)
                keyframes(k2),
                --p2,
                v2,
            ];
            `,
        });

        const moduleSource = factory(fs.readFileSync(testFile, 'utf8'), testFile);

        const exports = evalStylableModule<RuntimeStylesheet>(moduleSource, testFile);
        expect(Object.keys(exports).sort()).to.eql(
            [
                'namespace',
                'classes',
                'keyframes',
                'layers',
                'vars',
                'stVars',
                'cssStates',
                'style',
                'st',
            ].sort()
        );
        expect(exports.classes, 'classes').to.eql({
            c2: 'entry__c2',
        });
        expect(exports.layers, 'layers').to.eql({
            l2: 'entry__l2',
        });
        expect(exports.keyframes, 'keyframes').to.eql({
            k2: 'entry__k2',
        });
        expect(exports.vars, 'vars (properties)').to.eql({
            p2: '--entry-p2',
        });
        expect(exports.stVars, 'stylable vars').to.eql({
            v2: 'green',
        });
    });
});
