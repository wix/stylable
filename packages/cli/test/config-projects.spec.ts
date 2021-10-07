import { expect } from 'chai';
import { createTempDirectory, ITempDirectory } from 'create-temp-directory';
import { loadDirSync, populateDirectorySync, runCliSync } from './test-kit/cli-test-kit';

describe('Stylable CLI config multiple projects', function () {
    this.timeout(25000);
    let tempDir: ITempDirectory;

    beforeEach(async () => {
        tempDir = await createTempDirectory();
    });
    afterEach(async () => {
        await tempDir.remove();
    });

    describe('Options resolution and overrides', () => {
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
    });

    describe('Projects request resolution and ordering', () => {
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
    });

    describe('Projects validation', () => {
        it('should throw when the property "projects" is invalid', () => {
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
                        }`,
                    },
                },
                'stylable.config.js': `
                    exports.stcConfig = () => ({ 
                        options: { 
                            outDir: './dist',
                        },
                        projects: 999
                    })
                    `,
            });

            const { stdout, stderr } = runCliSync(['--rootDir', tempDir.path]);

            expect(stdout, 'has diagnostic error').not.to.match(/error/i);
            expect(stderr).to.match(new RegExp(`Error: Invalid projects type`));
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
