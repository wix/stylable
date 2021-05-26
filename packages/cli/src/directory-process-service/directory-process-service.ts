import type { IFileSystem, IWatchEvent } from '@file-services/types';
import { directoryDeepChildren, DirectoryItem } from './walk-fs';

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
}

export class DirectoryProcessService {
    public invalidationMap = new Map<string, Set<string>>();
    public watchedDirectoryFiles = new Map<string, Set<string>>();
    constructor(private fs: IFileSystem, private options: DirectoryProcessServiceOptions = {}) {
        if (this.options.watchMode) {
            this.fs.watchService.addGlobalListener(this.watchHandler);
        }
    }
    public async dispose() {
        this.invalidationMap.clear();
        await this.fs.watchService.unwatchAllPaths();
    }
    public async init(directoryPath: string) {
        await this.watchPath(directoryPath);
        const items = directoryDeepChildren(this.fs, directoryPath, this.filterWatchItems);
        const affectedFiles = new Set<string>();
        for await (const item of items) {
            if (item.type === 'directory') {
                await this.watchPath(item.path);
            } else if (item.type === 'file') {
                affectedFiles.add(item.path);
                this.addFileToWatchedDirectory(item.path);
                this.registerInvalidateOnChange(item.path);
            }
        }
        if (affectedFiles.size === 0) {
            return;
        }
        try {
            return this.options.processFiles?.(this, affectedFiles, new Set());
        } catch (error) {
            this.options.onError?.(error);
        }
    }
    private addFileToWatchedDirectory(filePath: string) {
        const dirName = this.fs.dirname(filePath);
        let fileSet = this.watchedDirectoryFiles.get(dirName);
        if (!fileSet) {
            fileSet = new Set();
            this.watchedDirectoryFiles.set(dirName, fileSet);
        }
        fileSet.add(filePath);
    }
    private removeFileFromWatchedDirectory(filePath: string) {
        const dirName = this.fs.dirname(filePath);
        const fileSet = this.watchedDirectoryFiles.get(dirName);
        if (fileSet) {
            fileSet.delete(filePath);
        }
    }

    public registerInvalidateOnChange(watchedFilePath: string, filePathToInvalidate?: string) {
        let fileSet = this.invalidationMap.get(watchedFilePath);
        if (!fileSet) {
            fileSet = new Set<string>();
            this.invalidationMap.set(watchedFilePath, fileSet);
        }
        if (filePathToInvalidate) {
            fileSet.add(filePathToInvalidate);
        }
    }
    private watchPath(directoryPath: string) {
        if (!this.options.watchMode) {
            return;
        }
        this.watchedDirectoryFiles.set(directoryPath, new Set());
        return this.fs.watchService.watchPath(directoryPath);
    }
    private async handleWatchChange(event: IWatchEvent) {
        if (event.stats?.isDirectory()) {
            if (this.options.directoryFilter?.(event.path) ?? true) {
                return this.init(event.path);
            }
            return;
        }
        if (
            !this.invalidationMap.has(event.path) &&
            (this.options.fileFilter?.(event.path) ?? true)
        ) {
            this.registerInvalidateOnChange(event.path);
        }
        if (this.invalidationMap.has(event.path)) {
            const affectedFiles = this.getAffectedFiles(event.path);
            const deletedFiles = new Set<string>();
            if (!event.stats) {
                this.invalidationMap.delete(event.path);
                this.removeFileFromWatchedDirectory(event.path);
                deletedFiles.add(event.path);
                affectedFiles.delete(event.path);
            }
            if (this.options.autoResetInvalidations) {
                for (const filePath of affectedFiles) {
                    const invalidationSet = this.invalidationMap.get(filePath);
                    invalidationSet?.clear();
                }
            }
            return this.options.processFiles?.(this, affectedFiles, deletedFiles, event);
        } else if (!event.stats) {
            const fileSet = new Set<string>();
            for (const [dirPath, files] of this.watchedDirectoryFiles) {
                if (dirPath.startsWith(event.path)) {
                    for (const filePath of files) {
                        fileSet.add(filePath);
                    }
                }
            }

            if (fileSet.size) {
                const affectedFiles = new Set<string>();
                const deletedFiles = new Set<string>();
                for (const filePath of fileSet) {
                    this.getAffectedFiles(filePath, affectedFiles);
                }
                for (const filePath of fileSet) {
                    this.invalidationMap.delete(filePath);
                    this.removeFileFromWatchedDirectory(filePath);
                    deletedFiles.add(filePath);
                    affectedFiles.delete(filePath);
                }
                return this.options.processFiles?.(this, affectedFiles, deletedFiles, event);
            }
        }
    }
    private getAffectedFiles(filePath: string, visited = new Set<string>()): Set<string> {
        if (visited.has(filePath)) {
            return visited;
        }
        visited.add(filePath);
        const fileSet = this.invalidationMap.get(filePath);
        if (!fileSet) {
            return visited;
        }
        for (const file of fileSet) {
            this.getAffectedFiles(file, visited);
        }
        return visited;
    }
    private watchHandler = (event: IWatchEvent) => {
        this.handleWatchChange(event).catch((error) => this.options.onError?.(error));
    };
    private filterWatchItems = (event: DirectoryItem): boolean => {
        const { fileFilter, directoryFilter } = this.options;
        if (event.type === 'file' && (fileFilter?.(event.path) ?? true)) {
            return true;
        } else if (event.type === 'directory' && (directoryFilter?.(event.path) ?? true)) {
            return true;
        }
        return false;
    };
}
