import type { IFileSystem, IWatchEvent, WatchEventListener } from '@file-services/types';
import type { Stylable } from '@stylable/core';
import type { StylableResolverCache } from '@stylable/core/dist/index-internal';
import type { BuildContext } from './types';
import decache from 'decache';
import {
    createWatchEvent,
    DirectoryProcessService,
} from './directory-process-service/directory-process-service';
import { createDefaultLogger, levels, Log } from './logger';
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

export interface RegisteredBuild extends Build {
    generatedFiles: Set<string>;
}

type File = {
    generated?: boolean;
} & IWatchEvent;

export class WatchHandler {
    private builds: Build[] = [];
    private resolverCache: StylableResolverCache;
    private log: Log;
    private diagnosticsManager: DiagnosticsManager;
    private generatedFiles = new Set<string>();

    constructor(private fileSystem: IFileSystem, private options: WatchHandlerOptions = {}) {
        this.resolverCache = this.options.resolverCache ?? new Map();
        this.log = this.options.log ?? createDefaultLogger();
        this.diagnosticsManager =
            this.options.diagnosticsManager ?? new DiagnosticsManager({ log: this.log });
    }

    public readonly listener = async (event: IWatchEvent) => {
        this.log(buildMessages.CHANGE_EVENT_TRIGGERED(event.path));

        if (this.generatedFiles.has(event.path)) {
            this.log(buildMessages.SKIP_GENERATED_FILE(event.path));
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
                    buildMessages.NO_DIAGNOSTICS(),
                    buildMessages.CONTINUE_WATCH(),
                    levels.info
                );
            } else {
                this.log(buildMessages.CONTINUE_WATCH(), levels.info);
            }
        }
    };

    public register({ generatedFiles, ...build }: RegisteredBuild) {
        this.builds.push(build);

        for (const file of generatedFiles) {
            this.generatedFiles.add(file);
        }
    }

    public start() {
        this.log(buildMessages.START_WATCHING(), levels.info);
        this.fileSystem.watchService.addGlobalListener(this.listener as WatchEventListener);
    }

    public async stop() {
        this.log(buildMessages.STOP_WATCHING(), levels.info);
        this.diagnosticsManager.clear();
        this.fileSystem.watchService.removeGlobalListener(this.listener as WatchEventListener);

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
