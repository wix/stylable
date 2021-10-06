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

            const { stdout, stderr } = runCliSync([
                '--rootDir',
                tempDir.path,
                '--outDir',
                './dist',
            ]);
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
            const { stdout, stderr } = runCliSync(['--rootDir', tempDir.path]);

            expect(stdout, 'has diagnostic error').not.to.match(/error/i);

            expect(stderr).to.match(/Error: Failed to evaluate "stcConfig"/);
            expect(stderr).to.match(/Custom Error/);
        });
    });

    describe('Multiple Projects', () => {
        it('should handle multiple projects requests', () => {
            populateDirectorySync(tempDir.path, {
                'package.json': JSON.stringify({
                    name: 'workspace',
                    version: '0.0.0',
                    private: true,
                }),
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
                    projects: ['packages/*']
                })
                `,
            });

            const { stdout, stderr } = runCliSync(['--rootDir', tempDir.path]);
            const dirContent = loadDirSync(tempDir.path);

            expect(stderr, 'has cli error').not.to.match(/error/i);
            expect(stdout, 'has diagnostic error').not.to.match(/error/i);

            expect(Object.keys(dirContent)).to.include.members([
                'packages/project-a/dist/style.st.css.d.ts',
                'packages/project-b/dist/style.st.css.d.ts',
                'packages/project-c/dist/style.st.css.d.ts',
            ]);
        });

        it('should handle override for specific request', () => {
            populateDirectorySync(tempDir.path, {
                'package.json': JSON.stringify({
                    name: 'workspace',
                    version: '0.0.0',
                    private: true,
                }),
                packages: {
                    'project-a': {
                        'style.st.css': `.root{color:red}`,
                        'package.json': `{
                            "name": "a", 
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
                    projects: [
                        [
                            'packages/project-b', 
                            { options: { dts: false } }
                        ],
                        'packages/*'
                    ]
                })
                `,
            });

            const { stdout, stderr } = runCliSync(['--rootDir', tempDir.path]);
            const dirContent = loadDirSync(tempDir.path);

            expect(stderr, 'has cli error').not.to.match(/error/i);
            expect(stdout, 'has diagnostic error').not.to.match(/error/i);

            expect(Object.keys(dirContent)).to.include.members([
                'packages/project-a/dist/style.st.css.d.ts',
            ]);

            expect(Object.keys(dirContent)).to.not.include.members([
                'packages/project-b/dist/style.st.css.d.ts',
            ]);
        });

        it('should handle topological watch built order', () => {
            populateDirectorySync(tempDir.path, {
                'package.json': JSON.stringify({
                    name: 'workspace',
                    version: '0.0.0',
                    private: true,
                }),
                packages: {
                    'project-a': {
                        'style.st.css': `
                        @st-import B from "../project-b/dist/style.st.css";

                        .root {
                            -st-extends: B;
                            color: gold;
                        }

                        .foo {}
                        `,
                        'package.json': `{
                            "name": "a", 
                            "version": "0.0.0",
                            "dependencies": {
                                "b": "0.0.0"
                            }
                        }`,
                    },
                    'project-b': {
                        'style.st.css': `.root{color:red}`,
                        'package.json': `{
                            "name": "b", 
                            "version": "0.0.0"
                        }`,
                    },
                    'project-c': {
                        'style.st.css': `
                        @st-import [foo] from "../project-a/dist/style.st.css";

                        .root {
                            -st-extends: foo;
                            color: gold;
                        }
                        `,
                        'package.json': `{
                            "name": "c", 
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
                        outputSources: true,
                        cjs: false,
                    },
                    projects: ['packages/*']
                })
                `,
            });

            const { stdout, stderr } = runCliSync(['--rootDir', tempDir.path]);

            expect(stderr, 'has cli error').not.to.match(/error/i);
            expect(stdout, 'has diagnostic error').not.to.match(/error/i);
        });

        it('should handle multiple build outputs with different options for specific request', () => {
            populateDirectorySync(tempDir.path, {
                'package.json': JSON.stringify({
                    name: 'workspace',
                    version: '0.0.0',
                    private: true,
                }),
                packages: {
                    'project-a': {
                        test: {
                            'style.st.css': `.test: {color: gold}`,
                        },
                        src: {
                            'style.st.css': `
                                .root {color: blue;}
                                .foo {color:red;}
                            `,
                        },
                        'package.json': `{
                            "name": "a", 
                            "version": "0.0.0"
                        }`,
                    },
                },
                'stylable.config.js': `
                exports.stcConfig = () => ({ 
                    options: { 
                        outDir: './dist',
                        outputSources: true,
                        cjs: false,
                        dts: true
                    },
                    projects: {
                        'packages/*': {
                            options: [
                                {
                                    srcDir: 'src'
                                },
                                {
                                    outDir: './dist/test',
                                    srcDir: 'test',
                                    dts: false
                                }
                            ]
                        }
                    }
                })
                `,
            });

            const { stdout, stderr } = runCliSync(['--rootDir', tempDir.path]);
            const dirContent = loadDirSync(tempDir.path);

            expect(stderr, 'has cli error').not.to.match(/error/i);
            expect(stdout, 'has diagnostic error').not.to.match(/error/i);

            expect(Object.keys(dirContent)).to.include.members([
                'packages/project-a/dist/test/style.st.css',
                'packages/project-a/dist/style.st.css',
                'packages/project-a/dist/style.st.css.d.ts',
            ]);

            expect(Object.keys(dirContent)).not.to.include.members([
                'packages/project-a/dist/test/style.st.css.d.ts',
            ]);
        });

        it('should throw when the property "projects" is invalid', () => {
            // TODO
        });

        it('should prioritize build order by projects specification', () => {
            populateDirectorySync(tempDir.path, {
                'package.json': JSON.stringify({
                    name: 'workspace',
                    version: '0.0.0',
                    private: true,
                }),
                packages: {
                    'project-a': {
                        'style.st.css': `.root{color:red}`,
                        'package.json': `{
                            "name": "a", 
                            "version": "0.0.0"
                        }`,
                    },
                    'prebuild-b': {
                        'style.st.css': `.root{color:blue}`,
                        'package.json': `{
                            "name": "b", 
                            "version": "0.0.0",
                            "dependencies": {
                                "a": "0.0.0"
                            }
                        }`,
                    },
                    'prebuild-c': {
                        'style.st.css': `.root{color:blue}`,
                        'package.json': `{
                            "name": "c", 
                            "version": "0.0.0",
                            "dependencies": {
                                "b": "0.0.0"
                            }
                        }`,
                    },
                    'project-d': {
                        'style.st.css': `.root{color:red}`,
                        'package.json': `{
                            "name": "d", 
                            "version": "0.0.0",
                            "dependencies": {
                                "b": "0.0.0"
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
                    projects: [
                        'packages/prebuild-*',
                        'packages/*'
                    ]
                })
                `,
            });

            const { stdout, stderr } = runCliSync(['--rootDir', tempDir.path]);

            const projectDIndex = stdout.indexOf('project-d');
            const projectAIndex = stdout.indexOf('project-a');
            const projectCIndex = stdout.indexOf('project-c');
            const projectBIndex = stdout.indexOf('project-b');

            expect(stderr, 'has cli error').not.to.match(/error/i);
            expect(stdout, 'has diagnostic error').not.to.match(/error/i);
            expect(projectDIndex, 'invalid build order')
                .to.be.greaterThan(projectAIndex)
                .and.greaterThan(projectCIndex)
                .and.greaterThan(projectBIndex);
        });

        it('should throw when have duplicate request', () => {
            populateDirectorySync(tempDir.path, {
                'package.json': JSON.stringify({
                    name: 'workspace',
                    version: '0.0.0',
                    private: true,
                }),
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
                },
                'stylable.config.js': `
                exports.stcConfig = () => ({ 
                    options: { 
                        outDir: './dist',
                    },
                    projects: [ 'packages/*', 'packages/*']
                })
                `,
            });

            const { stdout, stderr } = runCliSync(['--rootDir', tempDir.path]);

            expect(stdout, 'has diagnostic error').not.to.match(/error/i);
            expect(stderr).to.match(
                new RegExp(`Error: Stylable CLI config can not have a duplicate project requests`)
            );
        });
    });
});
