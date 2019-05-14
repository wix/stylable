import { nodeFs } from '@file-services/node';
import { IDirectoryContents } from '@file-services/types';
import { evalStylableModule } from '@stylable/module-utils/test/test-kit';
import { expect } from 'chai';
import { spawnSync } from 'child_process';
import { createTempDirectory, ITempDirectory } from 'create-temp-directory';
import { join, relative } from 'path';

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

    it('single file build', () => {
        const files = {
            'package.json': `{"name": "test", "version": "0.0.0"}`,
            'style.st.css': `.root{color:red}`
        };

        nodeFs.populateDirectorySync(tempDir.path, files);

        const cli = join(__dirname, '../src/cli.ts');
        const nsr = join(__dirname, 'fixtures/test-ns-resolver.js');

        const { stderr, stdout } = spawnSync(
            'node',
            ['-r', require.resolve('@ts-tools/node/fast'), cli, `--nsr=${nsr}`],
            { cwd: tempDir.path }
        );

        console.log(stderr.toString('utf8'));
        console.log(stdout.toString('utf8'));

        const dirContent = loadDirSync(tempDir.path);

        expect(
            evalStylableModule<{ namespace: string }>(
                dirContent['style.st.css.js'] as string,
                'style.st.css.js'
            ).namespace
        ).equal('test-ns-0');
    });
});
