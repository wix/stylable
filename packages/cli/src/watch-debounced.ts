import type { IFileSystem } from '@file-services/types';

export interface DebouncedWatcher {
    close(): void;
}

/**
 * Watches a target for changes, while debouncing events per path, so that if several "change" events are emitted
 * for the same file within `pathEventsDebounce` ms, only one event is emitted.
 */
export function watchDebounced(
    fs: IFileSystem,
    directoryPath: string,
    onEvent: (eventType: 'change' | 'rename', relativePath: string) => void,
    pathEventsDebounce = 50,
): DebouncedWatcher {
    const watcher = fs.watch(directoryPath);

    const pathToTimer = new Map<string, ReturnType<typeof setTimeout>>();

    function onChange(eventType: 'change' | 'rename', relativePath: string | Buffer | null): void {
        if (typeof relativePath !== 'string') {
            return;
        }

        const timer = pathToTimer.get(relativePath);
        if (timer !== undefined) {
            clearTimeout(timer);
        }
        const timerId = setTimeout(() => {
            pathToTimer.delete(relativePath);
            onEvent(eventType, relativePath);
        }, pathEventsDebounce);

        pathToTimer.set(relativePath, timerId);
    }

    watcher.on('change', onChange);
    watcher.on('error', () => {
        // ignore internal watcher errors.
        // we could log them somewhere, but using console.log spams the console
        // if no listener, process crashes
    });

    return {
        close() {
            watcher.off('change', onChange);
            watcher.close();
            for (const timerId of pathToTimer.values()) {
                clearTimeout(timerId);
            }
            pathToTimer.clear();
        },
    };
}
