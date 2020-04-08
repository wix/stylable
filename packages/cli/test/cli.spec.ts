import { evalStylableModule } from '@stylable/module-utils/test/test-kit';
import { resolveNamespace } from '@stylable/node';
import { expect } from 'chai';
import { spawnSync } from 'child_process';
import { createTempDirectory, ITempDirectory } from 'create-temp-directory';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { join, relative } from 'path';

function runCli(cliArgs: string[] = []): { stderr: any; stdout: any } {
    return spawnSync('node', [join(__dirname, '../cli.js'), ...cliArgs]);
}

interface Files {
    [filepath: string]: string;
}

function loadDirSync(rootPath: string, dirPath: string = rootPath): Files {
    return readdirSync(dirPath).reduce<Files>((acc, entry) => {
        const fullPath = join(dirPath, entry);
        const key = relative(rootPath, fullPath);
        const stat = statSync(fullPath);
        if (stat.isFile()) {
            acc[key] = readFileSync(fullPath, 'utf8');
        } else if (stat.isDirectory()) {
            return {
                ...acc,
                ...loadDirSync(rootPath, fullPath),
            };
        } else {
            throw new Error('Not Implemented');
        }
        return acc;
    }, {});
}

function populateDirectorySync(rootDir: string, files: Files) {
    for (const filePath in files) {
        writeFileSync(join(rootDir, filePath), files[filePath]);
    }
}

describe('Stylable Cli', () => {
    let tempDir: ITempDirectory;

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

        const nsr = join(__dirname, 'fixtures/test-ns-resolver.js');
        const { stderr, stdout } = runCli(['--rootDir', tempDir.path, '--nsr', nsr]);

        expect(stderr.toString('utf8')).equal('');
        expect(stdout.toString('utf8')).equal('');

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

        const nsr = join(__dirname, 'fixtures/test-ns-resolver.js');
        runCli(['--rootDir', tempDir.path, '--nsr', nsr, '--outDir', './dist']);

        const dirContent = loadDirSync(tempDir.path);
        expect(Object.keys(dirContent)).to.eql([
            join('dist', 'style.st.css.js'),
            'package.json',
            'style.st.css',
        ]);
    });

    it('single file build with all targets', () => {
        populateDirectorySync(tempDir.path, {
            'package.json': `{"name": "test", "version": "0.0.0"}`,
            'style.st.css': `.root{color:red}`,
        });

        const nsr = join(__dirname, 'fixtures/test-ns-resolver.js');
        const { stderr, stdout } = runCli([
            '--rootDir',
            tempDir.path,
            '--nsr',
            nsr,
            '--outDir',
            './dist',
            '--stcss',
            '--esm',
            '--cjs',
            '--css',
        ]);
        const dirContent = loadDirSync(tempDir.path);

        expect(stderr.toString('utf8')).equal('');
        expect(stdout.toString('utf8')).equal('');
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

        expect(stderr.toString('utf8')).equal('');
        expect(stdout.toString('utf8')).equal('');

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

        expect(stderr.toString('utf8')).equal('');
        expect(stdout.toString('utf8')).equal('');

        const dirContent = loadDirSync(tempDir.path);
        const stylesheetContent = dirContent['dist/style.st.css'];
        const namespaceReference = stylesheetContent.split('\n')[0];

        expect(namespaceReference).equal('/* st-namespace-reference="../style.st.css" */');
    });

    it('compat mode', () => {
        populateDirectorySync(tempDir.path, {
            'package.json': `{"name": "test", "version": "0.0.0"}`,
            'style.st.css': `.root{color:red}`,
        });
        const nsr = join(__dirname, 'fixtures/test-ns-resolver.js');
        const { stderr, stdout } = runCli([
            '--rootDir',
            tempDir.path,
            '--nsr',
            nsr,
            '--outDir',
            './dist',
            '--cjs',
            '--css',
            '--compat',
        ]);

        expect(stderr.toString('utf8')).equal('');
        expect(stdout.toString('utf8')).equal('');

        const dirContent = loadDirSync(tempDir.path);
        const file = join('dist', 'style.st.css.js');
        const m = evalStylableModule<{ namespace: string; default: any }>(dirContent[file], file);
        expect(typeof m).equal('function');

        expect(m).equal(m.default);
    });

    it('manifest', () => {
        populateDirectorySync(tempDir.path, {
            'package.json': `{"name": "test", "version": "0.0.0"}`,
            'style.st.css': `.root{color:red}`,
        });
        const nsr = join(__dirname, 'fixtures/test-ns-resolver.js');
        const { stderr, stdout } = runCli([
            '--rootDir',
            tempDir.path,
            '--nsr',
            nsr,
            '--outDir',
            './dist',
            '--manifest',
        ]);

        expect(stderr.toString('utf8')).equal('');
        expect(stdout.toString('utf8')).equal('');

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
        const nsr = join(__dirname, 'fixtures/test-ns-resolver.js');
        const { stderr, stdout } = runCli([
            '--rootDir',
            tempDir.path,
            '--nsr',
            nsr,
            '--outDir',
            './dist',
            '--manifest',
            '--manifestFilepath',
            '/x/y/m.json',
        ]);

        expect(stderr.toString('utf8')).equal('');
        expect(stdout.toString('utf8')).equal('');

        const dirContent = loadDirSync(tempDir.path);
        const file = join('dist', 'x/y/m.json');

        const m = JSON.parse(dirContent[file]);
        expect(m.namespaceMapping).eql({ 'style.st.css': 'test-ns-0' });
    });

    it('test require hook', () => {
        populateDirectorySync(tempDir.path, {});
        const nsr = join(__dirname, 'fixtures/test-ns-resolver.js');
        const requireHook = join(__dirname, 'fixtures/test-require-hook.js');
        const { stderr, stdout } = runCli([
            '--rootDir',
            tempDir.path,
            '--nsr',
            nsr,
            '-r',
            requireHook,
        ]);

        expect(stderr.toString('utf8')).equal('');
        expect(stdout.toString('utf8')).to.contain('I HAVE BEEN REQUIRED');
    });
});
