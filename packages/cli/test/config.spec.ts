import { expect } from 'chai';
import { createTempDirectory, ITempDirectory } from 'create-temp-directory';
import { readFileSync } from 'fs';
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
                    outDir: './dist',
                   } })
                `,
            });

            runCliSync(['--rootDir', tempDir.path]);

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
                    outDir: './out',
                   } })
                `,
            });

            runCliSync(['--rootDir', tempDir.path, '--outDir', './dist']);

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

            runCliSync(['--rootDir', join(tempDir.path, 'my-project')]);

            const dirContent = loadDirSync(tempDir.path);
            expect(Object.keys(dirContent)).to.eql([
                'my-project/dist/style.st.css.js',
                'my-project/package.json',
                'my-project/stylable.config.js',
                'my-project/style.st.css',
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
                                Generator: require(${JSON.stringify(
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

            runCliSync(['--rootDir', tempDir.path]);

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
                                Generator: require(${JSON.stringify(
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

            runCliSync([
                '--rootDir',
                tempDir.path,
                '--customGenerator',
                require.resolve('./fixtures/test-generator'),
            ]);

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

        it('should give a custom error message when fail to eval stcConfig', () => {
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

            const { stderr } = runCliSync(['--rootDir', tempDir.path]);

            expect(stderr).to.match(/Error: Failed to evaluate "stcConfig"/);
            expect(stderr).to.match(/Custom Error/);
        });
    });

    describe('Multiple Projects', () => {
        it('should handle multiple projects requests', () => {
            populateDirectorySync(tempDir.path, {
                'package.json': `{
                    "name": "workspace", 
                    "version": "0.0.0",
                    "private": true,
                    "workspaces": ["packages/*"]
                }`,
                packages: {
                    'project-a': {
                        'style.st.css': `.root{color:red}`,
                        'package.json': `{
                            "name": "a", 
                            "version": "0.0.0",
                            "dependencies": {
                                "c": "0.0.0"
                            }
                        }`,
                    },
                    'project-c': {
                        'style.st.css': `.root{color:gold}`,
                        'package.json': `{
                            "name": "c", 
                            "version": "0.0.0"
                        }`,
                    },
                    'project-b': {
                        'style.st.css': `.root{color:blue}`,
                        'package.json': `{
                            "name": "b", 
                            "version": "0.0.0",
                            "dependencies": {
                                "a": "0.0.0"
                            }
                        }`,
                    },
                },
                'stylable.config.js': `
                exports.stcConfig = () => ({ 
                    options: { 
                        outDir: './dist',
                        dts: true,
                    },
                    projects: ['c' ,'a', 'b']
                })
                `,
            });

            runCliSync(['--rootDir', tempDir.path]);

            const dirContent = loadDirSync(tempDir.path);
            expect(Object.keys(dirContent)).to.include.members([
                'packages/project-a/dist/style.st.css.d.ts',
                'packages/project-b/dist/style.st.css.d.ts',
                'packages/project-c/dist/style.st.css.d.ts',
            ]);
        });

        it('should handle topological watch built order', () => {
            // TODO
        });

        it('should handle multiple build outputs with different options for specific package', () => {
            // TODO
        });

        it('should handle options overrides for specific package', () => {
            // TODO
        });

        it('should throw when the property "projects" is invalid array', () => {
            // TODO
        });

        it('should throw when one of the dependency does not exist', () => {
            populateDirectorySync(tempDir.path, {
                'package.json': `{
                    "name": "workspace", 
                    "version": "0.0.0",
                    "private": true,
                    "workspaces": ["packages/*"]
                }`,
                packages: {
                    'project-a': {
                        'style.st.css': `.root{color:red}`,
                        'package.json': `{
                            "name": "a", 
                            "version": "0.0.0",
                            "dependencies": {
                                "b": "0.0.0"
                            }
                        }`,
                    },
                    'project-c': {
                        'style.st.css': `.root{color:gold}`,
                        'package.json': `{
                            "name": "c", 
                            "version": "0.0.0"
                        }`,
                    },
                    'project-b': {
                        'style.st.css': `.root{color:gold}`,
                        'package.json': `{
                            "name": "b", 
                            "version": "0.0.0"
                        }`,
                    },
                },
                'stylable.config.js': `
                exports.stcConfig = () => ({ 
                    options: { 
                        outDir: './dist',
                        dts: true,
                    },
                    projects: ['not-exists' ,'a', 'b']
                })
                `,
            });

            const { stderr } = runCliSync(['--rootDir', tempDir.path]);

            expect(stderr).to.match(
                new RegExp(
                    `Error: Stylable CLI default resolution could not find package named "not-exists"`
                )
            );
        });

        it('should throw when it is a single package', () => {
            populateDirectorySync(tempDir.path, {
                'package.json': `{
                    "name": "workspace", 
                    "version": "0.0.0"
                }`,
                'style.st.css': `.root{color:red}`,
                'stylable.config.js': `
                exports.stcConfig = () => ({ 
                    options: { 
                        outDir: './dist',
                        dts: true,
                    },
                    projects: ['a', 'b']
                })
                `,
            });

            const { stderr } = runCliSync(['--rootDir', tempDir.path]);

            expect(stderr).to.match(
                new RegExp(
                    ` Stylable CLI multiple project config default resolution does not support single package`
                )
            );
        });
    });
});
