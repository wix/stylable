import { createMemoryFs } from '@file-services/memory';
import { DirectoryWatchService } from '../../src/watch-service';
import { expect, use } from 'chai';
import { spy } from 'sinon';
import sinonChai from 'sinon-chai';
import { waitFor } from 'promise-assist';
import { IFileSystem } from '@file-services/types';

use(sinonChai);

const project1 = {
    '0.template.js': `
        const ATemplate = use('./a.template.js');
        output(\`0(\${ATemplate}\`);
    `,
    'a.template.js': `
        const BTemplate = use('./b.template.js');
        const CTemplate = use('./c.template.js');
        output(\`A(\${BTemplate},\${CTemplate})\`);
    `,
    'b.template.js': `
        const CTemplate = use('./c.template.js');
        output(\`B(\${CTemplate})\`);
    `,
    'c.template.js': `
        output('C()');
    `,
};

describe('DirectoryWatchService', () => {
    describe('Empty project', () => {
        let fs: IFileSystem;

        beforeEach(() => {
            fs = createMemoryFs({ dist: {} });
        });

        it('should watch added files', async () => {
            const watcher = new DirectoryWatchService(fs, {
                fileFilter: isTemplateFile,
                processFiles(watcher, affectedFiles) {
                    for (const filePath of affectedFiles) {
                        const { deps, value } = evalTemplate(fs, filePath);
                        writeTemplateOutputToDist(fs, filePath, value);
                        for (const dep of deps) {
                            watcher.registerInvalidateOnChange(dep, filePath);
                        }
                    }
                },
            });

            await watcher.watch('/');

            fs.writeFileSync('/0.template.js', `output('0()')`);

            await waitFor(() => {
                // Init file and emit change on new file
                expect(fs.readFileSync('/dist/0.txt', 'utf8')).to.equal('0()');
            });

            fs.writeFileSync(
                '/0.template.js',
                `
                const ATemplate = use('./a.template.js');
                output(\`0(\${ATemplate})\`);
            `
            );

            await waitFor(() => {
                expectInvalidationMap(watcher, {
                    '/0.template.js': [],
                    '/a.template.js': ['/0.template.js'],
                });
            });

            fs.writeFileSync(
                '/a.template.js',
                `
                output('A()');
            `
            );

            await waitFor(() => {
                expect(fs.readFileSync('/dist/a.txt', 'utf8')).to.equal('A()');
                expect(fs.readFileSync('/dist/0.txt', 'utf8')).to.equal('0(A())');
            });
        });

        it('should handle directory added after watch started', async () => {
            const changeSpy = spy();

            const watcher = new DirectoryWatchService(fs, {
                fileFilter: isTemplateFile,
                processFiles(watcher, affectedFiles, changeOrigin) {
                    for (const filePath of affectedFiles) {
                        const { deps, value } = evalTemplate(fs, filePath);
                        writeTemplateOutputToDist(fs, filePath, value);
                        for (const dep of deps) {
                            watcher.registerInvalidateOnChange(dep, filePath);
                        }
                    }
                    changeSpy({
                        changedFiles: Array.from(affectedFiles),
                        changeOriginPath: changeOrigin?.path,
                    });
                },
            });

            await watcher.watch('/');

            // Nothing happened
            expect(changeSpy).to.not.been.called;

            fs.ensureDirectorySync('test');

            // Add file to new added dir
            fs.writeFileSync('/test/0.template.js', 'output(`0()`)');

            await waitFor(() => {
                expect(changeSpy).to.have.been.calledOnce;
                expect(fs.readFileSync('/dist/test/0.txt', 'utf8')).to.equal('0()');
                expectInvalidationMap(watcher, {
                    '/test/0.template.js': [],
                });
            });
        });

        it('should handle delete files', async () => {
            new DirectoryWatchService(fs, {
                fileFilter: isTemplateFile,
                processFiles(watcher, affectedFiles) {
                    for (const filePath of affectedFiles) {
                        const { deps, value } = evalTemplate(fs, filePath);
                        writeTemplateOutputToDist(fs, filePath, value);
                        for (const dep of deps) {
                            watcher.registerInvalidateOnChange(dep, filePath);
                        }
                    }
                },
            });

            fs.writeFileSync('0.template.js', 'output(`0()`)');

            await waitFor(() => {
                expect(fs.readFileSync('/dist/0.txt', 'utf8')).to.equal('0()');
            });

            fs.unlinkSync('0.template.js');

            await waitFor(() => {
                expect(fs.readFileSync('/dist/0.txt', 'utf8')).to.equal('0()');
            });
        });

        it('should handle delete dirs', async () => {
            const watcher = new DirectoryWatchService(fs, {
                fileFilter: isTemplateFile,
                processFiles(watcher, affectedFiles) {
                    for (const filePath of affectedFiles) {
                        const { deps, value } = evalTemplate(fs, filePath);
                        writeTemplateOutputToDist(fs, filePath, value);
                        for (const dep of deps) {
                            watcher.registerInvalidateOnChange(dep, filePath);
                        }
                    }
                },
            });

            fs.ensureDirectorySync('/test');

            fs.writeFileSync('test/0.template.js', 'output(`0()`)');
            fs.writeFileSync('test/a.template.js', 'output(`A()`)');

            await waitFor(() => {
                expect(fs.readFileSync('/dist/test/0.txt', 'utf8')).to.equal('0()');
                expect(fs.readFileSync('/dist/test/a.txt', 'utf8')).to.equal('A()');
            });

            fs.removeSync('test');

            await waitFor(() => {
                expectInvalidationMap(watcher, {});
            });
        });
    });

    describe('Basic watcher init/change API (project1)', () => {
        let fs: IFileSystem;

        beforeEach(() => {
            fs = createMemoryFs(project1);
        });

        it('should report affectedFiles and no changeOrigin when watch started', async () => {
            const changeSpy = spy();

            const watcher = new DirectoryWatchService(fs, {
                fileFilter: isTemplateFile,
                processFiles(_watcher, affectedFiles, changeOrigin) {
                    changeSpy({
                        affectedFiles: Array.from(affectedFiles),
                        changeOriginPath: changeOrigin?.path,
                    });
                },
            });

            await watcher.watch('/');

            expect(changeSpy).to.have.callCount(1);

            expect(changeSpy).to.have.been.calledWith({
                affectedFiles: [
                    '/0.template.js',
                    '/a.template.js',
                    '/b.template.js',
                    '/c.template.js',
                ],
                changeOriginPath: undefined,
            });
        });

        it('should allow hooks to fill in the invalidationMap', async () => {
            const watcher = new DirectoryWatchService(fs, {
                fileFilter: isTemplateFile,
                processFiles(watcher, affectedFiles) {
                    for (const filePath of affectedFiles) {
                        const { deps } = evalTemplate(fs, filePath);
                        for (const depFilePath of deps) {
                            watcher.registerInvalidateOnChange(depFilePath, filePath);
                        }
                    }
                },
            });

            await watcher.watch('/');

            expectInvalidationMap(watcher, {
                '/0.template.js': [],
                '/a.template.js': ['/0.template.js'],
                '/b.template.js': ['/0.template.js', '/a.template.js'],
                '/c.template.js': ['/0.template.js', '/a.template.js', '/b.template.js'],
            });
        });

        it('should report change for all files affected by the changeOrigin', async () => {
            const changeSpy = spy();
            const watcher = new DirectoryWatchService(fs, {
                fileFilter: isTemplateFile,
                processFiles(watcher, affectedFiles, changeOrigin) {
                    for (const filePath of affectedFiles) {
                        const { deps } = evalTemplate(fs, filePath);
                        for (const dep of deps) {
                            watcher.registerInvalidateOnChange(dep, filePath);
                        }
                    }
                    changeSpy({
                        affectedFiles: Array.from(affectedFiles),
                        changeOriginPath: changeOrigin?.path,
                    });
                },
            });

            await watcher.watch('/');

            changeSpy.resetHistory();

            await fs.promises.writeFile('/c.template.js', `output('C($)');`);

            await waitFor(() => {
                expect(changeSpy).to.have.callCount(1);
                expect(changeSpy).to.have.calledWith({
                    changeOriginPath: '/c.template.js',
                    affectedFiles: [
                        '/c.template.js',
                        '/0.template.js',
                        '/a.template.js',
                        '/b.template.js',
                    ],
                });
            });

            changeSpy.resetHistory();

            await fs.promises.writeFile(
                '/b.template.js',
                `
                /* changed */
                const CTemplate = use('./c.template.js');
                output(\`B(\${CTemplate})\`);
                `
            );

            await waitFor(() => {
                expect(changeSpy).to.have.callCount(1);
                expect(changeSpy).to.have.calledWith({
                    changeOriginPath: '/b.template.js',
                    affectedFiles: ['/b.template.js', '/0.template.js', '/a.template.js'],
                });
            });

            changeSpy.resetHistory();

            await fs.promises.writeFile(
                '/0.template.js',
                `
                /* changed */
                const ATemplate = use('./a.template.js');
                output(\`0(\${ATemplate}\`);
                `
            );

            await waitFor(() => {
                expect(changeSpy).to.have.callCount(1);
                expect(changeSpy).to.have.calledWith({
                    changeOriginPath: '/0.template.js',
                    affectedFiles: ['/0.template.js'],
                });
            });
        });
    });
});

function evalTemplate(fs: IFileSystem, filePath: string) {
    let templateCode = '';
    let value = '';
    const errors = new Set<string>();
    try {
        templateCode = fs.readFileSync(filePath, 'utf8');
    } catch (e) {
        errors.add(e.message);
    }

    const deps = new Set<string>();
    const output = (_value: string) => {
        value = _value;
    };
    const use = (filePath: string) => {
        const resolvedPath = fs.resolve(filePath);
        const res = evalTemplate(fs, resolvedPath);
        deps.add(resolvedPath);
        for (const d of res.deps) {
            deps.add(d);
        }
        for (const e of res.errors) {
            errors.add(e);
        }
        return res.value;
    };
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const compiled = new Function('use', 'output', templateCode);
    compiled(use, output);
    return { value, deps, errors };
}

function isTemplateFile(filePath: string): boolean {
    return filePath.endsWith('.template.js');
}

function writeTemplateOutputToDist(fs: IFileSystem, filePath: string, value: string) {
    const outDir = fs.join('dist', fs.dirname(filePath));
    fs.ensureDirectorySync(outDir);
    fs.writeFileSync(fs.join(outDir, fs.basename(filePath, '.template.js') + '.txt'), value);
}

function expectInvalidationMap(watcher: DirectoryWatchService, expected: Record<string, string[]>) {
    const acutal: Record<string, string[]> = {};
    for (const [key, invalidationSet] of watcher.invalidationMap) {
        acutal[key] = Array.from(invalidationSet);
    }
    expect(acutal).to.eql(expected);
}
