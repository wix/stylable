import { expect } from 'chai';
import { join } from 'path';
import {
    symlinkSymbol,
    loadDirSync,
    populateDirectorySync,
    runCliSync,
    createTempDirectory,
    ITempDirectory,
} from '@stylable/e2e-test-kit';
import { STVar } from '@stylable/core/dist/features';

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
        it('should handle multiple projects', () => {
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
                    },
                    projects: [
                        'packages/*',
                        [
                            'packages/project-b', 
                            {  dts: true }
                        ],
                    ]
                })
                `,
            });

            const { stdout, stderr } = runCliSync(['--rootDir', tempDir.path]);
            const dirContent = loadDirSync(tempDir.path);

            expect(stderr, 'has cli error').not.to.match(/error/i);
            expect(stdout, 'has diagnostic error').not.to.match(/error/i);

            expect(Object.keys(dirContent)).to.include.members([
                'packages/project-b/dist/style.st.css.d.ts',
            ]);

            expect(Object.keys(dirContent)).to.not.include.members([
                'packages/project-a/dist/style.st.css.d.ts',
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
                            'style.st.css': `.test {color: gold}`,
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
                        'packages/*': [
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
                        src: {
                            'style.st.css': `
                            @st-import B from "../../project-b/dist/style.st.css";

                            .root {
                                -st-extends: B;
                                color: gold;
                            }

                            .foo {}
                    `,
                        },
                        'package.json': `{
                                "name": "a", 
                                "version": "0.0.0",
                                "dependencies": {
                                    "b": "0.0.0"
                                }
                            }`,
                    },
                    'project-b': {
                        src: {
                            'style.st.css': `.root{color:red}`,
                        },
                        'package.json': `{
                                "name": "b", 
                                "version": "0.0.0"
                            }`,
                    },
                    'project-c': {
                        src: {
                            'style.st.css': `
                            @st-import [foo] from "../../project-a/dist/style.st.css";
    
                            .root {
                                -st-extends: foo;
                                color: gold;
                            }
                            `,
                        },
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
                            srcDir: './src',
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

            const { stdout, stderr } = runCliSync(['--rootDir', tempDir.path, '--log']);

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

        it('should resolve request from node_modules', () => {
            populateDirectorySync(tempDir.path, {
                'package.json': JSON.stringify({
                    name: 'workspace',
                    version: '0.0.0',
                    private: true,
                }),
                node_modules: {
                    a: {
                        type: symlinkSymbol,
                        path: join('..', '..', 'packages', 'project-a'),
                    },
                    b: {
                        type: symlinkSymbol,
                        path: join('..', '..', 'packages', 'project-b'),
                    },
                },
                packages: {
                    'project-a': {
                        'style.st.css': `
                            @st-import B from "${join('b', 'dist', 'style.st.css')}";
    
                            .root {
                                -st-extends: B;
                                color: gold;
                            }
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
    });

    describe('Projects validation', () => {
        it('should dedup and sort diagnostics across build processes', () => {
            populateDirectorySync(tempDir.path, {
                'package.json': JSON.stringify({
                    name: 'workspace',
                    version: '0.0.0',
                    private: true,
                }),
                packages: {
                    'project-a': {
                        'mixin.js': `
                        let count = 0;
                        let errors = 0
                        module.exports = () => {
                            count++;
                            if (count === 1 || count === 4) {
                                return 'red';
                            } else {
                                throw new Error('error ' + ++errors);
                            }
                        }
                        `,
                        'style.st.css': `
                        @st-import color from './mixin.js';

                        .root { 
                            color1: color();
                            color2: color();
                            x: value(unknown);
                        }
                        `,
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
                        },
                        projects: {
                            'packages/*': [{}, {}]
                        }
                    })
                    `,
            });

            const { stdout } = runCliSync(['--rootDir', tempDir.path]);

            const firstError = stdout.indexOf('error 1');
            const stylableError = stdout.indexOf(STVar.diagnostics.UNKNOWN_VAR('unknown').message);
            const secondError = stdout.indexOf('error 2');

            expect(firstError, 'sorted by location')
                .to.be.lessThan(stylableError)
                .and.lessThan(secondError);
            expect(stdout.match(STVar.diagnostics.UNKNOWN_VAR('unknown').message)?.length).to.eql(
                1
            );
        });

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

        it('should throw when request does not resolve', () => {
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
                        projects: ['packages/project-b']
                    })
                    `,
            });

            const { stdout, stderr } = runCliSync(['--rootDir', tempDir.path]);

            expect(stdout, 'has diagnostic error').not.to.match(/error/i);
            expect(stderr).to.match(
                new RegExp(
                    `Error: Stylable CLI config can not resolve project request "packages/project-b"`
                )
            );
        });

        it('should throw when request has invalid single value', () => {
            populateDirectorySync(tempDir.path, {
                'package.json': JSON.stringify({
                    name: 'workspace',
                    version: '0.0.0',
                    private: true,
                }),
                packages: {
                    'project-a': {
                        src: {
                            'style.st.css': `.root{color:red}`,
                        },
                        'package.json': JSON.stringify({
                            name: 'a',
                            version: '0.0.0',
                        }),
                    },
                },
                'stylable.config.js': `
                    exports.stcConfig = () => ({ 
                        options: { 
                            outDir: './dist',
                            srcDir: './src',
                        },
                        projects: [
                            [ 'packages/*', 5 ],
                        ]
                   })
                `,
            });

            const { stdout, stderr } = runCliSync(['--rootDir', tempDir.path]);

            expect(stdout, 'has diagnostic error').not.to.match(/error/i);
            expect(stderr, 'has cli error').to.include('Error: Cannot resolve entry "5"');
        });

        it('should throw when request has invalid value in multiple entry values', () => {
            populateDirectorySync(tempDir.path, {
                'package.json': JSON.stringify({
                    name: 'workspace',
                    version: '0.0.0',
                    private: true,
                }),
                packages: {
                    'project-a': {
                        src: {
                            'style.st.css': `.root{color:red}`,
                        },
                        'package.json': JSON.stringify({
                            name: 'a',
                            version: '0.0.0',
                        }),
                    },
                },
                'stylable.config.js': `
                    exports.stcConfig = () => ({ 
                        options: { 
                            outDir: './dist',
                            srcDir: './src',
                        },
                        projects: [
                            [ 'packages/*', [{ dts: true }, true] ],
                        ]
                   })
                `,
            });

            const { stdout, stderr } = runCliSync(['--rootDir', tempDir.path]);

            expect(stdout, 'has diagnostic error').not.to.match(/error/i);
            expect(stderr, 'has cli error').to.include('Error: Cannot resolve entry "true"');
        });

        it('should throw when has invalid "dts" configuration in single project', () => {
            populateDirectorySync(tempDir.path, {
                'package.json': JSON.stringify({
                    name: 'workspace',
                    version: '0.0.0',
                    private: true,
                }),
                packages: {
                    'project-a': {
                        src: {
                            'style.st.css': `.root{color:red}`,
                        },
                        'package.json': JSON.stringify({
                            name: 'a',
                            version: '0.0.0',
                        }),
                    },
                },
                'stylable.config.js': `
                    exports.stcConfig = () => ({ 
                        options: { 
                            outDir: './dist',
                            srcDir: './src',
                        },
                        projects: [
                            [ 'packages/*', {dts: false, dtsSourceMap: true} ],
                        ]
                   })
                `,
            });

            const { stdout, stderr } = runCliSync(['--rootDir', tempDir.path]);

            expect(stdout, 'has diagnostic error').not.to.match(/error/i);
            expect(stderr, 'has cli error').to.include(
                'Error: "packages/*" options - "dtsSourceMap" requires turning on "dts"'
            );
        });
    });
});
