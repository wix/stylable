import { spawnSync, execSync } from 'child_process';
import { join, dirname } from 'path';
import { createTempDirectorySync } from '@stylable/core-test-kit';
import { expect } from 'chai';

function runTest(fixturePath: string) {
    execSync('npm install', { cwd: dirname(fixturePath) });
    return spawnSync('node', ['--experimental-loader', '@stylable/node/loader.mjs', fixturePath], {
        encoding: 'utf8',
    });
}
const stylableRuntimePath = join(__dirname, '../../../runtime');
const stylableRuntimeDepPath = '"file:' + JSON.stringify(stylableRuntimePath).substring(1);

describe('node loader', () => {
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
                        "@stylable/runtime": ${stylableRuntimeDepPath}
                    }
                }
            `,
        });
        const fixturePath = join(tempDir.path, 'index.js');

        const result = runTest(fixturePath);

        expect(result.stdout).to.eql(`{ classes: [ 'root', 'part' ] }\n`);
    });
});
