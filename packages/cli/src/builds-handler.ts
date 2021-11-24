import type { IFileSystem, IWatchEvent, WatchEventListener } from '@file-services/types';
import type { StylableResolverCache } from '@stylable/core';
import { levels } from './logger';
import { messages } from './messages';
import { reportDiagnostics } from './report-diagnostics';
import {
    createWatchEvent,
    DirectoryProcessService,
} from './directory-process-service/directory-process-service';
import decache from 'decache';
import type { DirectoriesHandlerServiceOptions, RegisterMetaData, Service } from './types';

export class BuildsHandler {
    private services = new Set<Service>();
    private listener: WatchEventListener | undefined;
    private resolverCache: StylableResolverCache = new Map();
    constructor(
        private fileSystem: IFileSystem,
        private options: DirectoriesHandlerServiceOptions = {}
    ) {
        if (this.options.resolverCache) {
            this.resolverCache = this.options.resolverCache;
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

                const response = await directoryProcess.handleWatchChange(files, event);

                if (response.hasChanges) {
                    const { diagnosticsMessages, diagnosticMode, shouldReport } = response;

                    if (!foundChanges) {
                        foundChanges = true;

                        this.log(
                            messages.CHANGE_DETECTED(
                                event.path.replace(this.options.rootDir ?? '', '')
                            )
                        );
                    }

                    this.log(messages.BUILD_PROCESS_INFO(identifier), Array.from(files.keys()));

                    reportDiagnostics(diagnosticsMessages, shouldReport, diagnosticMode);
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
            }
        };

        this.fileSystem.watchService.addGlobalListener(this.listener);
    }

    public stop() {
        if (this.listener) {
            this.fileSystem.watchService.removeGlobalListener(this.listener);
        } else {
            throw new Error('Builds Handler never started');
        }
    }

    private invalidateCache(path: string) {
        for (const [key, entity] of this.resolverCache) {
            if (
                !entity.value ||
                path === entity.resolvedPath ||
                path === this.options.outputFiles?.get(entity.resolvedPath)
            ) {
                this.resolverCache.delete(key);

                if (entity.kind === 'js') {
                    decache(path);
                }
            }
        }
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
