import { join } from 'path';
import { expect } from 'chai';
import { createTempDirectory, ITempDirectory } from 'create-temp-directory';
import { evalStylableModule } from '@stylable/module-utils/dist/test/test-kit';
import { resolveNamespace } from '@stylable/node';
import { loadDirSync, populateDirectorySync, runCliSync } from '@stylable/e2e-test-kit';
import { processorWarnings } from '@stylable/core';
import { STImport } from '@stylable/core/dist/features';

describe('Stylable Cli', function () {
    this.timeout(25000);
    let tempDir: ITempDirectory;
    const testNsrPath = require.resolve('./fixtures/test-ns-resolver');

    beforeEach(async () => {
        tempDir = await createTempDirectory();
    });
    afterEach(async () => {
        await tempDir.remove();
    });

    it('single file build with test namespace-resolver', () => {
        populateDirectorySync(tempDir.path, {
            'package.json': `{"name": "test", "version": "0.0.0"}`,
            'style.st.css': `.root{color:red}`,
        });

        runCliSync(['--rootDir', tempDir.path, '--nsr', testNsrPath]);

        const dirContent = loadDirSync(tempDir.path);
        expect(
            evalStylableModule<{ namespace: string }>(
                dirContent['style.st.css.js'],
                'style.st.css.js'
            ).namespace
        ).equal('test-ns-0');
    });

    it('single file build with outDir', () => {
        populateDirectorySync(tempDir.path, {
            'package.json': `{"name": "test", "version": "0.0.0"}`,
            'style.st.css': `.root{color:red}`,
        });

        runCliSync(['--rootDir', tempDir.path, '--nsr', testNsrPath, '--outDir', './dist']);

        const dirContent = loadDirSync(tempDir.path);
        expect(Object.keys(dirContent)).to.eql([
            'dist/style.st.css.js',
            'package.json',
            'style.st.css',
        ]);
    });

    it('fails when provided unknown cli flags', () => {
        populateDirectorySync(tempDir.path, {
            'package.json': `{"name": "test", "version": "0.0.0"}`,
            'style.st.css': `.root {color:red}`,
        });

        const { status, output } = runCliSync([
            '--rootDir',
            tempDir.path,
            '--outDir',
            './dist',
            '--unknownFlag',
        ]);
        expect(status, output.join('')).to.not.equal(0);
        expect(output.join(''), 'output').to.match(/Unknown argument: unknownFlag/g);
    });

    it('single file build with all targets', () => {
        populateDirectorySync(tempDir.path, {
            'package.json': `{"name": "test", "version": "0.0.0"}`,
            'style.st.css': `.root{color:red}`,
        });

        runCliSync([
            '--rootDir',
            tempDir.path,
            '--nsr',
            testNsrPath,
            '--outDir',
            './dist',
            '--stcss',
            '--esm',
            '--cjs',
            '--css',
        ]);
        const dirContent = loadDirSync(tempDir.path);

        expect(Object.keys(dirContent)).to.eql([
            'dist/style.css',
            'dist/style.st.css',
            'dist/style.st.css.js',
            'dist/style.st.css.mjs',
            'package.json',
            'style.st.css',
        ]);
    });

    it('single file build with default ns-resolver', () => {
        populateDirectorySync(tempDir.path, {
            'package.json': `{"name": "test", "version": "0.0.0"}`,
            'style.st.css': `.root{color:red}`,
        });

        const nsr = require.resolve('@stylable/node');
        runCliSync(['--rootDir', tempDir.path, '--nsr', nsr]);

        const dirContent = loadDirSync(tempDir.path);

        expect(
            evalStylableModule<{ namespace: string }>(
                dirContent['style.st.css.js'],
                'style.st.css.js'
            ).namespace
        ).equal(resolveNamespace('style', join(tempDir.path, 'style.st.css')));
    });

    it('build .st.css source files with namespace reference', () => {
        populateDirectorySync(tempDir.path, {
            'package.json': `{"name": "test", "version": "0.0.0"}`,
            'style.st.css': `.root{color:red}`,
        });

        runCliSync([
            '--rootDir',
            tempDir.path,
            '--outDir',
            'dist',
            '--stcss',
            '--useNamespaceReference',
        ]);

        const dirContent = loadDirSync(tempDir.path);
        const stylesheetContent = dirContent['dist/style.st.css'];

        expect(
            stylesheetContent.startsWith('/* st-namespace-reference="../style.st.css" */')
        ).equal(true);
    });

    it('build .st.css.d.ts alongside source files with source-maps on by default', () => {
        const srcContent = '.root{color:red}';
        populateDirectorySync(tempDir.path, {
            'package.json': `{"name": "test", "version": "0.0.0"}`,
            'style.st.css': srcContent,
        });

        runCliSync(['--rootDir', tempDir.path, '--outDir', 'dist', '--stcss', '--dts']);

        const dirContent = loadDirSync(tempDir.path);
        const stylesheetContent = dirContent['dist/style.st.css'];
        const dtsContent = dirContent['dist/style.st.css.d.ts'];
        const dtsSourceMapContent = dirContent['dist/style.st.css.d.ts.map'];

        expect(stylesheetContent).to.equal(srcContent);
        expect(dtsContent.startsWith('/* THIS FILE IS AUTO GENERATED DO NOT MODIFY */')).to.equal(
            true
        );
        expect(
            dtsSourceMapContent.startsWith('{\n    "version": 3,\n    "file": "style.st.css.d.ts"')
        ).to.equal(true);
    });

    it('build .st.css.d.ts alongside source files with source-maps explicitly off', () => {
        const srcContent = '.root{color:red}';
        populateDirectorySync(tempDir.path, {
            'package.json': `{"name": "test", "version": "0.0.0"}`,
            'style.st.css': srcContent,
        });

        runCliSync([
            '--rootDir',
            tempDir.path,
            '--outDir',
            'dist',
            '--stcss',
            '--dts',
            '--dtsSourceMap',
            'false',
        ]);

        const dirContent = loadDirSync(tempDir.path);
        const stylesheetContent = dirContent['dist/style.st.css'];
        const dtsContent = dirContent['dist/style.st.css.d.ts'];
        const dtsSourceMapContent = dirContent['dist/style.st.css.d.ts.map'];

        expect(stylesheetContent).to.equal(srcContent);
        expect(dtsContent.startsWith('/* THIS FILE IS AUTO GENERATED DO NOT MODIFY */')).to.equal(
            true
        );
        expect(dtsSourceMapContent).to.equal(undefined);
    });

    it('manifest', () => {
        populateDirectorySync(tempDir.path, {
            'package.json': `{"name": "test", "version": "0.0.0"}`,
            'style.st.css': `.root{color:red}`,
        });

        runCliSync([
            '--rootDir',
            tempDir.path,
            '--nsr',
            testNsrPath,
            '--outDir',
            './dist',
            '--manifest',
        ]);

        const dirContent = loadDirSync(tempDir.path);

        const m = JSON.parse(dirContent['dist/stylable.manifest.json']);
        expect(m.namespaceMapping).eql({ 'style.st.css': 'test-ns-0' });
    });

    it('manifestFilepath', () => {
        populateDirectorySync(tempDir.path, {
            'package.json': `{"name": "test", "version": "0.0.0"}`,
            'style.st.css': `.root{color:red}`,
        });

        runCliSync([
            '--rootDir',
            tempDir.path,
            '--nsr',
            testNsrPath,
            '--outDir',
            './dist',
            '--manifest',
            '--manifestFilepath',
            '/x/y/m.json',
        ]);

        const dirContent = loadDirSync(tempDir.path);

        const m = JSON.parse(dirContent['dist/x/y/m.json']);
        expect(m.namespaceMapping).eql({ 'style.st.css': 'test-ns-0' });
    });

    it('test require hook', () => {
        populateDirectorySync(tempDir.path, {});
        const requireHook = require.resolve('./fixtures/test-require-hook');
        const { stdout } = runCliSync([
            '--rootDir',
            tempDir.path,
            '--nsr',
            testNsrPath,
            '-r',
            requireHook,
        ]);

        expect(stdout).to.contain('I HAVE BEEN REQUIRED');
    });

    describe('CLI diagnostics', () => {
        it('should report diagnostics by default and exit the process with error exit code 1', () => {
            populateDirectorySync(tempDir.path, {
                'package.json': `{"name": "test", "version": "0.0.0"}`,
                'style.st.css': `.root{color:value(xxx)}`,
            });

            const { stdout, status } = runCliSync(['--rootDir', tempDir.path]);

            expect(status).to.equal(1);
            expect(stdout, 'stdout').to.match(/\[Stylable Diagnostics\]/);
            expect(stdout, 'stdout').to.match(/style\.st\.css/);
            expect(stdout, 'stdout').to.match(/unknown var "xxx"/);
        });

        it('(diagnosticsMode) should not exit with error when using strict mode with only info diagnostics', () => {
            populateDirectorySync(tempDir.path, {
                'package.json': `{"name": "test", "version": "0.0.0"}`,
                'style.st.css': `:vars { colors: stArray(red, blue); }`, // Todo: replace case with permanent info diagnostic
            });

            const { status, stdout } = runCliSync([
                '--rootDir',
                tempDir.path,
                '--diagnosticsMode=strict',
            ]);

            expect(status).to.equal(0);
            expect(stdout, 'stdout').to.match(/\[Stylable Diagnostics\]/);
            expect(stdout, 'stdout').to.match(/style\.st\.css/);
            expect(stdout, 'stdout').to.match(
                new RegExp(
                    `\\[info\\]: ${processorWarnings.DEPRECATED_ST_FUNCTION_NAME(
                        'stArray',
                        'st-array'
                    )}`
                )
            );
        });

        it('(diagnosticsMode) should report diagnostics and ignore process exit', () => {
            populateDirectorySync(tempDir.path, {
                'package.json': `{"name": "test", "version": "0.0.0"}`,
                'style.st.css': `.root{color:value(xxx)}`,
            });

            const { stdout, status } = runCliSync([
                '--rootDir',
                tempDir.path,
                '--diagnosticsMode=loose',
            ]);

            expect(status).to.equal(0);
            expect(stdout, 'stdout').to.match(/\[Stylable Diagnostics\]/);
            expect(stdout, 'stdout').to.match(/style\.st\.css/);
            expect(stdout, 'stdout').to.match(/unknown var "xxx"/);
        });

        it('should fail to build when "--dtsSourceMap" is on but "--dts" is off', () => {
            const srcContent = '.root{color:red}';
            populateDirectorySync(tempDir.path, {
                'package.json': `{"name": "test", "version": "0.0.0"}`,
                'style.st.css': srcContent,
            });

            const { stdout, stderr, status } = runCliSync([
                '--rootDir',
                tempDir.path,
                '--outDir',
                'dist',
                '--stcss',
                '--dts',
                'false',
                '--dtsSourceMap',
                'true',
            ]);

            expect(status).to.equal(1);
            expect(stdout).to.equal('');
            expect(stderr).to.include('"dtsSourceMap" requires turning on "dts"');
        });

        it('should report diagnostic once (regression)', () => {
            /**
             * This test checks for a case that
             * diagnostics were outputted multiple times
             */
            populateDirectorySync(tempDir.path, {
                'package.json': `{"name": "test", "version": "0.0.0"}`,
                'style.st.css': `.root {
                    @st-import X from ".x.st.css";
                }`,
            });

            const { stdout, status } = runCliSync(['--rootDir', tempDir.path]);

            expect(status).to.equal(1);
            expect(
                stdout.match(new RegExp(STImport.diagnostics.NO_ST_IMPORT_IN_NESTED_SCOPE(), 'g'))
            ).to.have.length(1);
        });

        it('should report error when source dir match out dir and output sources enabled', () => {
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
});
