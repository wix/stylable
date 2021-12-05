import type { IWatchEvent } from '@file-services/types';
import type { DirectoryProcessService } from '../directory-process-service/directory-process-service';

export interface DirectoryProcessServiceOptions {
    processFiles?(
        watcher: DirectoryProcessService,
        affectedFiles: Set<string>,
        deletedFiles: Set<string>,
        changeOrigin?: IWatchEvent
    ): Promise<void> | void;
    directoryFilter?(directoryPath: string): boolean;
    fileFilter?(filePath: string): boolean;
    onError?(error: Error): void;
    autoResetInvalidations?: boolean;
    watchMode?: boolean;
    watchOptions?: {
        skipInitialWatch?: boolean;
    };
}
