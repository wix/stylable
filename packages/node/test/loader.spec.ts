import { spawnSync, execSync } from 'child_process';
import { join, dirname } from 'path';
import { createTempDirectorySync } from '@stylable/core-test-kit';
import { expect } from 'chai';

function runTest(fixturePath: string) {
    const fixtureDirPath = dirname(fixturePath);
    execSync('npm install', { cwd: fixtureDirPath });
    return spawnSync('node', ['--experimental-loader', '@stylable/node/loader.mjs', fixturePath], {
        encoding: 'utf8',
        cwd: fixtureDirPath,
    });
}

const stylableRuntimeDepPath =
    '"file:' + JSON.stringify(join(__dirname, '../../../runtime')).substring(1);
const stylableNodeDepPath =
    '"file:' + JSON.stringify(join(__dirname, '../../../node')).substring(1);

// ToDo(major): remove conditional once node 14 support is dropped
const nodeMajorVersion = Number(process.versions.node.split('.')[0]);
(nodeMajorVersion > 14 ? describe : describe.skip)('node loader', () => {
    let tempDir: ReturnType<typeof createTempDirectorySync>;
    beforeEach('crate temp dir', () => {
        tempDir = createTempDirectorySync('st-node-loader-');
    });
    afterEach('remove temp dir', () => {
        tempDir.remove();
    });

    it('should load stylable modules', () => {
        tempDir.setContent({
            'index.st.css': `
                .root {}
                .part {}
            `,
            'index.js': `
                import { classes } from './index.st.css';
                console.log({
                    classes: Object.keys(classes)
                });            
            `,
            'package.json': `
                {
                    "name": "test",
                    "version": "0.0.1",
                    "type": "module",
                    "dependencies": {
                        "@stylable/runtime": ${stylableRuntimeDepPath},
                        "@stylable/node": ${stylableNodeDepPath}
                    }
                }
            `,
        });
        const fixturePath = join(tempDir.path, 'index.js');

        const result = runTest(fixturePath);

        expect(result.stdout).to.eql(`{ classes: [ 'root', 'part' ] }\n`);
    });
});
