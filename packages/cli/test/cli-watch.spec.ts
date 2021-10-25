import { writeFileSync, unlinkSync, rmdirSync, renameSync } from 'fs';
import { join } from 'path';
import { expect } from 'chai';
import { createTempDirectory, ITempDirectory } from 'create-temp-directory';
import { messages } from '@stylable/cli';
import {
    createCliTester,
    loadDirSync,
    populateDirectorySync,
    runCliSync,
    writeToExistingFile,
} from './test-kit/cli-test-kit';

describe('Stylable Cli Watch', () => {
    let tempDir: ITempDirectory;
    const { run, cleanup } = createCliTester();
    beforeEach(async () => {
        tempDir = await createTempDirectory();
    });
    afterEach(async () => {
        cleanup();
        await tempDir.remove();
    });

    describe('Single project', () => {
        it('simple watch mode', async () => {
            populateDirectorySync(tempDir.path, {
                'package.json': `{"name": "test", "version": "0.0.0"}`,
                'style.st.css': `
                @st-import X from "./depend.st.css";
                .root{ color:red; }
            `,
                'depend.st.css': `
                .root{ color:green; }
            `,
            });

            await run({
                dirPath: tempDir.path,
                args: ['--outDir', './dist', '-w', '--cjs=false', '--stcss'],
                steps: [
                    {
                        msg: messages.START_WATCHING,
                        action() {
                            writeToExistingFile(
                                join(tempDir.path, 'depend.st.css'),
                                '.root{ color:yellow; }'
                            );
                        },
                    },
                    {
                        msg: messages.FINISHED_PROCESSING,
                    },
                ],
            });

            expect(loadDirSync(tempDir.path)).to.contain({
                'dist/depend.st.css': '.root{ color:yellow; }',
            });
        });

        it('should re-build derived files deep', async () => {
            populateDirectorySync(tempDir.path, {
                'package.json': `{"name": "test", "version": "0.0.0"}`,
                'style.st.css': `
                @st-import [color] from "./depend.st.css";
                .root{ color:value(color); }
            `,
                'depend.st.css': `
                @st-import [color] from "./deep.st.css";
            `,
                'deep.st.css': `
                :vars {
                    color: red;
                }
            `,
            });

            await run({
                dirPath: tempDir.path,
                args: ['--outDir', './dist', '-w', '--cjs=false', '--css'],
                steps: [
                    {
                        msg: messages.START_WATCHING,
                        action() {
                            writeToExistingFile(
                                join(tempDir.path, 'deep.st.css'),
                                ':vars { color: green; }'
                            );
                        },
                    },
                    {
                        msg: messages.FINISHED_PROCESSING,
                    },
                ],
            });
            const files = loadDirSync(tempDir.path);
            expect(files['dist/style.css']).to.include('color:green');
        });

        it('should build newly added files', async () => {
            populateDirectorySync(tempDir.path, {
                'package.json': `{"name": "test", "version": "0.0.0"}`,
            });

            await run({
                dirPath: tempDir.path,
                args: ['--outDir', './dist', '-w', '--cjs=false', '--css'],
                steps: [
                    {
                        msg: messages.START_WATCHING,
                        action() {
                            writeFileSync(
                                join(tempDir.path, 'style.st.css'),
                                `.root{ color:green }`
                            );
                        },
                    },
                    {
                        msg: messages.FINISHED_PROCESSING,
                    },
                ],
            });
            const files = loadDirSync(tempDir.path);
            expect(files['dist/style.css']).to.include('color:green');
        });

        it('should handle assets changes', async () => {
            const getSvgContent = (cx: number) => `<svg height="100" width="100">
            <circle cx="${cx}" cy="50" r="40" stroke="black" stroke-width="3" fill="red" />
        </svg> 
        `;
            populateDirectorySync(tempDir.path, {
                'package.json': `{"name": "test", "version": "0.0.0"}`,
                'style.st.css': `.root{ background: url('./asset.svg'); }`,
                'asset.svg': getSvgContent(50),
            });

            const NEW_SIZE = 150;

            await run({
                dirPath: tempDir.path,
                args: ['--outDir', './dist', '-w', '--cjs=false', '--css'],
                steps: [
                    {
                        msg: messages.START_WATCHING,
                        action() {
                            writeFileSync(join(tempDir.path, 'asset.svg'), getSvgContent(NEW_SIZE));
                        },
                    },
                    {
                        msg: messages.FINISHED_PROCESSING,
                    },
                ],
            });
            const files = loadDirSync(tempDir.path);
            expect(files['dist/style.css']).to.include('background:');
            expect(files['dist/asset.svg']).to.include(getSvgContent(NEW_SIZE));
        });

        it('should handle deleted files', async () => {
            populateDirectorySync(tempDir.path, {
                'package.json': `{"name": "test", "version": "0.0.0"}`,
                'style.st.css': `.root{ color: red }`,
            });

            await run({
                dirPath: tempDir.path,
                args: ['--outDir', './dist', '-w', '--cjs', '--css'],
                steps: [
                    {
                        msg: messages.START_WATCHING,
                        action() {
                            unlinkSync(join(tempDir.path, 'style.st.css'));
                        },
                    },
                    {
                        msg: messages.FINISHED_PROCESSING,
                    },
                ],
            });
            const files = loadDirSync(tempDir.path);
            expect(files).to.eql({
                'package.json': `{"name": "test", "version": "0.0.0"}`,
            });
        });

        it('should handle deleted folders', async () => {
            populateDirectorySync(tempDir.path, {
                'package.json': `{"name": "test", "version": "0.0.0"}`,
                styles: { 'style.st.css': `.root{ color: red }` },
            });

            await run({
                dirPath: tempDir.path,
                args: ['--outDir', './dist', '-w', '--cjs', '--css'],
                steps: [
                    {
                        msg: messages.START_WATCHING,
                        action() {
                            rmdirSync(join(tempDir.path, 'styles'), { recursive: true });
                        },
                    },
                    {
                        msg: messages.FINISHED_PROCESSING,
                    },
                ],
            });
            const files = loadDirSync(tempDir.path);
            expect(files).to.eql({
                'package.json': `{"name": "test", "version": "0.0.0"}`,
            });
        });

        it('should handle deleted folders with deep watched files', async () => {
            populateDirectorySync(tempDir.path, {
                'package.json': `{"name": "test", "version": "0.0.0"}`,
                styles: {
                    deep: { 'style.st.css': `.root{ color: red }` },
                },
            });

            await run({
                dirPath: tempDir.path,
                args: ['--outDir', './dist', '-w', '--cjs', '--css'],
                steps: [
                    {
                        msg: messages.START_WATCHING,
                        action() {
                            rmdirSync(join(tempDir.path, 'styles'), { recursive: true });
                        },
                    },
                    {
                        msg: messages.FINISHED_PROCESSING,
                    },
                ],
            });
            const files = loadDirSync(tempDir.path);
            expect(files).to.eql({
                'package.json': `{"name": "test", "version": "0.0.0"}`,
            });
        });

        it('should handle renames of files', async () => {
            populateDirectorySync(tempDir.path, {
                'package.json': `{"name": "test", "version": "0.0.0"}`,
                'style.st.css': `.root{ color: red }`,
            });

            await run({
                dirPath: tempDir.path,
                args: ['--outDir', './dist', '-w', '--cjs', '--css'],
                steps: [
                    {
                        msg: messages.START_WATCHING,
                        action() {
                            renameSync(
                                join(tempDir.path, 'style.st.css'),
                                join(tempDir.path, 'style-renamed.st.css')
                            );
                        },
                    },
                    {
                        msg: messages.FINISHED_PROCESSING,
                    },
                    {
                        msg: messages.FINISHED_PROCESSING,
                    },
                ],
            });
            const files = loadDirSync(tempDir.path);
            expect(files['dist/style-renamed.css']).to.include(`color: red`);
            expect(files).to.include({
                'package.json': '{"name": "test", "version": "0.0.0"}',
                'style-renamed.st.css': '.root{ color: red }',
            });
        });

        // it.only('should handle renames of folders', async () => {
        //     populateDirectorySync(tempDir.path, {
        //         'package.json': `{"name": "test", "version": "0.0.0"}`,
        //         styles: {
        //             deep: { 'style.st.css': `.root{ color: red }` },
        //         },
        //     });

        //     await run({
        //         dirPath: tempDir.path,
        //         args: ['--outDir', './dist', '-w', '--cjs', '--css'],
        //         steps: [
        //             {
        //                 msg: messages.START_WATCHING,
        //                 action() {
        //                     renameSync(
        //                         join(tempDir.path, 'styles'),
        //                         join(tempDir.path, 'styles-renamed')
        //                     );
        //                     return true;
        //                 },
        //             },
        //             {
        //                 msg: messages.FINISHED_PROCESSING,
        //                 action() {
        //                     return true;
        //                 },
        //             },
        //             {
        //                 msg: messages.FINISHED_PROCESSING,
        //                 action() {
        //                     return false;
        //                 },
        //             },
        //         ],
        //     });
        //     const files = loadDirSync(tempDir.path);
        //     expect(files['dist/style-renamed.css']).to.include(`color: red`);
        //     expect(files).to.include({
        //         'package.json': '{"name": "test", "version": "0.0.0"}',
        //         'style-renamed.st.css': '.root{ color: red }',
        //     });
        // });

        // it('should ignore source files in dist');

        it('should re-build indexes', async () => {
            populateDirectorySync(tempDir.path, {
                'package.json': `{"name": "test", "version": "0.0.0"}`,
            });

            await run({
                dirPath: tempDir.path,
                args: ['--outDir', './dist', '-w', '--indexFile', 'index.st.css'],
                steps: [
                    {
                        msg: messages.START_WATCHING,
                        action() {
                            writeFileSync(
                                join(tempDir.path, 'style.st.css'),
                                `.root{ color:green }`
                            );
                        },
                    },
                    {
                        msg: messages.FINISHED_PROCESSING,
                        action() {
                            writeToExistingFile(
                                join(tempDir.path, 'style.st.css'),
                                `.root{ color:blue }`
                            );
                        },
                    },
                    {
                        msg: messages.FINISHED_PROCESSING,
                        action() {
                            writeFileSync(
                                join(tempDir.path, 'comp.st.css'),
                                `.root{ color:green }`
                            );
                        },
                    },
                    {
                        msg: messages.FINISHED_PROCESSING,
                    },
                ],
            });
            const files = loadDirSync(tempDir.path);
            expect(files['dist/index.st.css']).to.include('style.st.css');
            expect(files['dist/index.st.css']).to.include('comp.st.css');
        });

        it('should error when source dir match out dir and output sources enabled', () => {
            populateDirectorySync(tempDir.path, {
                'package.json': `{"name": "test", "version": "0.0.0"}`,
            });

            const res = runCliSync([
                '--rootDir',
                tempDir.path,
                '--outDir',
                './',
                '--srcDir',
                './',
                '-w',
                '--stcss',
                '--cjs=false',
            ]);
            expect(res.stderr).to.contain(
                'Error: Invalid configuration: When using "stcss" outDir and srcDir must be different.'
            );
        });
    });

    describe.skip('Multiple Projects', () => {
        it('simple watch mode on one project', async () => {
            populateDirectorySync(tempDir.path, {
                'package.json': `{"name": "test", "version": "0.0.0"}`,
                'stylable.config.js': `
                exports.stcConfig = () => ({
                    options: {
                        outDir: './dist',
                        outputSources: true
                    },
                    projects: ['packages/*']
                })`,
                packages: {
                    'project-a': {
                        'package.json': JSON.stringify({ name: 'a', version: '0.0.0' }),
                        'style.st.css': `
                            .root{ color:red; }
                        `,
                    },
                },
            });

            await run({
                dirPath: tempDir.path,
                args: ['-w'],
                steps: [
                    {
                        msg: messages.START_WATCHING,
                        action() {
                            writeToExistingFile(
                                join(tempDir.path, './packages/project-a/style.st.css'),
                                '.root{ color:yellow; }'
                            );
                        },
                    },
                    {
                        msg: messages.FINISHED_PROCESSING,
                    },
                ],
            });

            const files = loadDirSync(tempDir.path);
            expect(files).to.contain({
                'packages/project-a/dist/style.st.css': '.root{ color:yellow; }',
            });
        });

        it('should re-build derived files deep for the relevant scope', async () => {
            populateDirectorySync(tempDir.path, {
                'package.json': `{"name": "test", "version": "0.0.0"}`,
                'stylable.config.js': `
                exports.stcConfig = () => ({
                    options: {
                        outDir: './dist',
                        outputCSS: true,
                        outputSources: true
                    },
                    projects: ['packages/*']
                })`,
                packages: {
                    'project-a': {
                        'package.json': JSON.stringify({
                            name: 'a',
                            version: '0.0.0',
                            dependencies: { b: '0.0.0' },
                        }),
                        'style.st.css': `
                            @st-import [color] from "../project-b/dist/depend.st.css";
                            .root{ color:value(color); }
                        `,
                    },
                    'project-b': {
                        'package.json': JSON.stringify({
                            name: 'b',
                            version: '0.0.0',
                        }),
                        'depend.st.css': `
                            :vars {
                                color: red;
                            }
                        `,
                    },
                },
            });

            await run({
                dirPath: tempDir.path,
                args: ['-w'],
                steps: [
                    {
                        msg: messages.START_WATCHING,
                        action() {
                            writeToExistingFile(
                                join(tempDir.path, './packages/project-b/depend.st.css'),
                                `:vars {
                                    color: blue;
                                }`
                            );
                        },
                    },
                    {
                        msg: [messages.FINISHED_PROCESSING, 'project-a'],
                    },
                ],
            });

            const files = loadDirSync(tempDir.path);
            expect(files['packages/project-a/dist/style.css']).to.include('color:blue');
            expect(
                Object.keys(files).some((file) => file.includes(tempDir.path)),
                'build dependency from the wrong scope (build from scope "b" inside scope "a")'
            ).to.be.false;
        });

        it('should re-build index files', async () => {
            populateDirectorySync(tempDir.path, {
                'package.json': `{"name": "test", "version": "0.0.0"}`,
                'stylable.config.js': `
                exports.stcConfig = () => {
                    return {
                        options: {
                            outputSources: true,
                            cjs: false,
                            outDir: './dist',
                            outputCSS: true,
                        },
                        projects: [
                            'packages/*',
                            [
                                'packages/project-b',
                                {
                                    indexFile: './index.st.css',
                                },
                            ],
                        ],
                    };
                };
                `,
                packages: {
                    'project-a': {
                        'package.json': JSON.stringify({
                            name: 'a',
                            version: '0.0.0',
                            dependencies: { b: '0.0.0' },
                        }),
                        'style.st.css': `
                        @st-import [Foo] from "../project-b/dist/index.st.css";
                        .a { 
                            -st-extends: Foo; 
                        }
                        
                        .a::foo {
                            color: red
                        }
                        `,
                    },
                    'project-b': {
                        'package.json': JSON.stringify({
                            name: 'b',
                            version: '0.0.0',
                        }),
                        'foo.st.css': `
                            .foo {}
                        `,
                    },
                },
            });

            await run({
                dirPath: tempDir.path,
                args: ['-w'],
                steps: [
                    {
                        msg: messages.START_WATCHING,
                        action() {
                            writeToExistingFile(
                                join(tempDir.path, './packages/project-b/foo.st.css'),
                                `
                                .foo {}
                                .bar {}
                                `
                            );
                        },
                    },
                    {
                        msg: [messages.FINISHED_PROCESSING, 'project-b'],
                        action() {
                            writeFileSync(
                                join(tempDir.path, './packages/project-a/style.st.css'),
                                `
                            @st-import [Foo] from "../project-b/dist/index.st.css";
                            .a { 
                                -st-extends: Foo; 
                            }
                            
                            .a::foo {color: red;}

                            .a::bar {color: blue;}
                            `
                            );
                        },
                    },
                    {
                        msg: [messages.FINISHED_PROCESSING, 'project-a'],
                    },
                ],
            });

            const files = loadDirSync(tempDir.path);
            expect(files['packages/project-a/dist/style.css']).to.match(
                /foo[0-9]+__foo {color: red;}/g
            );
            expect(files['packages/project-a/dist/style.css']).to.match(
                /foo[0-9]+__bar {color: blue;}/g
            );
        });
    });
});
