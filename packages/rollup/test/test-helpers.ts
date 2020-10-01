import { basename, join } from 'path';
import { nodeFs } from '@file-services/node';
import { symlinkSync } from 'fs';
import { OutputChunk, RollupBuild, RollupWatcher, RollupWatcherEvent } from 'rollup';
import { createTempDirectorySync } from 'create-temp-directory';
import { deferred } from 'promise-assist';

export function actAndWaitForBuild(watcher: RollupWatcher, action?: () => void) {
    if (action) {
        setTimeout(action, 0);
    }
    const current = deferred<RollupWatcherEvent & { code: 'BUNDLE_END' }>();
    let bundleEnd: RollupWatcherEvent & { code: 'BUNDLE_END' };
    const handler = (e: RollupWatcherEvent) => {
        if (e.code === 'BUNDLE_END') {
            bundleEnd = e;
            console.log('next');
        }
        if (e.code === 'END') {
            current.resolve(bundleEnd);
            watcher.off('event', handler);
        }
        if (e.code === 'ERROR') {
            console.log('stop');
            current.reject(e);
            watcher.off('event', handler);
        }
    };
    watcher.on('event', handler);
    return current.promise;
}
export function createTempProject(projectToCopy: string, nodeModulesToLink: string, entry: string) {
    const tempDir = createTempDirectorySync('local-rollup-test');
    const projectPath = join(tempDir.path, 'project');
    nodeFs.copyDirectorySync(projectToCopy, projectPath);
    symlinkSync(nodeModulesToLink, join(tempDir.path, 'node_modules'), 'junction');
    after(() => {
        tempDir.remove();
    });
    return {
        context: tempDir.path,
        input: join(tempDir.path, 'project', entry),
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

export function getProjectPath(name: string, index = 'index.ts'): string {
    return join(__dirname, `projects/${name}/${index}`);
}
