import { expect } from 'chai';
import { join, resolve } from 'path';
import { moduleFactoryTestKit } from './test-kit';

describe('Module Factory', () => {
    it('should create a module for a single (no import/resolution) stylable file', () => {
        const testFile = join(resolve('/'), '/entry.st.css');
        const { fs, factory, evalStylableModule } = moduleFactoryTestKit({
            [testFile]: '.root {}'
        });

        const moduleSource = factory(fs.readFileSync(testFile, 'utf8'), testFile);

        const exports = evalStylableModule(moduleSource, testFile);

        expect(exports).to.deep.include({
            classes: {
                root: 'entry__root'
            }
        });
    });

    it('should create a module with injectCSS=false', () => {
        const testFile = join(resolve('/'), '/entry.st.css');
        const { fs, factory, evalStylableModule } = moduleFactoryTestKit(
            {
                [testFile]: '.root {}'
            },
            { injectCSS: false }
        );

        const moduleSource = factory(fs.readFileSync(testFile, 'utf8'), testFile);

        const exports = evalStylableModule(moduleSource, testFile);

        expect(exports).to.deep.include({
            $css: '',
            classes: {
                root: 'entry__root'
            }
        });
    });
    it('should create a module with legacy runtime', () => {
        const testFile = join(resolve('/'), '/entry.st.css');
        const { fs, factory, evalStylableModule } = moduleFactoryTestKit(
            {
                [testFile]: '.root {}'
            },
            { injectCSS: false, legacyRuntime: true }
        );

        const moduleSource = factory(fs.readFileSync(testFile, 'utf8'), testFile);

        const exports: any = evalStylableModule(moduleSource, testFile);

        expect(exports('root')).to.eql({
            className: 'entry__root'
        });
    });
    it('should create a module with cross file use', () => {
        const rootPath = resolve('/');
        const testFile = join(rootPath, '/entry.st.css');
        const importedFile = join(rootPath, '/imported.st.css');

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
            [importedFile]: '.part {}'
        });

        const moduleSource = factory(fs.readFileSync(testFile, 'utf8'), testFile);

        const exports = evalStylableModule(moduleSource, testFile);

        expect(exports).to.deep.include({
            classes: {
                root: 'entry__root',
                part: 'imported__part'
            }
        });
    });

    it('api check', () => {
        const rootPath = resolve('/');
        const testFile = join(rootPath, '/entry.st.css');

        const { fs, factory, evalStylableModule } = moduleFactoryTestKit({
            [testFile]: `
        
            .part {
                color: green;
            }
            `
        });

        const moduleSource = factory(fs.readFileSync(testFile, 'utf8'), testFile);

        const exports = evalStylableModule(moduleSource, testFile);
        expect(Object.keys(exports as {}).sort()).to.eql(
            [
                'namespace',
                'classes',
                'keyframes',
                'vars',
                'stVars',
                'cssStates',
                'style',
                'st',
                '$id',
                '$depth',
                '$css'
            ].sort()
        );
    });
});
