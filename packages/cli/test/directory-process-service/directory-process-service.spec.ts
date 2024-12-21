import { createMemoryFs } from '@file-services/memory';
import type { IFileSystem } from '@file-services/types';
import { expect } from 'chai';
import { waitFor } from 'promise-assist';
import { createWatchService, DirectoryProcessService, type WatchService } from '@stylable/cli';
import { logCalls } from '@stylable/core-test-kit';

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
        let watchService: WatchService;

        beforeEach(() => {
            fs = createMemoryFs({ dist: {} });
            watchService = createWatchService(fs);
        });

        it('should watch added files', async () => {
            const watcher = new DirectoryProcessService(fs, watchService, {
                watchMode: true,
                fileFilter: isTemplateFile,
                processFiles(watcher, affectedFiles) {
                    const generatedFiles = new Set<string>();
                    for (const filePath of affectedFiles) {
                        const { deps, value } = evalTemplate(fs, filePath);
                        const { outFilePath } = writeTemplateOutputToDist(fs, filePath, value);
                        generatedFiles.add(outFilePath);

                        for (const dep of deps) {
                            watcher.registerInvalidateOnChange(dep, filePath);
                        }
                    }

                    return {
                        generatedFiles,
                    };
                },
            });

            watcher.init('/');

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
            `,
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
            `,
            );

            await waitFor(() => {
                expect(fs.readFileSync('/dist/a.txt', 'utf8')).to.equal('A()');
                expect(fs.readFileSync('/dist/0.txt', 'utf8')).to.equal('0(A())');
            });
        });

        it('should handle directory added after watch started', async () => {
            const changeSpy = logCalls();

            const watcher = new DirectoryProcessService(fs, watchService, {
                watchMode: true,
                fileFilter: isTemplateFile,
                processFiles(watcher, affectedFiles, _, changeOrigin) {
                    const generatedFiles = new Set<string>();
                    for (const filePath of affectedFiles) {
                        const { deps, value } = evalTemplate(fs, filePath);
                        const { outFilePath } = writeTemplateOutputToDist(fs, filePath, value);
                        generatedFiles.add(outFilePath);

                        for (const dep of deps) {
                            watcher.registerInvalidateOnChange(dep, filePath);
                        }
                    }
                    changeSpy({
                        changedFiles: Array.from(affectedFiles),
                        changeOriginPath: changeOrigin?.path,
                    });

                    return {
                        generatedFiles,
                    };
                },
            });

            watcher.init('/');

            // Nothing happened
            expect(changeSpy.callCount, 'not been called').to.equal(0);

            fs.ensureDirectorySync('test');

            // Add file to new added dir
            fs.writeFileSync('/test/0.template.js', 'output(`0()`)');

            await waitFor(() => {
                expect(changeSpy.callCount, 'called once').to.equal(1);
                expect(fs.readFileSync('/dist/test/0.txt', 'utf8')).to.equal('0()');
                expectInvalidationMap(watcher, {
                    '/test/0.template.js': [],
                });
            });
        });

        it('should handle delete files', async () => {
            const watcher = new DirectoryProcessService(fs, watchService, {
                watchMode: true,
                fileFilter: isTemplateFile,
                processFiles(watcher, affectedFiles) {
                    const generatedFiles = new Set<string>();
                    for (const filePath of affectedFiles) {
                        const { deps, value } = evalTemplate(fs, filePath);
                        const { outFilePath } = writeTemplateOutputToDist(fs, filePath, value);
                        generatedFiles.add(outFilePath);
                        for (const dep of deps) {
                            watcher.registerInvalidateOnChange(dep, filePath);
                        }
                    }

                    return {
                        generatedFiles,
                    };
                },
            });

            watcher.init('/');

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
            const watcher = new DirectoryProcessService(fs, watchService, {
                watchMode: true,
                fileFilter: isTemplateFile,
                processFiles(watcher, affectedFiles) {
                    const generatedFiles = new Set<string>();
                    for (const filePath of affectedFiles) {
                        const { deps, value } = evalTemplate(fs, filePath);
                        const { outFilePath } = writeTemplateOutputToDist(fs, filePath, value);
                        generatedFiles.add(outFilePath);
                        for (const dep of deps) {
                            watcher.registerInvalidateOnChange(dep, filePath);
                        }
                    }

                    return {
                        generatedFiles,
                    };
                },
            });

            watcher.init('/');

            fs.ensureDirectorySync('/test/deep');

            fs.writeFileSync('test/0.template.js', 'output(`0()`)');
            fs.writeFileSync('test/a.template.js', 'output(`A()`)');
            fs.writeFileSync('test/deep/b.template.js', 'output(`A()`)');

            await waitFor(() => {
                expect(fs.readFileSync('/dist/test/0.txt', 'utf8')).to.equal('0()');
                expect(fs.readFileSync('/dist/test/a.txt', 'utf8')).to.equal('A()');
            });

            fs.rmSync('test', { recursive: true, force: true });

            await waitFor(() => {
                expectInvalidationMap(watcher, {});
            });
        });
    });

    describe('Basic watcher init/change API (project1)', () => {
        let fs: IFileSystem;
        let watchService: WatchService;

        beforeEach(() => {
            fs = createMemoryFs(project1);
            watchService = createWatchService(fs);
        });

        it('should report affectedFiles and no changeOrigin when watch started', () => {
            const changeSpy = logCalls();

            const watcher = new DirectoryProcessService(fs, watchService, {
                watchMode: true,
                fileFilter: isTemplateFile,
                processFiles(_watcher, affectedFiles, _, changeOrigin) {
                    changeSpy({
                        affectedFiles: Array.from(affectedFiles),
                        changeOriginPath: changeOrigin?.path,
                    });

                    return {
                        generatedFiles: new Set(),
                    };
                },
            });

            watcher.init('/');

            expect(changeSpy.callCount, 'called once').to.equal(1);

            expect(changeSpy.calls[0], 'called with').to.eql([
                {
                    affectedFiles: [
                        '/0.template.js',
                        '/a.template.js',
                        '/b.template.js',
                        '/c.template.js',
                    ],
                    changeOriginPath: undefined,
                },
            ]);
        });

        it('should allow hooks to fill in the invalidationMap', () => {
            const watcher = new DirectoryProcessService(fs, watchService, {
                watchMode: true,
                fileFilter: isTemplateFile,
                processFiles(watcher, affectedFiles) {
                    for (const filePath of affectedFiles) {
                        const { deps } = evalTemplate(fs, filePath);
                        for (const depFilePath of deps) {
                            watcher.registerInvalidateOnChange(depFilePath, filePath);
                        }
                    }

                    return {
                        generatedFiles: new Set(),
                    };
                },
            });

            watcher.init('/');

            expectInvalidationMap(watcher, {
                '/0.template.js': [],
                '/a.template.js': ['/0.template.js'],
                '/b.template.js': ['/0.template.js', '/a.template.js'],
                '/c.template.js': ['/0.template.js', '/a.template.js', '/b.template.js'],
            });
        });

        it('should report change for all files affected by the changeOrigin', async () => {
            const changeSpy = logCalls();
            const watcher = new DirectoryProcessService(fs, watchService, {
                watchMode: true,
                fileFilter: isTemplateFile,
                processFiles(watcher, affectedFiles, _, changeOrigin) {
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

                    return {
                        generatedFiles: new Set(),
                    };
                },
            });

            watcher.init('/');

            changeSpy.resetHistory();

            await fs.promises.writeFile('/c.template.js', `output('C($)');`);

            await waitFor(() => {
                expect(changeSpy.callCount, 'called once').to.equal(1);
                expect(changeSpy.calls[0], 'called with').to.eql([
                    {
                        changeOriginPath: '/c.template.js',
                        affectedFiles: [
                            '/c.template.js',
                            '/0.template.js',
                            '/a.template.js',
                            '/b.template.js',
                        ],
                    },
                ]);
            });

            changeSpy.resetHistory();

            await fs.promises.writeFile(
                '/b.template.js',
                `
                /* changed */
                const CTemplate = use('./c.template.js');
                output(\`B(\${CTemplate})\`);
                `,
            );

            await waitFor(() => {
                expect(changeSpy.callCount, 'called once').to.equal(1);
                expect(changeSpy.calls[0], 'called with').to.eql([
                    {
                        changeOriginPath: '/b.template.js',
                        affectedFiles: ['/b.template.js', '/0.template.js', '/a.template.js'],
                    },
                ]);
            });

            changeSpy.resetHistory();

            await fs.promises.writeFile(
                '/0.template.js',
                `
                /* changed */
                const ATemplate = use('./a.template.js');
                output(\`0(\${ATemplate}\`);
                `,
            );

            await waitFor(() => {
                expect(changeSpy.callCount, 'called once').to.equal(1);
                expect(changeSpy.calls[0], 'called with').to.eql([
                    {
                        changeOriginPath: '/0.template.js',
                        affectedFiles: ['/0.template.js'],
                    },
                ]);
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
        errors.add((e as Error)?.message);
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
    const outFilePath = fs.join(outDir, fs.basename(filePath, '.template.js') + '.txt');
    fs.writeFileSync(outFilePath, value);

    return {
        outDir,
        outFilePath,
    };
}

function expectInvalidationMap(
    watcher: DirectoryProcessService,
    expected: Record<string, string[]>,
) {
    const actual: Record<string, string[]> = {};
    for (const [key, invalidationSet] of watcher.invalidationMap) {
        actual[key] = Array.from(invalidationSet);
    }
    expect(actual).to.eql(expected);
}
