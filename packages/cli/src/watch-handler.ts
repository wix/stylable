import type { IFileSystem, IWatchEvent, WatchEventListener } from '@file-services/types';
import type { Stylable, StylableResolverCache } from '@stylable/core';
import decache from 'decache';
import {
    createWatchEvent,
    DirectoryProcessService,
} from './directory-process-service/directory-process-service';
import { levels, Log } from './logger';
import { processMessages } from './messages';
import { DiagnosticsManager } from './diagnostics-manager';

export interface WatchHandlerOptions {
    log?: Log;
    resolverCache?: StylableResolverCache;
    outputFiles?: Map<string, string>;
    rootDir?: string;
    diagnosticsManager?: DiagnosticsManager;
}

export interface Process {
    service: DirectoryProcessService;
    identifier: string;
    stylable: Stylable;
}

export class WatchHandler {
    private processes = new Set<Process>();
    private resolverCache: StylableResolverCache = new Map();
    private diagnosticsManager = new DiagnosticsManager();
    private listener: WatchEventListener = async (event) => {
        this.log(processMessages.CHANGE_DETECTED(event.path));
        this.invalidateCache(event.path);

        let foundChanges = false;
        const files = new Map<string, IWatchEvent>();

        for (const { service, identifier } of this.processes) {
            for (const path of service.getAffectedFiles(event.path)) {
                if (files.has(path)) {
                    continue;
                }

                files.set(path, createWatchEvent(path, this.fileSystem));
            }

            const { hasChanges } = await service.handleWatchChange(files, event);

            if (hasChanges) {
                foundChanges = true;

                this.log(processMessages.BUILD_PROCESS_INFO(identifier), Array.from(files.keys()));
            }
        }

        if (foundChanges) {
            const { changed, deleted } = filesStats(files);

            this.log(levels.clear);
            this.log(
                processMessages.WATCH_SUMMARY(changed, deleted),
                processMessages.CONTINUE_WATCH(),
                levels.info
            );
            this.diagnosticsManager.report();
        }
    };

    constructor(private fileSystem: IFileSystem, private options: WatchHandlerOptions = {}) {
        if (this.options.resolverCache) {
            this.resolverCache = this.options.resolverCache;
        }

        if (this.options.diagnosticsManager) {
            this.diagnosticsManager = this.options.diagnosticsManager;
        }
    }

    public register(process: Process) {
        this.processes.add(process);
    }

    public start() {
        this.fileSystem.watchService.addGlobalListener(this.listener);
    }

    public async stop() {
        this.diagnosticsManager.clear();
        this.fileSystem.watchService.removeGlobalListener(this.listener);

        for (const { service } of this.processes) {
            await service.dispose();
        }

        this.processes.clear();
    }

    private invalidateCache(filePath: string) {
        for (const [key, entity] of this.resolverCache) {
            if (
                !entity.value ||
                entity.resolvedPath === filePath ||
                this.options.outputFiles?.get(entity.resolvedPath) === filePath
            ) {
                if (entity.kind === 'js') {
                    decache(filePath);
                }

                this.resolverCache.delete(key);
            }
        }
    }

    private log(...messages: any[]) {
        const logger = this.options.log || console.log;

        logger(`[${new Date().toLocaleTimeString()}]`, ...messages);
    }
}

function filesStats(files: Map<string, IWatchEvent>) {
    const filesChangesSummary = {
        changed: 0,
        deleted: 0,
    };

    for (const file of files.values()) {
        if (file.stats) {
            filesChangesSummary.changed++;
        } else {
            filesChangesSummary.deleted++;
        }
    }

    return filesChangesSummary;
}
