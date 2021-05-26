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
                        return true;
                    },
                },
                {
                    msg: messages.FINISHED_PROCESSING,
                    action() {
                        return false;
                    },
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
                        return true;
                    },
                },
                {
                    msg: messages.FINISHED_PROCESSING,
                    action() {
                        return false;
                    },
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
                        writeFileSync(join(tempDir.path, 'style.st.css'), `.root{ color:green }`);
                        return true;
                    },
                },
                {
                    msg: messages.FINISHED_PROCESSING,
                    action() {
                        return false;
                    },
                },
            ],
        });
        const files = loadDirSync(tempDir.path);
        expect(files['dist/style.css']).to.include('color:green');
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
                        return true;
                    },
                },
                {
                    msg: messages.FINISHED_PROCESSING,
                    action() {
                        return false;
                    },
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
                        return true;
                    },
                },
                {
                    msg: messages.FINISHED_PROCESSING,
                    action() {
                        return false;
                    },
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
                        return true;
                    },
                },
                {
                    msg: messages.FINISHED_PROCESSING,
                    action() {
                        return false;
                    },
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
                        return true;
                    },
                },
                {
                    msg: messages.FINISHED_PROCESSING,
                    action() {
                        return true;
                    },
                },
                {
                    msg: messages.FINISHED_PROCESSING,
                    action() {
                        return false;
                    },
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
                        writeFileSync(join(tempDir.path, 'style.st.css'), `.root{ color:green }`);
                        return true;
                    },
                },
                {
                    msg: messages.FINISHED_PROCESSING,
                    action() {
                        writeFileSync(join(tempDir.path, 'comp.st.css'), `.root{ color:green }`);
                        return true;
                    },
                },
                {
                    msg: messages.FINISHED_PROCESSING,
                    action() {
                        return false;
                    },
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
