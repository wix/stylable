import { buildMessages } from '@stylable/cli/dist/messages';
import { STImport } from '@stylable/core/dist/features';
import {
    createCliTester,
    loadDirSync,
    populateDirectorySync,
    writeToExistingFile,
} from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { createTempDirectory, ITempDirectory } from 'create-temp-directory';
import { realpathSync, writeFileSync } from 'fs';
import { join, sep } from 'path';

describe('Stylable Cli Watch - Multiple projects', () => {
    let tempDir: ITempDirectory;
    const { run, cleanup } = createCliTester();
    beforeEach(async () => {
        tempDir = await createTempDirectory();
        // This is used to make the output paths matching consistent since we use the real path in the logs of the CLI
        tempDir.path = realpathSync(tempDir.path);
    });
    afterEach(async () => {
        cleanup();
        await tempDir.remove();
    });

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
                    msg: buildMessages.START_WATCHING(),
                    action() {
                        writeToExistingFile(
                            join(tempDir.path, 'packages', 'project-a', 'style.st.css'),
                            '.root{ color:yellow; }'
                        );
                    },
                },
                {
                    msg: buildMessages.FINISHED_PROCESSING(
                        1,
                        join(tempDir.path, 'packages', 'project-a')
                    ),
                },
            ],
        });

        const files = loadDirSync(tempDir.path);
        expect(files).to.contain({
            'packages/project-a/dist/style.st.css': '.root{ color:yellow; }',
        });
    });

    it('should re-build derived files deep in the relevent package only', async () => {
        populateDirectorySync(tempDir.path, {
            'package.json': `{"name": "test", "version": "0.0.0"}`,
            'stylable.config.js': `
                exports.stcConfig = () => ({
                    options: {
                        outDir: './dist',
                        srcDir: './src',
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
                    src: {
                        'style.st.css': `
                            @st-import [color] from "../../project-b/dist/depend.st.css";
                            .root{ color:value(color); }
                        `,
                    },
                },
                'project-b': {
                    'package.json': JSON.stringify({
                        name: 'b',
                        version: '0.0.0',
                    }),
                    src: {
                        'depend.st.css': `
                            :vars {
                                color: red;
                            }
                        `,
                    },
                },
            },
        });

        await run({
            dirPath: tempDir.path,
            args: ['-w'],
            steps: [
                {
                    msg: buildMessages.START_WATCHING(),
                    action() {
                        writeToExistingFile(
                            join(tempDir.path, './packages/project-b/src/depend.st.css'),
                            `:vars {
                                    color: blue;
                                }`
                        );
                    },
                },
                {
                    msg: buildMessages.FINISHED_PROCESSING(1, sep + join('packages', 'project-b')),
                },
                {
                    msg: buildMessages.FINISHED_PROCESSING(1, sep + join('packages', 'project-a')),
                },
            ],
        });

        const files = loadDirSync(tempDir.path);
        expect(files['packages/project-a/dist/style.css']).to.include('color:blue');
        expect(
            Object.keys(files).some(
                (fileName) => fileName.includes('project-b') && fileName.includes('style.st.css')
            ),
            'have files from package "a" inside package "b"'
        ).to.eql(false);
        expect(
            Object.keys(files).some(
                (fileName) => fileName.includes('project-a') && fileName.includes('depend.st.css')
            ),
            'have files from package "b" inside package "a"'
        ).to.eql(false);
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
                    msg: buildMessages.START_WATCHING(),
                    action() {
                        writeFileSync(
                            join(tempDir.path, 'packages', 'project-a', 'style.st.css'),
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
                    msg: buildMessages.FINISHED_PROCESSING(1, sep + join('packages', 'project-a')),
                    action() {
                        writeToExistingFile(
                            join(tempDir.path, 'packages', 'project-b', 'foo.st.css'),
                            `
                                .foo {}
                                .bar {}
                                `
                        );
                    },
                },
                {
                    msg: buildMessages.FINISHED_PROCESSING(1, sep + join('packages', 'project-b')),
                },
                {
                    msg: buildMessages.FINISHED_PROCESSING(1, sep + join('packages', 'project-a')),
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

    it('should trigger build when changing js mixin', async () => {
        populateDirectorySync(tempDir.path, {
            'package.json': `{"name": "test", "version": "0.0.0"}`,
            'stylable.config.js': `
                exports.stcConfig = () => ({
                    options: {
                        outDir: './dist',
                        outputCSS: true,
                        outputSources: true
                    },
                    projects: [
                        'packages/*',
                        ['packages/project-a', {
                                srcDir: './src',
                            }
                        ]
                    ]
                })`,
            packages: {
                'project-a': {
                    'package.json': JSON.stringify({
                        name: 'a',
                        version: '0.0.0',
                        dependencies: { b: '0.0.0' },
                    }),
                    src: {
                        'style.st.css': `
                            @st-import [color] from "../../project-b/mixin";
                            .root{ color:value(color); }
                        `,
                    },
                },
                'project-b': {
                    'package.json': JSON.stringify({
                        name: 'b',
                        version: '0.0.0',
                    }),
                    'mixin.js': `
                            module.exports = {
                                color: 'red'
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
                    msg: buildMessages.START_WATCHING(),
                    action() {
                        writeToExistingFile(
                            join(tempDir.path, './packages/project-b/mixin.js'),
                            `module.exports = {
                                    color: 'blue'
                                }`
                        );
                    },
                },
                {
                    msg: buildMessages.FINISHED_PROCESSING(1, sep + join('packages', 'project-a')),
                },
            ],
        });

        const files = loadDirSync(tempDir.path);
        expect(files['packages/project-a/dist/style.css']).to.include('color:blue');
    });

    it('should report error on watch mode', async () => {
        populateDirectorySync(tempDir.path, {
            'package.json': `{"name": "test", "version": "0.0.0"}`,
            'stylable.config.js': `
                exports.stcConfig = () => ({
                    options: {
                        outDir: './dist',
                        outputSources: true,
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
                    msg: buildMessages.START_WATCHING(),
                    action() {
                        writeToExistingFile(
                            join(tempDir.path, 'packages', 'project-a', 'style.st.css'),
                            '.root{ color:yellow; {} }'
                        );
                    },
                },
                {
                    msg: buildMessages.FINISHED_PROCESSING(
                        1,
                        join(tempDir.path, 'packages', 'project-a')
                    ),
                },
                {
                    msg: '[error]: nesting of rules within rules is not supported',
                    action() {
                        writeToExistingFile(
                            join(tempDir.path, 'packages', 'project-a', 'style.st.css'),
                            '.root{ color:blue; }'
                        );
                    },
                },
                {
                    msg: buildMessages.FINISHED_PROCESSING(
                        1,
                        join(tempDir.path, 'packages', 'project-a')
                    ),
                },
            ],
        });

        const files = loadDirSync(tempDir.path);
        expect(files).to.contain({
            'packages/project-a/dist/style.st.css': '.root{ color:blue; }',
        });
    });

    it('should keep diagnostics when a project depends on another project output', async () => {
        populateDirectorySync(tempDir.path, {
            'package.json': `{"name": "test", "version": "0.0.0"}`,
            'stylable.config.js': `
                exports.stcConfig = () => ({
                    presets: {
                        pkg: {
                            srcDir: './src',
                            outDir: './dist',
                            outputSources: true,
                        },
                        index: {
                            srcDir: './dist',
                            indexFile: './index.st.css',
                        }
                    },
                    options: {
                        cjs: false,
                    },
                    projects: {
                        'packages/project-a': ['pkg', 'index']
                    }
                })`,
            packages: {
                'project-a': {
                    'package.json': JSON.stringify({ name: 'a', version: '0.0.0' }),
                    src: {
                        'style.st.css': `
                            .root{ color:red; }
                        `,
                    },
                },
            },
        });

        await run({
            dirPath: tempDir.path,
            args: ['-w'],
            steps: [
                {
                    msg: buildMessages.START_WATCHING(),
                    action() {
                        writeToExistingFile(
                            join(tempDir.path, 'packages', 'project-a', 'src', 'style.st.css'),
                            `
                                @st-import Module from './does-not-exist.st.css';

                                .root{ -st-extends: Module; color:blue; }
                                `
                        );
                    },
                },
                {
                    msg: buildMessages.FINISHED_PROCESSING(
                        1,
                        `[1] ${sep + join('packages', 'project-a')}`
                    ),
                },
                {
                    msg: STImport.diagnostics.UNKNOWN_IMPORTED_FILE('./does-not-exist.st.css'),
                },
            ],
        });

        const files = loadDirSync(tempDir.path);
        expect(files['packages/project-a/dist/style.st.css']).to.include('color:blue;');
    });

    it('should not have duplicate diagnostics between shared dependency', async () => {
        populateDirectorySync(tempDir.path, {
            'package.json': `{"name": "test", "version": "0.0.0"}`,
            'stylable.config.js': `
                exports.stcConfig = () => ({
                    options: {
                        srcDir: './src',
                        outDir: './dist',
                        outputSources: true,
                    },
                    projects: ['packages/*']
                })`,
            packages: {
                'project-a': {
                    'package.json': JSON.stringify({ name: 'a', version: '0.0.0' }),
                    src: {
                        'style.st.css': `
                            @st-import Module from './does-not-exist.st.css';

                            .root{ -st-extends: Module; color:blue; }
                        `,
                    },
                },
                'project-b': {
                    'package.json': JSON.stringify({
                        name: 'b',
                        version: '0.0.0',
                    }),
                    src: {
                        'style.st.css': `
                            @st-import Amodule from '../../project-a/dist/style.st.css';

                            .root{ -st-extends: Amodule ; color:red; }
                        `,
                    },
                },
            },
        });

        const { output } = await run({
            dirPath: tempDir.path,
            args: ['-w'],
            steps: [
                {
                    msg: STImport.diagnostics.UNKNOWN_IMPORTED_FILE('./does-not-exist.st.css'),
                },
                {
                    msg: buildMessages.START_WATCHING(),
                },
            ],
        });

        expect(
            output.match(STImport.diagnostics.UNKNOWN_IMPORTED_FILE('./does-not-exist.st.css'))
        ).to.lengthOf(1);
    });
});
