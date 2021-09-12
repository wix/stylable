import { expect } from 'chai';
import { createTempDirectory, ITempDirectory } from 'create-temp-directory';
import { join } from 'path';
import { loadDirSync, populateDirectorySync, runCliSync } from './test-kit/cli-test-kit';

describe('Stylable Cli Config', function () {
    this.timeout(25000);
    let tempDir: ITempDirectory;

    beforeEach(async () => {
        tempDir = await createTempDirectory();
    });
    afterEach(async () => {
        await tempDir.remove();
    });

    describe('Config file', () => {
        it('should handle single project', () => {
            populateDirectorySync(tempDir.path, {
                'package.json': `{"name": "test", "version": "0.0.0"}`,
                'style.st.css': `.root{color:red}`,
                'stylable.config.js': `
                  exports.stcConfig = () => ({ options: { 
                    rootDir: '${tempDir.path}',
                    outDir: './dist',
                   } })
                `,
            });

            runCliSync([], tempDir.path);

            const dirContent = loadDirSync(tempDir.path);
            expect(Object.keys(dirContent)).to.eql([
                'dist/style.st.css.js',
                'package.json',
                'stylable.config.js',
                'style.st.css',
            ]);
        });

        it('should override config file from cli arguments', () => {
            populateDirectorySync(tempDir.path, {
                'package.json': `{"name": "test", "version": "0.0.0"}`,
                'style.st.css': `.root{color:red}`,
                'stylable.config.js': `
                  exports.stcConfig = () => ({ options: { 
                    rootDir: '${tempDir.path}',
                    outDir: './out',
                   } })
                `,
            });

            runCliSync(['--outDir', './dist'], tempDir.path);

            const dirContent = loadDirSync(tempDir.path);
            expect(Object.keys(dirContent)).to.eql([
                'dist/style.st.css.js',
                'package.json',
                'stylable.config.js',
                'style.st.css',
            ]);
        });

        it('should get config file from specified root', () => {
            populateDirectorySync(tempDir.path, {
                'my-project': {
                    'package.json': `{"name": "test", "version": "0.0.0"}`,
                    'style.st.css': `.root{color:red}`,
                    'stylable.config.js': `
                        exports.stcConfig = () => ({ options: { 
                            outDir: './dist',
                        } })
                `,
                },
            });

            runCliSync(['--rootDir', join(tempDir.path, 'my-project')], tempDir.path);

            const dirContent = loadDirSync(tempDir.path);
            expect(Object.keys(dirContent)).to.eql([
                'my-project/dist/style.st.css.js',
                'my-project/package.json',
                'my-project/stylable.config.js',
                'my-project/style.st.css',
            ]);
        });
    });
});
