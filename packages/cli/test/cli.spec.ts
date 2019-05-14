import { nodeFs } from '@file-services/node';
import { IDirectoryContents } from '@file-services/types';
import { evalStylableModule } from '@stylable/module-utils/test/test-kit';
import { resolveNamespace } from '@stylable/node';
import { expect } from 'chai';
import { spawnSync } from 'child_process';
import { createTempDirectory, ITempDirectory } from 'create-temp-directory';
import { join, relative } from 'path';

function runCli(cliArgs: string[] = []): { stderr: any; stdout: any } {
    return spawnSync('node', [
        '-r',
        '@ts-tools/node/r',
        join(__dirname, '../src/cli.ts'),
        ...cliArgs
    ]);
}

function loadDirSync(dirPath: string) {
    return nodeFs
        .readdirSync(dirPath, { withFileTypes: true })
        .reduce<IDirectoryContents>((acc, entry) => {
            const fullPath = join(dirPath, entry.name);
            const key = relative(dirPath, fullPath);
            if (entry.isFile()) {
                acc[key] = nodeFs.readFileSync(fullPath, 'utf8');
            } else if (entry.isDirectory()) {
                acc[key] = loadDirSync(fullPath);
            } else {
                throw new Error('Not Implemented');
            }
            return acc;
        }, {});
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
        nodeFs.populateDirectorySync(tempDir.path, {
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
        nodeFs.populateDirectorySync(tempDir.path, {
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
