import { expect } from 'chai';
import { moduleFactoryTestKit } from './test-kit.js';

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
            { injectCSS: false },
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
            },
        });
    });

    it('api check', () => {
        const testFile = '/entry.st.css';

        const { fs, factory, evalStylableModule } = moduleFactoryTestKit({
            [testFile]: `
        
            .part {
                color: green;
            }
            `,
        });

        const moduleSource = factory(fs.readFileSync(testFile, 'utf8'), testFile);

        const exports = evalStylableModule<{}>(moduleSource, testFile);
        expect(Object.keys(exports).sort()).to.eql(
            [
                'namespace',
                'classes',
                'keyframes',
                'layers',
                'containers',
                'vars',
                'stVars',
                'cssStates',
                'style',
                'st',
            ].sort(),
        );
    });
});
