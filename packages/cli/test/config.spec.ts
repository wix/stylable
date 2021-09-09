import { expect } from 'chai';
import { createTempDirectory, ITempDirectory } from 'create-temp-directory';
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

        it('should override cli arguments from config file', () => {
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

            runCliSync(['--outDir', './out'], tempDir.path);

            const dirContent = loadDirSync(tempDir.path);
            expect(Object.keys(dirContent)).to.eql([
                'dist/style.st.css.js',
                'package.json',
                'stylable.config.js',
                'style.st.css',
            ]);
        });

        it('should get defaults from cli', () => {
            populateDirectorySync(tempDir.path, {
                'package.json': `{"name": "test", "version": "0.0.0"}`,
                'style.st.css': `.root{color:red}`,
                'stylable.config.js': `
                  exports.stcConfig = (defaults) => ({ options: { 
                    rootDir: '${tempDir.path}',
                    outDir: defaults.outDir + '-dir',
                   } })
                `,
            });

            runCliSync(['--outDir', './dist'], tempDir.path);

            const dirContent = loadDirSync(tempDir.path);
            expect(Object.keys(dirContent)).to.eql([
                'dist-dir/style.st.css.js',
                'package.json',
                'stylable.config.js',
                'style.st.css',
            ]);
        });
    });
});
