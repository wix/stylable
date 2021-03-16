import { basename, dirname, join } from 'path';
import { nodeFs } from '@file-services/node';
import { OutputChunk, RollupBuild, RollupWatcher, RollupWatcherEvent } from 'rollup';
import { createTempDirectorySync } from 'create-temp-directory';
import { deferred } from 'promise-assist';

export function waitForWatcherFinish(watcher: RollupWatcher) {
    const current = deferred<RollupWatcherEvent & { code: 'BUNDLE_END' }>();

    let bundleEnd: RollupWatcherEvent & { code: 'BUNDLE_END' };
    const handler = (e: RollupWatcherEvent) => {
        if (e.code === 'BUNDLE_END') {
            bundleEnd = e;
        }
        if (e.code === 'END') {
            watcher.off('event', handler);
            current.resolve(bundleEnd);
        }
        if (e.code === 'ERROR') {
            console.log('stop');
            watcher.off('event', handler);
            current.reject(e);
        }
    };
    watcher.on('event', handler);

    return current.promise;
}

export async function actAndWaitForBuild(
    watcher: RollupWatcher,
    action: (bundled: Promise<RollupWatcherEvent>) => Promise<void> | void
) {
    const done = new Promise<RollupWatcherEvent>((res) => {
        watcher.once('restart', () => {
            res(waitForWatcherFinish(watcher));
        });
    });

    return new Promise<void>((res, rej) => {
        const wait = action(done);
        if (wait) {
            wait.then(res).catch(rej);
        } else {
            res();
        }
    });
}
export function createTempProject(projectToCopy: string, nodeModulesToLink: string, entry: string) {
    const tempDir = createTempDirectorySync('local-rollup-test');
    const projectPath = join(tempDir.path, 'project');
    nodeFs.copyDirectorySync(projectToCopy, projectPath);
    nodeFs.symlinkSync(nodeModulesToLink, join(tempDir.path, 'node_modules'), 'junction');
    return {
        context: tempDir.path,
        input: join(tempDir.path, 'project', entry),
        projectDir: join(tempDir.path, 'project'),
        dispose() {
            tempDir.remove();
        },
    };
}

export function findModuleByName(fileName: string, build: RollupBuild, chunk?: OutputChunk) {
    const modules = [];
    const buildModules = build.cache?.modules.values();
    if (!buildModules) {
        throw new Error('Missing build.cache');
    }
    for (const module of buildModules) {
        if (basename(module.id) === fileName) {
            modules.push(module);
        }
    }
    if (modules.length !== 1) {
        throw new Error(`Found 0 or more then 1 module with the name ${fileName}`);
    }
    if (chunk) {
        if (!chunk.modules[modules[0].id]) {
            throw new Error(`module is not included in chunk ${chunk.name}`);
        }
    }
    return modules[0];
}

export function getProjectPath(name: string) {
    return dirname(require.resolve(`@stylable/rollup-plugin/test/projects/${name}/package.json`));
}
