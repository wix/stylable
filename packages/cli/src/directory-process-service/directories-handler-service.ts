import type { IFileSystem, IWatchEvent, WatchEventListener } from '@file-services/types';
import { createWatchEvent, DirectoryProcessService } from './directory-process-service';

interface RegisterMetaData {
    id: string;
}

interface Service {
    id: string;
    directoryProcess: DirectoryProcessService;
}

export class DirectoriesHandlerService {
    private services = new Set<Service>();
    private listener: WatchEventListener | undefined;
    constructor(private fileSystem: IFileSystem) {}

    public register(directoryProcess: DirectoryProcessService, { id }: RegisterMetaData) {
        this.services.add({
            id,
            directoryProcess,
        });
    }

    public start() {
        this.listener = async (event) => {
            const files = new Map<string, IWatchEvent>();

            for (const { directoryProcess } of this.services) {
                for (const path of directoryProcess.getAffectedFiles(event.path)) {
                    files.set(path, createWatchEvent(path, this.fileSystem));
                }
            }

            for (const { directoryProcess } of this.services) {
                await directoryProcess.handleWatchChange(files, event);
            }
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
