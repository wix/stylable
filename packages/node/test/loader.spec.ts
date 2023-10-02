import { spawnSync } from 'child_process';
import { join, dirname } from 'path';
import { symlinkSync } from 'fs';
import { createTempDirectorySync } from '@stylable/core-test-kit';
import { expect } from 'chai';

const rootRepoPath = dirname(require.resolve('../../../../package.json'));
const describeIf = (condition: boolean) => (condition ? describe : describe.skip);
// ToDo(major): remove conditional once node 14 support is dropped
const nodeMajorVersion = Number(process.versions.node.split('.')[0]);

const spawnNodeWithLoader = (fixtureFilePath: string) =>
    spawnSync('node', ['--experimental-loader', '@stylable/node/loader.mjs', fixtureFilePath], {
        encoding: 'utf8',
        cwd: dirname(fixtureFilePath),
    });

describeIf(nodeMajorVersion > 14)('node loader', () => {
    let tempDir: ReturnType<typeof createTempDirectorySync>;
    beforeEach('crate temp dir', () => {
        tempDir = createTempDirectorySync('st-node-loader-');
        symlinkSync(
            join(rootRepoPath, 'node_modules'),
            join(tempDir.path, 'node_modules'),
            'junction'
        );
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
                    "type": "module"
                }
            `,
        });
        const fixturePath = join(tempDir.path, 'index.js');

        const result = spawnNodeWithLoader(fixturePath);

        expect(result.status, result.stderr).to.equal(0);
        expect(result.stdout).to.eql(`{ classes: [ 'root', 'part' ] }\n`);
    });

    it('should use stylable.config (esm project)', () => {
        tempDir.setContent({
            'index.st.css': `
                .root {}
                .part {}
            `,
            'index.js': `
                import { classes } from './index.st.css';
                console.log(classes);
            `,
            'stylable.config.js': `
                export function defaultConfig() {
                    return {
                        resolveNamespace(namespace, path) {
                            return 'x-' + namespace;
                        }
                    };
                };
            `,
            'package.json': `
                {
                    "name": "test",
                    "version": "0.0.1",
                    "type": "module"
                }
            `,
        });
        const fixturePath = join(tempDir.path, 'index.js');

        const result = spawnNodeWithLoader(fixturePath);

        expect(result.status, result.stderr).to.equal(0);
        expect(result.stdout, result.stderr).to.eql(
            `{ root: 'x-index__root', part: 'x-index__part' }\n`
        );
    });

    it('should use stylable.config (cjs project)', () => {
        tempDir.setContent({
            'index.st.css': `
                .root {}
                .part {}
            `,
            'index.mjs': `
                import { classes } from './index.st.css';
                console.log(classes);
            `,
            'stylable.config.js': `
                module.exports = {
                    defaultConfig() {
                        return {
                            resolveNamespace(namespace, path) {
                                return 'x-' + namespace;
                            }
                        };
                    }
                };
            `,
            'package.json': `
                {
                    "name": "test",
                    "version": "0.0.1"
                }
            `,
        });
        const fixturePath = join(tempDir.path, 'index.mjs');

        const result = spawnNodeWithLoader(fixturePath);

        expect(result.status, result.stderr).to.equal(0);
        expect(result.stdout, result.stderr).to.eql(
            `{ root: 'x-index__root', part: 'x-index__part' }\n`
        );
    });
});
