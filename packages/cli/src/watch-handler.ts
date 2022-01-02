import type { IFileSystem, IWatchEvent, WatchEventListener } from '@file-services/types';
import type { Stylable, StylableResolverCache } from '@stylable/core';
import type { BuildContext } from './types';
import decache from 'decache';
import {
    createWatchEvent,
    DirectoryProcessService,
} from './directory-process-service/directory-process-service';
import { createLogger, levels, Log } from './logger';
import { buildMessages } from './messages';
import { DiagnosticsManager } from './diagnostics-manager';

export interface WatchHandlerOptions {
    log?: Log;
    resolverCache?: StylableResolverCache;
    outputFiles?: BuildContext['outputFiles'];
    rootDir?: string;
    diagnosticsManager?: DiagnosticsManager;
}

export interface Build {
    service: DirectoryProcessService;
    identifier: string;
    stylable: Stylable;
}

type File = {
    generated?: boolean;
} & IWatchEvent;

export class WatchHandler {
    private builds: Build[] = [];
    private resolverCache: StylableResolverCache = new Map();
    private diagnosticsManager = new DiagnosticsManager();
    private generatedFiles = new Set<string>();
    private log: Log;
    private listener: WatchEventListener = async (event) => {
        this.log(buildMessages.CHANGE_EVENT_TRIGGERED(event.path));

        if (this.generatedFiles.has(event.path)) {
            buildMessages.SKIP_GENERATED_FILE(event.path);
            return;
        }

        this.invalidateCache(event.path);

        let foundChanges = false;
        const files = new Map<string, File>();

        for (const { service, identifier } of this.builds) {
            for (const path of service.getAffectedFiles(event.path)) {
                if (files.has(path)) {
                    continue;
                }

                files.set(path, createWatchEvent(path, this.fileSystem));
            }

            const { hasChanges, generatedFiles } = await service.handleWatchChange(files, event);

            if (hasChanges) {
                if (!foundChanges) {
                    foundChanges = true;
                    this.generatedFiles.clear();

                    this.log(levels.clear);
                    this.log(buildMessages.CHANGE_DETECTED(event.path), levels.info);
                }

                for (const generatedFile of generatedFiles) {
                    this.generatedFiles.add(generatedFile);

                    files.set(generatedFile, {
                        ...(files.get(generatedFile) ||
                            createWatchEvent(generatedFile, this.fileSystem)),
                        generated: true,
                    });
                }

                this.log(buildMessages.BUILD_PROCESS_INFO(identifier), Array.from(files.keys()));
            }
        }

        if (foundChanges) {
            const { changed, deleted } = filesStats(files);

            this.log(buildMessages.WATCH_SUMMARY(changed, deleted), levels.info);

            const reported = this.diagnosticsManager.report();

            if (!reported) {
                this.log(
                    buildMessages.NO_DIANGOSTICS(),
                    buildMessages.CONTINUE_WATCH(),
                    levels.info
                );
            } else {
                this.log(buildMessages.CONTINUE_WATCH(), levels.info);
            }
        }
    };

    constructor(private fileSystem: IFileSystem, private options: WatchHandlerOptions = {}) {
        if (this.options.resolverCache) {
            this.resolverCache = this.options.resolverCache;
        }

        if (this.options.diagnosticsManager) {
            this.diagnosticsManager = this.options.diagnosticsManager;
        }

        this.log = this.options.log ?? createLogger(console.log, console.clear);
    }

    public register(process: Build) {
        this.builds.push(process);
    }

    public start() {
        this.fileSystem.watchService.addGlobalListener(this.listener);
    }

    public async stop() {
        this.diagnosticsManager.clear();
        this.fileSystem.watchService.removeGlobalListener(this.listener);

        for (const { service } of this.builds) {
            await service.dispose();
        }

        this.builds = [];
    }

    private invalidateCache(filePath: string) {
        for (const [key, entity] of this.resolverCache) {
            if (
                !entity.value ||
                entity.resolvedPath === filePath ||
                // deep source invalidation
                this.options.outputFiles?.get(entity.resolvedPath)?.has(filePath)
            ) {
                if (entity.kind === 'js') {
                    decache(filePath);
                }

                this.resolverCache.delete(key);
            }
        }
    }
}

function filesStats(files: Map<string, File>) {
    const filesChangesSummary = {
        changed: 0,
        deleted: 0,
    };

    for (const file of files.values()) {
        if (file.generated) {
            continue;
        }

        if (file.stats) {
            filesChangesSummary.changed++;
        } else {
            filesChangesSummary.deleted++;
        }
    }

    return filesChangesSummary;
}
