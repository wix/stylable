import { expect } from 'chai';
import { moduleFactoryTestKit } from './test-kit';

describe('Module Factory', () => {
    it('should create a module for a single (no import/resolution) stylable file', () => {
        const testFile = '/entry.st.css';
        const { fs, factory, evalStylableModule } = moduleFactoryTestKit({
            [testFile]: '.root {}'
        });

        const moduleSource = factory(fs.readFileSync(testFile, 'utf8'), testFile);

        const exports = evalStylableModule(moduleSource, testFile);

        expect(exports).to.deep.include({
            classes: {
                root: 'entry--root'
            }
        });
    });

    it('should create a module with cross file use', () => {
        const testFile = '/entry.st.css';

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
            '/imported.st.css': '.part {}'
        });

        const moduleSource = factory(fs.readFileSync(testFile, 'utf8'), testFile);

        const exports = evalStylableModule(moduleSource, testFile);

        expect(exports).to.deep.include({
            classes: {
                root: 'entry--root',
                part: 'imported--part'
            }
        });
    });
});
