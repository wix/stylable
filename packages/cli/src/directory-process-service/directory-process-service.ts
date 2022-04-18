import nodeFs from '@file-services/node';
import type { IFileSystem, IWatchEvent } from '@file-services/types';
import { directoryDeepChildren, DirectoryItem } from './walk-fs';

export interface DirectoryProcessServiceOptions {
    processFiles?(
        watcher: DirectoryProcessService,
        affectedFiles: Set<string>,
        deletedFiles: Set<string>,
        changeOrigin?: IWatchEvent
    ): Promise<{ generatedFiles: Set<string> }> | { generatedFiles: Set<string> };
    directoryFilter?(directoryPath: string): boolean;
    fileFilter?(filePath: string): boolean;
    onError?(error: Error): void;
    autoResetInvalidations?: boolean;
    watchMode?: boolean;
    watchOptions?: {
        skipInitialWatch?: boolean;
    };
}

export class DirectoryProcessService {
    public invalidationMap = new Map<string, Set<string>>();
    public watchedDirectoryFiles = new Map<string, Set<string>>();
    constructor(private fs: IFileSystem, private options: DirectoryProcessServiceOptions = {}) {
        if (this.options.watchMode && !this.options.watchOptions?.skipInitialWatch) {
            this.startWatch();
        }
    }
    public startWatch() {
        this.fs.watchService.addGlobalListener(this.watchHandler);
    }
    public async dispose() {
        for (const path of this.watchedDirectoryFiles.keys()) {
            await this.fs.watchService.unwatchPath(path);
        }

        this.invalidationMap.clear();
        this.watchedDirectoryFiles.clear();
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
        if (affectedFiles.size) {
            try {
                await this.options.processFiles?.(this, affectedFiles, new Set());
            } catch (error) {
                this.options.onError?.(error as Error);
            }
        }

        return affectedFiles;
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
            if (fileSet.size === 0) {
                this.watchedDirectoryFiles.delete(dirName);
            }
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
    public async handleWatchChange(
        files: Map<string, IWatchEvent>,
        originalEvent: IWatchEvent
    ): Promise<{
        hasChanges: boolean;
        generatedFiles: Set<string>;
    }> {
        const affectedFiles = new Set<string>();
        const deletedFiles = new Set<string>();

        for (const event of files.values()) {
            if (event.stats?.isDirectory()) {
                if (this.options.directoryFilter?.(event.path) ?? true) {
                    for (const filePath of await this.init(event.path)) {
                        affectedFiles.add(filePath);
                    }
                }
                continue;
            }

            if (this.options.fileFilter?.(event.path) ?? true) {
                if (event.stats) {
                    this.registerInvalidateOnChange(event.path);
                    this.addFileToWatchedDirectory(event.path);
                    affectedFiles.add(event.path);
                } else {
                    this.invalidationMap.delete(event.path);
                    this.removeFileFromWatchedDirectory(event.path);
                    deletedFiles.add(event.path);
                }

                if (this.options.autoResetInvalidations) {
                    for (const filePath of affectedFiles) {
                        const invalidationSet = this.invalidationMap.get(filePath);
                        invalidationSet?.clear();
                    }
                }
            } else if (!event.stats) {
                // handle deleted directory
                const fileSet = new Set<string>();
                for (const [dirPath, files] of this.watchedDirectoryFiles) {
                    if (dirPath.startsWith(event.path)) {
                        for (const filePath of files) {
                            fileSet.add(filePath);
                        }
                    }
                }

                if (fileSet.size) {
                    for (const filePath of fileSet) {
                        this.getAffectedFiles(filePath, deletedFiles);
                    }

                    for (const filePath of deletedFiles) {
                        this.invalidationMap.delete(filePath);
                        this.removeFileFromWatchedDirectory(filePath);
                    }
                }
            }
        }

        if (this.options.processFiles && (affectedFiles.size || deletedFiles.size)) {
            const { generatedFiles } = await this.options.processFiles(
                this,
                affectedFiles,
                deletedFiles,
                originalEvent
            );

            return {
                hasChanges: true,
                generatedFiles,
            };
        } else {
            return {
                hasChanges: false,
                generatedFiles: new Set(),
            };
        }
    }
    public getAffectedFiles(filePath: string, visited = new Set<string>()): Set<string> {
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
        const files = new Map<string, IWatchEvent>();
        files.set(event.path, event);

        for (const file of this.getAffectedFiles(event.path)) {
            files.set(file, createWatchEvent(file, this.fs));
        }

        this.handleWatchChange(files, event).catch((error) => this.options.onError?.(error));
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

export function createWatchEvent(filePath: string, fs = nodeFs): IWatchEvent {
    return {
        path: filePath,
        stats: fs.existsSync(filePath) ? fs.statSync(filePath) : null,
    };
}
