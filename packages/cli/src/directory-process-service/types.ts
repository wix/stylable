import type { IWatchEvent } from '@file-services/types';
import type { DiagnosticsMode } from '@stylable/core';
import type { DirectoryProcessService } from '../directory-process-service/directory-process-service';
import type { DiagnosticMessages } from '../report-diagnostics';

export interface DirectoryProcessServiceOptions {
    processFiles?(
        watcher: DirectoryProcessService,
        affectedFiles: Set<string>,
        deletedFiles: Set<string>,
        changeOrigin?: IWatchEvent
    ): Promise<ProcessFilesResponse | void> | ProcessFilesResponse | void;
    directoryFilter?(directoryPath: string): boolean;
    fileFilter?(filePath: string): boolean;
    onError?(error: Error): void;
    autoResetInvalidations?: boolean;
    watchMode?: boolean;
    watchOptions?: {
        skipInitialWatch?: boolean;
    };
}

export interface ProcessFilesResponse {
    diagnosticsMessages: DiagnosticMessages;
    shouldReport?: boolean;
    diagnosticMode?: DiagnosticsMode;
}

export type HandleWatchModeResponse =
    | (ProcessFilesResponse & { hasChanges: true })
    | (Partial<ProcessFilesResponse> & { hasChanges: false });
