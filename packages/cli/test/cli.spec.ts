import { join } from 'path';
import { spawnSync } from 'child_process';
import { expect } from 'chai';
import { createTempDirectory, ITempDirectory } from 'create-temp-directory';
import { evalStylableModule } from '@stylable/module-utils/dist/test/test-kit';
import { resolveNamespace } from '@stylable/node';
import { populateDirectorySync, loadDirSync } from './test-kit';

function runCli(cliArgs: string[] = []) {
    const cliPath = require.resolve('@stylable/cli/bin/stc.js');
    return spawnSync('node', [cliPath, ...cliArgs], { encoding: 'utf8' });
}

describe('Stylable Cli', () => {
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

        const { stderr, stdout } = runCli(['--rootDir', tempDir.path, '--nsr', testNsrPath]);

        expect(stderr).equal('');
        expect(stdout).equal('');

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

        runCli(['--rootDir', tempDir.path, '--nsr', testNsrPath, '--outDir', './dist']);

        const dirContent = loadDirSync(tempDir.path);
        expect(Object.keys(dirContent)).to.eql([
            join('dist', 'style.st.css.js'),
            'package.json',
            'style.st.css',
        ]);
    });

    it('fails when provided unknown cli flags', () => {
        populateDirectorySync(tempDir.path, {
            'package.json': `{"name": "test", "version": "0.0.0"}`,
            'style.st.css': `.root {color:red}`,
        });

        const { status, output } = runCli([
            '--rootDir',
            tempDir.path,
            '--outDir',
            './dist',
            '--unknownFlag',
        ]);

        expect(status, output.join('')).to.not.equal(0);
    });

    it('single file build with all targets', () => {
        populateDirectorySync(tempDir.path, {
            'package.json': `{"name": "test", "version": "0.0.0"}`,
            'style.st.css': `.root{color:red}`,
        });

        const { stderr, stdout } = runCli([
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

        expect(stderr).equal('');
        expect(stdout).equal('');
        expect(Object.keys(dirContent)).to.eql([
            join('dist', 'style.css'),
            join('dist', 'style.st.css'),
            join('dist', 'style.st.css.js'),
            join('dist', 'style.st.css.mjs'),
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
        const { stderr, stdout } = runCli(['--rootDir', tempDir.path, '--nsr', nsr]);

        expect(stderr).equal('');
        expect(stdout).equal('');

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

        const { stderr, stdout } = runCli([
            '--rootDir',
            tempDir.path,
            '--outDir',
            'dist',
            '--stcss',
            '--useNamespaceReference',
        ]);

        expect(stderr).equal('');
        expect(stdout).equal('');

        const dirContent = loadDirSync(tempDir.path);
        const stylesheetContent = dirContent[join('dist', 'style.st.css')];

        expect(
            stylesheetContent.startsWith('/* st-namespace-reference="../style.st.css" */')
        ).equal(true);
    });

    it('manifest', () => {
        populateDirectorySync(tempDir.path, {
            'package.json': `{"name": "test", "version": "0.0.0"}`,
            'style.st.css': `.root{color:red}`,
        });

        const { stderr, stdout } = runCli([
            '--rootDir',
            tempDir.path,
            '--nsr',
            testNsrPath,
            '--outDir',
            './dist',
            '--manifest',
        ]);

        expect(stderr).equal('');
        expect(stdout).equal('');

        const dirContent = loadDirSync(tempDir.path);
        const file = join('dist', 'stylable.manifest.json');

        const m = JSON.parse(dirContent[file]);
        expect(m.namespaceMapping).eql({ 'style.st.css': 'test-ns-0' });
    });

    it('manifestFilepath', () => {
        populateDirectorySync(tempDir.path, {
            'package.json': `{"name": "test", "version": "0.0.0"}`,
            'style.st.css': `.root{color:red}`,
        });

        const { stderr, stdout } = runCli([
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

        expect(stderr).equal('');
        expect(stdout).equal('');

        const dirContent = loadDirSync(tempDir.path);
        const file = join('dist', 'x/y/m.json');

        const m = JSON.parse(dirContent[file]);
        expect(m.namespaceMapping).eql({ 'style.st.css': 'test-ns-0' });
    });

    it('test require hook', () => {
        populateDirectorySync(tempDir.path, {});
        const requireHook = require.resolve('./fixtures/test-require-hook');
        const { stderr, stdout } = runCli([
            '--rootDir',
            tempDir.path,
            '--nsr',
            testNsrPath,
            '-r',
            requireHook,
        ]);

        expect(stderr).equal('');
        expect(stdout).to.contain('I HAVE BEEN REQUIRED');
    });

    describe('CLI diagnostics', () => {
        it('should report diagnostics by default and exit the process with error exit code 1', () => {
            populateDirectorySync(tempDir.path, {
                'package.json': `{"name": "test", "version": "0.0.0"}`,
                'style.st.css': `.root{color:value(xxx)}`,
            });

            const { stderr, stdout, status } = runCli(['--rootDir', tempDir.path]);

            expect(status).to.equal(1);
            expect(stdout, 'stdout').to.match(/Errors in file/);
            expect(stdout, 'stdout').to.match(/style\.st\.css/);
            expect(stdout, 'stdout').to.match(/unknown var "xxx"/);
            expect(stderr, 'stderr').equal('');
        });
        it('(diagnosticsMode) should report diagnostics and ignore process process exit', () => {
            populateDirectorySync(tempDir.path, {
                'package.json': `{"name": "test", "version": "0.0.0"}`,
                'style.st.css': `.root{color:value(xxx)}`,
            });

            const { stderr, stdout, status } = runCli([
                '--rootDir',
                tempDir.path,
                '--diagnosticsMode=loose',
            ]);

            expect(status).to.equal(0);
            expect(stdout, 'stdout').to.match(/Errors in file/);
            expect(stdout, 'stdout').to.match(/style\.st\.css/);
            expect(stdout, 'stdout').to.match(/unknown var "xxx"/);
            expect(stderr, 'stderr').equal('');
        });
    });
});
