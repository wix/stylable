import { evalStylableModule } from '@stylable/module-utils/test/test-kit';
import { resolveNamespace } from '@stylable/node';
import { expect } from 'chai';
import { spawnSync } from 'child_process';
import { createTempDirectory, ITempDirectory } from 'create-temp-directory';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { join, relative } from 'path';

function runCli(cliArgs: string[] = []): { stderr: any; stdout: any } {
    return spawnSync('node', [
        '-r',
        '@ts-tools/node/r',
        join(__dirname, '../src/cli.ts'),
        ...cliArgs
    ]);
}

interface Files { [filepath: string]: string }

function loadDirSync(dirPath: string): Files {
    return readdirSync(dirPath).reduce<Files>((acc, entry) => {
        const fullPath = join(dirPath, entry);
        const key = relative(dirPath, fullPath);
        const stat = statSync(fullPath);
        if (stat.isFile()) {
            acc[key] = readFileSync(fullPath, 'utf8');
        } else if (stat.isDirectory()) {
            return {
                ...acc,
                ...loadDirSync(fullPath)
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
            'style.st.css': `.root{color:red}`
        });

        const nsr = join(__dirname, 'fixtures/test-ns-resolver.js');
        const { stderr, stdout } = runCli(['--rootDir', tempDir.path, '--nsr', nsr]);

        expect(stderr.toString('utf8')).equal('');
        expect(stdout.toString('utf8')).equal('');

        const dirContent = loadDirSync(tempDir.path);

        expect(
            evalStylableModule<{ namespace: string }>(
                dirContent['style.st.css.js'] as string,
                'style.st.css.js'
            ).namespace
        ).equal('test-ns-0');
    });

    it('single file build with default ns-resolver', () => {
        populateDirectorySync(tempDir.path, {
            'package.json': `{"name": "test", "version": "0.0.0"}`,
            'style.st.css': `.root{color:red}`
        });

        const nsr = require.resolve('@stylable/node/src');
        const { stderr, stdout } = runCli(['--rootDir', tempDir.path, '--nsr', nsr]);

        expect(stderr.toString('utf8')).equal('');
        expect(stdout.toString('utf8')).equal('');

        const dirContent = loadDirSync(tempDir.path);

        expect(
            evalStylableModule<{ namespace: string }>(
                dirContent['style.st.css.js'] as string,
                'style.st.css.js'
            ).namespace
        ).equal(resolveNamespace('style', join(tempDir.path, 'style.st.css')));
    });
});
