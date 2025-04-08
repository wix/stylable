import type { IFileSystem, IFileSystemStats } from '@file-services/types';
import { watchDebounced, type DebouncedWatcher } from './watch-debounced.js';

export interface IWatchEvent {
    path: string;
    stats: IFileSystemStats | null;
}

export interface WatchService {
    watchPath(path: string): void;
    unwatchPath(path: string): void;
    dispose(): void;
    addGlobalListener(listener: (event: IWatchEvent) => void): void;
    removeGlobalListener(listener: (event: IWatchEvent) => void): void;
}

export function createWatchService(fs: IFileSystem): WatchService {
    const watchedPaths = new Map<string, DebouncedWatcher>();
    const globalListeners = new Set<(event: IWatchEvent) => void>();

    const rewatchPath = (filePath: string) => {
        const existingWatcher = watchedPaths.get(filePath);
        existingWatcher?.close();
        watchedPaths.delete(filePath);
        watchService.watchPath(filePath);
    };

    const watchService: WatchService = {
        watchPath(path) {
            if (watchedPaths.has(path)) {
                return;
            }
            const watcher = watchDebounced(fs, path, (eventType, relativePath) => {
                const filePath = fs.join(path, relativePath);
                const event = createWatchEvent(filePath, fs);
                if (eventType === 'rename' && watchedPaths.has(filePath)) {
                    if (event.stats) {
                        rewatchPath(filePath);
                    } else {
                        watchedPaths.get(filePath)?.close();
                        watchedPaths.delete(filePath);
                    }
                }
                for (const listener of globalListeners) {
                    listener(event);
                }
            });
            watchedPaths.set(path, watcher);
        },
        unwatchPath(path) {
            const watcher = watchedPaths.get(path);
            if (watcher) {
                watcher.close();
                watchedPaths.delete(path);
            }
        },
        dispose() {
            for (const watcher of watchedPaths.values()) {
                watcher.close();
            }
            watchedPaths.clear();
        },
        addGlobalListener(listener) {
            globalListeners.add(listener);
        },
        removeGlobalListener(listener) {
            globalListeners.delete(listener);
        },
    };
    return watchService;
}

export function createWatchEvent(filePath: string, fs: IFileSystem): IWatchEvent {
    return {
        path: filePath,
        stats: statSyncSafe(filePath, fs),
    };
}

function statSyncSafe(path: string, fs: IFileSystem) {
    try {
        return fs.statSync(path, { throwIfNoEntry: false }) ?? null;
    } catch {
        return null;
    }
}
