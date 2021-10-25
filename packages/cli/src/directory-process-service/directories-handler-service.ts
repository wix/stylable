import type { IFileSystem, IWatchEvent, WatchEventListener } from '@file-services/types';
import { Log, levels } from '../logger';
import { createWatchEvent, DirectoryProcessService } from './directory-process-service';

interface RegisterMetaData {
    id: string;
}

interface Service {
    id: string;
    directoryProcess: DirectoryProcessService;
}

interface DirectoriesHandlerServiceOptions {
    log?: Log;
}

export class DirectoriesHandlerService {
    private services = new Set<Service>();
    private listener: WatchEventListener | undefined;
    constructor(
        private fileSystem: IFileSystem,
        private options: DirectoriesHandlerServiceOptions = {}
    ) {}

    public register(directoryProcess: DirectoryProcessService, { id }: RegisterMetaData) {
        this.services.add({
            id,
            directoryProcess,
        });
    }

    public start() {
        this.listener = async (event) => {
            this.options.log?.(levels.clear);
            this.options.log?.(
                `[${new Date().toLocaleTimeString()}]`,
                'Change detected. Starting compilation...',
                levels.info
            );

            const files = new Map<string, IWatchEvent>();
            const filesChangesSummary = {
                changed: 0,
                deleted: 0,
            };

            for (const { directoryProcess, id } of this.services) {
                this.options.log?.(`Aggregating affected files of "${id}"`);

                for (const path of directoryProcess.getAffectedFiles(event.path)) {
                    files.set(path, createWatchEvent(path, this.fileSystem));
                }
            }

            for (const { directoryProcess, id } of this.services) {
                this.options.log?.(`Handling watch of "${id}"`);
                await directoryProcess.handleWatchChange(files, event);
            }

            for (const file of files.values()) {
                if (file.stats) {
                    filesChangesSummary.changed++;
                } else {
                    filesChangesSummary.deleted++;
                }
            }

            this.options.log?.(
                `[${new Date().toLocaleTimeString()}]`,
                'Found',
                filesChangesSummary.changed,
                'changes and',
                filesChangesSummary.deleted,
                'deletions.',
                levels.info
            );
        };

        this.fileSystem.watchService.addGlobalListener(this.listener);
    }

    public stop() {
        if (this.listener) {
            this.fileSystem.watchService.removeGlobalListener(this.listener);
        } else {
            throw new Error('Directories Handler never started');
        }
    }
}
