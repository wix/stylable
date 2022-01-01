import { errorMessages, buildMessages } from '@stylable/cli/dist/messages';
import { STImport } from '@stylable/core/dist/features';
import {
    createCliTester,
    escapeRegExp,
    loadDirSync,
    populateDirectorySync,
    writeToExistingFile,
} from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { createTempDirectory, ITempDirectory } from 'create-temp-directory';
import { realpathSync, renameSync, rmdirSync, unlinkSync, writeFileSync } from 'fs';
import { join, sep } from 'path';

describe('Stylable Cli Watch - Single project', () => {
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
                    msg: buildMessages.START_WATCHING(),
                    action() {
                        writeToExistingFile(
                            join(tempDir.path, 'depend.st.css'),
                            '.root{ color:yellow; }'
                        );
                    },
                },
                {
                    msg: buildMessages.FINISHED_PROCESSING(2),
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
                    msg: buildMessages.START_WATCHING(),
                    action() {
                        writeToExistingFile(
                            join(tempDir.path, 'deep.st.css'),
                            ':vars { color: green; }'
                        );
                    },
                },
                {
                    msg: buildMessages.FINISHED_PROCESSING(3),
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
                    msg: buildMessages.START_WATCHING(),
                    action() {
                        writeFileSync(join(tempDir.path, 'style.st.css'), `.root{ color:green }`);
                    },
                },
                {
                    msg: buildMessages.FINISHED_PROCESSING(1),
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
                    msg: buildMessages.START_WATCHING(),
                    action() {
                        writeFileSync(join(tempDir.path, 'asset.svg'), getSvgContent(NEW_SIZE));
                    },
                },
                {
                    msg: buildMessages.FINISHED_PROCESSING(1),
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
                    msg: buildMessages.START_WATCHING(),
                    action() {
                        unlinkSync(join(tempDir.path, 'style.st.css'));
                    },
                },
                {
                    msg: buildMessages.FINISHED_PROCESSING(1),
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
                    msg: buildMessages.START_WATCHING(),
                    action() {
                        rmdirSync(join(tempDir.path, 'styles'), { recursive: true });
                    },
                },
                {
                    msg: buildMessages.FINISHED_PROCESSING(1),
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
                    msg: buildMessages.START_WATCHING(),
                    action() {
                        rmdirSync(join(tempDir.path, 'styles'), { recursive: true });
                    },
                },
                {
                    msg: buildMessages.FINISHED_PROCESSING(1),
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
                    msg: buildMessages.START_WATCHING(),
                    action() {
                        renameSync(
                            join(tempDir.path, 'style.st.css'),
                            join(tempDir.path, 'style-renamed.st.css')
                        );
                    },
                },
                {
                    // Deleted
                    msg: buildMessages.FINISHED_PROCESSING(1),
                },
                {
                    // Created
                    msg: buildMessages.FINISHED_PROCESSING(1),
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

    it('should report diagnostics on initial build and then start watching', async () => {
        populateDirectorySync(tempDir.path, {
            'package.json': `{"name": "test", "version": "0.0.0"}`,
            'style.st.css': `
                    @st-import Module from './does-not-exist.st.css';
                    
                    .root{ color: red }
                `,
        });

        await run({
            dirPath: tempDir.path,
            args: ['--outDir', './dist', '-w', '--cjs', '--css'],
            steps: [
                {
                    msg: STImport.diagnostics.UNKNOWN_IMPORTED_FILE('./does-not-exist.st.css'),
                },
                {
                    msg: buildMessages.START_WATCHING(),
                },
            ],
        });

        const files = loadDirSync(tempDir.path);
        expect(Object.keys(files)).to.eql([
            'dist/style.css',
            'dist/style.st.css.js',
            'package.json',
            'style.st.css',
        ]);
    });

    it('should keep diagnostics when not fixed in second iteration', async () => {
        populateDirectorySync(tempDir.path, {
            'package.json': `{"name": "test", "version": "0.0.0"}`,
            'style.st.css': `
                    @st-import Module from './does-not-exist.st.css';
                    
                    .root{ color: red; }
                `,
        });

        await run({
            dirPath: tempDir.path,
            args: ['--outDir', './dist', '-w', '--cjs', '--css'],
            steps: [
                {
                    msg: STImport.diagnostics.UNKNOWN_IMPORTED_FILE('./does-not-exist.st.css'),
                },
                {
                    msg: buildMessages.START_WATCHING(),
                    action() {
                        writeToExistingFile(
                            join(tempDir.path, 'style.st.css'),
                            ` 
                                /* The import stays so it should get reported again */
                                @st-import Module from './does-not-exist.st.css';
                    
                                .root{ color: blue; }
                                `
                        );
                    },
                },
                {
                    msg: STImport.diagnostics.UNKNOWN_IMPORTED_FILE('./does-not-exist.st.css'),
                },
            ],
        });

        const files = loadDirSync(tempDir.path);
        expect(files['style.st.css']).to.include('.root{ color: blue; }');
    });

    it('should re-build indexes', async () => {
        populateDirectorySync(tempDir.path, {
            'package.json': `{"name": "test", "version": "0.0.0"}`,
        });

        await run({
            dirPath: tempDir.path,
            args: ['--outDir', './dist', '-w', '--indexFile', 'index.st.css'],
            steps: [
                {
                    msg: buildMessages.START_WATCHING(),
                    action() {
                        writeFileSync(join(tempDir.path, 'style.st.css'), `.root{ color:green }`);
                    },
                },
                {
                    msg: buildMessages.FINISHED_PROCESSING(1),
                    action() {
                        writeToExistingFile(
                            join(tempDir.path, 'style.st.css'),
                            `.root{ color:blue }`
                        );
                    },
                },
                {
                    msg: buildMessages.FINISHED_PROCESSING(1),
                    action() {
                        writeFileSync(join(tempDir.path, 'comp.st.css'), `.root{ color:green }`);
                    },
                },
                {
                    msg: buildMessages.FINISHED_PROCESSING(1),
                },
            ],
        });
        const files = loadDirSync(tempDir.path);
        expect(files['dist/index.st.css']).to.include('style.st.css');
        expect(files['dist/index.st.css']).to.include('comp.st.css');
    });

    it('should not trigger circular assets build', async () => {
        populateDirectorySync(tempDir.path, {
            'package.json': `{"name": "test", "version": "0.0.0"}`,
            'stylable.config.js': `
            exports.stcConfig = () => ({
                options: {
                    cjs: false,
                },
                projects: {
                    'packages/*': [
                        {
                            outDir: './dist',
                            srcDir: './src',
                            outputSources: true
                        },
                        {
                            srcDir: './src',
                            outDir: './src',
                            dts: true
                        }
                    ]
                }
            })`,
            packages: {
                'project-a': {
                    'package.json': JSON.stringify({ name: 'a', version: '0.0.0' }),
                    src: {
                        'icon.svg': `<svg height="100" width="100">
                            <circle cx="5" cy="50" r="40" stroke="black" stroke-width="3" fill="red" />
                        </svg> `,
                        'style.st.css': `
                        .root{ 
                            color:red;
                            background: url('./icon.svg')
                         }
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
                    msg: buildMessages.START_WATCHING(),
                    action() {
                        writeToExistingFile(
                            join(tempDir.path, 'packages', 'project-a', 'src', 'style.st.css'),
                            `.root{ 
                                color:red;
                                background: url('./icon.svg')
                             }`
                        );
                    },
                },
                {
                    msg: buildMessages.FINISHED_PROCESSING(
                        2,
                        `[0] ${sep}` + join('packages', 'project-a')
                    ),
                },
                {
                    msg: buildMessages.FINISHED_PROCESSING(
                        2,
                        `[1] ${sep}` + join('packages', 'project-a')
                    ),
                    action() {
                        return {
                            sleep: 1000,
                        };
                    },
                },
            ],
        });

        expect(
            output.match(
                new RegExp(
                    escapeRegExp(
                        buildMessages.CHANGE_EVENT_TRIGGERED(
                            join(tempDir.path, 'packages', 'project-a', 'src', 'icon.svg')
                        )
                    ),
                    'ig'
                )
            )?.length,
            'svg file should trigger change event once'
        ).to.eql(1);
        expect(
            output.match(
                new RegExp(
                    escapeRegExp(
                        buildMessages.CHANGE_EVENT_TRIGGERED(
                            join(tempDir.path, 'packages', 'project-a', 'src', 'style.st.css.d.ts')
                        )
                    ),
                    'ig'
                )
            )?.length,
            'dts file should trigger change event once'
        ).to.eql(1);
    });

    it('should keep watching when getting stylable process error', async () => {
        populateDirectorySync(tempDir.path, {
            'package.json': `{"name": "test", "version": "0.0.0"}`,
            'style.st.css': `.root{ color:red }`,
        });

        await run({
            dirPath: tempDir.path,
            args: ['--outDir', './dist', '-w', '--stcss'],
            steps: [
                {
                    msg: buildMessages.START_WATCHING(),
                    action() {
                        writeToExistingFile(join(tempDir.path, 'style.st.css'), `.root;{}`);
                    },
                },
                {
                    msg: errorMessages.STYLABLE_PROCESS(join(tempDir.path, 'style.st.css')),
                    action() {
                        writeToExistingFile(
                            join(tempDir.path, 'style.st.css'),
                            `.root{ color:green }`
                        );
                    },
                },
                {
                    msg: buildMessages.FINISHED_PROCESSING(1),
                },
            ],
        });
        const files = loadDirSync(tempDir.path);
        expect(files['dist/style.st.css']).to.include('color:green');
    });
});
