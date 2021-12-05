import type { IFileSystem, IWatchEvent, WatchEventListener } from '@file-services/types';
import { Stylable, StylableResolverCache } from '@stylable/core';
import decache from 'decache';
import {
    createWatchEvent,
    DirectoryProcessService,
} from './directory-process-service/directory-process-service';
import { levels, Log } from './logger';
import { messages } from './messages';
import { DiagnosticsManager } from './diagnostics-manager';

export interface DirectoriesHandlerServiceOptions {
    log?: Log;
    resolverCache?: StylableResolverCache;
    outputFiles?: Map<string, string>;
    rootDir?: string;
    diagnosticsManager?: DiagnosticsManager;
}

export interface RegisterMetaData {
    identifier: string;
    stylable: Stylable;
}

export interface Service extends RegisterMetaData {
    directoryProcess: DirectoryProcessService;
}

export class BuildsHandler {
    private services = new Set<Service>();
    private listener: WatchEventListener | undefined;
    private resolverCache: StylableResolverCache = new Map();
    private diagnosticsManager = new DiagnosticsManager();

    constructor(
        private fileSystem: IFileSystem,
        private options: DirectoriesHandlerServiceOptions = {}
    ) {
        if (this.options.resolverCache) {
            this.resolverCache = this.options.resolverCache;
        }

        if (this.options.diagnosticsManager) {
            this.diagnosticsManager = this.options.diagnosticsManager;
        }
    }

    public register(
        directoryProcess: DirectoryProcessService,
        { identifier, stylable }: RegisterMetaData
    ) {
        this.services.add({
            identifier,
            directoryProcess,
            stylable,
        });
    }

    public start() {
        this.listener = async (event) => {
            this.invalidateCache(event.path);

            let foundChanges = false;
            const files = new Map<string, IWatchEvent>();

            for (const { directoryProcess, identifier } of this.services) {
                for (const path of directoryProcess.getAffectedFiles(event.path)) {
                    if (files.has(path)) {
                        continue;
                    }

                    files.set(path, createWatchEvent(path, this.fileSystem));
                }

                const { hasChanges } = await directoryProcess.handleWatchChange(files, event);

                if (hasChanges) {
                    if (!foundChanges) {
                        foundChanges = true;

                        this.log(
                            messages.CHANGE_DETECTED(
                                event.path.replace(this.options.rootDir ?? '', '')
                            )
                        );
                    }

                    this.log(messages.BUILD_PROCESS_INFO(identifier), Array.from(files.keys()));
                }
            }

            if (foundChanges) {
                const { changed, deleted } = this.filesStats(files);

                this.log(levels.clear);
                this.log(
                    messages.WATCH_SUMMARY(changed, deleted),
                    messages.CONTINUE_WATCH(),
                    levels.info
                );
                this.diagnosticsManager.report();
            }
        };

        this.fileSystem.watchService.addGlobalListener(this.listener);
    }

    public stop() {
        if (this.listener) {
            this.diagnosticsManager.clear();
            this.fileSystem.watchService.removeGlobalListener(this.listener);
        } else {
            throw new Error('Builds Handler never started');
        }
    }

    private invalidateCache(path: string) {
        Stylable.prototype.initCache.call(
            { resolverCache: this.resolverCache },
            {
                filter: (_, entity) => {
                    if (!entity.value) {
                        return false;
                    } else if (
                        entity.value &&
                        (entity.resolvedPath === path ||
                            this.options.outputFiles?.get(entity.resolvedPath) === path)
                    ) {
                        if (entity.kind === 'js') {
                            decache(path);
                        }

                        return false;
                    } else {
                        return true;
                    }
                },
            }
        );
    }

    private log(...messages: any[]) {
        this.options.log?.(`[${new Date().toLocaleTimeString()}]`, ...messages);
    }

    private filesStats(files: Map<string, IWatchEvent>) {
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
}
