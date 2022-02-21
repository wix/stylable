import { expect } from 'chai';
import { createTempDirectory, ITempDirectory } from 'create-temp-directory';
import { readFileSync } from 'fs';
import { join } from 'path';
import { loadDirSync, populateDirectorySync, runCliSync } from '@stylable/e2e-test-kit';

describe('Stylable CLI config file options', function () {
    this.timeout(25000);
    let tempDir: ITempDirectory;

    beforeEach(async () => {
        tempDir = await createTempDirectory();
    });
    afterEach(async () => {
        await tempDir.remove();
    });

    it('should handle single project with configuration provdier', () => {
        populateDirectorySync(tempDir.path, {
            'package.json': `{"name": "test", "version": "0.0.0"}`,
            'style.st.css': `.root{color:red}`,
            'stylable.config.js': `
                  exports.stcConfig = () => ({ 
                      options: { 
                            outDir: './dist',
                            cjs: false,
                            esm: true,
                        } 
                    })
                `,
        });

        const { stdout, stderr } = runCliSync(['--rootDir', tempDir.path]);
        const dirContent = loadDirSync(tempDir.path);

        expect(stderr, 'has cli error').not.to.match(/error/i);
        expect(stdout, 'has diagnostic error').not.to.match(/error/i);

        expect(Object.keys(dirContent)).to.eql([
            'dist/style.st.css.mjs',
            'package.json',
            'stylable.config.js',
            'style.st.css',
        ]);
    });

    it('should handle single project with configuration object', () => {
        populateDirectorySync(tempDir.path, {
            'package.json': `{"name": "test", "version": "0.0.0"}`,
            'style.st.css': `.root{color:red}`,
            'stylable.config.js': `
                  exports.stcConfig = { 
                      options: { 
                            outDir: './dist',
                            cjs: false,
                            esm: true,
                        } 
                    }
                `,
        });

        const { stdout, stderr } = runCliSync(['--rootDir', tempDir.path]);
        const dirContent = loadDirSync(tempDir.path);

        expect(stderr, 'has cli error').not.to.match(/error/i);
        expect(stdout, 'has diagnostic error').not.to.match(/error/i);

        expect(Object.keys(dirContent)).to.eql([
            'dist/style.st.css.mjs',
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
                    outDir: './out',
                   } })
                `,
        });

        const { stdout, stderr } = runCliSync(['--rootDir', tempDir.path, '--outDir', './dist']);
        const dirContent = loadDirSync(tempDir.path);

        expect(stderr, 'has cli error').not.to.match(/error/i);
        expect(stdout, 'has diagnostic error').not.to.match(/error/i);

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

        const { stdout, stderr } = runCliSync(['--rootDir', join(tempDir.path, 'my-project')]);
        const dirContent = loadDirSync(tempDir.path);

        expect(stderr, 'has cli error').not.to.match(/error/i);
        expect(stdout, 'has diagnostic error').not.to.match(/error/i);

        expect(Object.keys(dirContent)).to.eql([
            'my-project/dist/style.st.css.js',
            'my-project/package.json',
            'my-project/stylable.config.js',
            'my-project/style.st.css',
        ]);
    });

    it('should get config file from specific path', () => {
        populateDirectorySync(tempDir.path, {
            'package.json': `{"name": "test", "version": "0.0.0"}`,
            'style.st.css': `.root{color:red}`,
            configs: {
                'my-stylable-config.js': `
                  exports.stcConfig = () => ({ 
                      options: { 
                            outDir: './dist',
                            cjs: false,
                            esm: true,
                        } 
                    })
                `,
            },
        });

        const { stdout, stderr } = runCliSync([
            '--rootDir',
            tempDir.path,
            '-c',
            './configs/my-stylable-config.js',
        ]);
        const dirContent = loadDirSync(tempDir.path);

        expect(stderr, 'has cli error').not.to.match(/error/i);
        expect(stdout, 'has diagnostic error').not.to.match(/error/i);

        expect(Object.keys(dirContent)).to.eql([
            'configs/my-stylable-config.js',
            'dist/style.st.css.mjs',
            'package.json',
            'style.st.css',
        ]);
    });

    it('should override generator from config file', () => {
        populateDirectorySync(tempDir.path, {
            'package.json': `{"name": "test", "version": "0.0.0"}`,
            'comp-A.st.css': `
                      .a{}
                    `,
            'stylable.config.js': `
                        exports.stcConfig = () => ({ 
                            options: { 
                                indexFile: 'my-index.st.css',
                                IndexGenerator: require(${JSON.stringify(
                                    require.resolve('./fixtures/test-generator')
                                )}).Generator,
                                outDir: './dist',
                            }
                        })
                `,
            b: {
                '/1-some-comp-B-.st.css': `
                      .b{}
                     `,
            },
        });

        const { stderr, stdout } = runCliSync(['--rootDir', tempDir.path]);

        expect(stderr, 'has cli error').not.to.match(/error/i);
        expect(stdout, 'has diagnostic error').not.to.match(/error/i);

        const indexFileResult = readFileSync(
            join(tempDir.path, 'dist', 'my-index.st.css')
        ).toString();

        expect(indexFileResult.trim()).to.eql(
            [
                ':import {-st-from: "../b/1-some-comp-B-.st.css";-st-default:Style0;}',
                '.root Style0{}',
                ':import {-st-from: "../comp-A.st.css";-st-default:Style1;}',
                '.root Style1{}',
            ].join('\n')
        );
    });

    it('should override config file generator from cli when passed customGenerator path', () => {
        populateDirectorySync(tempDir.path, {
            'package.json': `{"name": "test", "version": "0.0.0"}`,
            'comp-A.st.css': `
                      .a{}
                    `,
            'stylable.config.js': `
                        exports.stcConfig = () => ({ 
                            options: { 
                                indexFile: 'my-index.st.css',
                                IndexGenerator: require(${JSON.stringify(
                                    require.resolve('./fixtures/named-exports-generator')
                                )}).Generator,
                                outDir: './dist',
                            }
                        })
                `,
            b: {
                '/1-some-comp-B-.st.css': `
                      .b{}
                     `,
            },
        });

        const { stdout, stderr } = runCliSync([
            '--rootDir',
            tempDir.path,
            '--customGenerator',
            require.resolve('./fixtures/test-generator'),
        ]);

        expect(stderr, 'has cli error').not.to.match(/error/i);
        expect(stdout, 'has diagnostic error').not.to.match(/error/i);

        const indexFileResult = readFileSync(
            join(tempDir.path, 'dist', 'my-index.st.css')
        ).toString();

        expect(indexFileResult.trim()).to.eql(
            [
                ':import {-st-from: "../b/1-some-comp-B-.st.css";-st-default:Style0;}',
                '.root Style0{}',
                ':import {-st-from: "../comp-A.st.css";-st-default:Style1;}',
                '.root Style1{}',
            ].join('\n')
        );
    });

    it('should show error message when fail to evaluate stcConfig', () => {
        populateDirectorySync(tempDir.path, {
            'package.json': `{"name": "test", "version": "0.0.0"}`,
            'entry.st.css': `
                      .a{}
                    `,
            'stylable.config.js': `
                        exports.stcConfig = () => {
                            throw new Error('Custom Error')
                        }
                `,
        });
        const { stdout, stderr } = runCliSync(['--rootDir', tempDir.path]);

        expect(stdout, 'has diagnostic error').not.to.match(/error/i);

        expect(stderr).to.match(/Error: Failed to evaluate "stcConfig"/);
        expect(stderr).to.match(/Custom Error/);
    });
});
