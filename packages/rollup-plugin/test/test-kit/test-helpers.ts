import type { RollupWatcher, RollupWatcherEvent } from 'rollup';
import { dirname, join } from 'path';
import { nodeFs } from '@file-services/node';
import { createTempDirectorySync } from 'create-temp-directory';
import { deferred } from 'promise-assist';

export interface ActAndWaitOptions {
    strict?: boolean;
}

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
            watcher.off('event', handler);
            console.log(`Rollup Error emitted:\n${e.error}`);
            current.reject(e);
        }
    };
    watcher.on('event', handler);

    return current.promise;
}

export async function actAndWaitForBuild(
    watcher: RollupWatcher,
    action: (bundled: Promise<RollupWatcherEvent>) => Promise<void> | void,
    options: ActAndWaitOptions = {}
) {
    const done = waitForWatcherFinish(watcher);
    await action(done);
    try {
        return await done;
    } catch (e) {
        if (options.strict) {
            throw e;
        }
        return;
    }
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

export function getProjectPath(name: string) {
    return dirname(require.resolve(`@stylable/rollup-plugin/test/projects/${name}/package.json`));
}
