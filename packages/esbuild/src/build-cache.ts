import { statSync } from 'fs';
import type { OnLoadResult } from 'esbuild';

// mtimes of known files shared between builds
const fileInfo = new Map<string, number>();

export function buildCache() {
    const fileInfoDuringBuild = new Map<string, number>();
    const cache = new Map<string, OnLoadResult>();
    const checkCache = (path: string) => {
        const cached = cache.get(path);
        if (cached) {
            const shouldRebuild = cached.watchFiles?.some((path) => {
                const num = fileInfo.get(path);
                if (num) {
                    let stat = fileInfoDuringBuild.get(path);
                    if (stat === undefined) {
                        try {
                            stat = statSync(path).mtimeMs;
                            fileInfoDuringBuild.set(path, stat);
                        } catch {
                            fileInfo.delete(path);
                            return true;
                        }
                    }
                    return stat !== num;
                } else {
                    return true;
                }
            });
            if (!shouldRebuild) {
                return cached;
            }
        }
        return undefined;
    };
    const addToCache = (path: string, result: OnLoadResult) => {
        cache.set(path, result);
        for (const watchFile of result.watchFiles || []) {
            if (fileInfo.has(watchFile)) {
                continue;
            }
            fileInfo.set(watchFile, statSync(watchFile).mtimeMs);
        }
        return result;
    };
    const transferBuildInfo = () => {
        for (const [key, value] of fileInfoDuringBuild) {
            fileInfo.set(key, value);
        }
        fileInfoDuringBuild.clear();
    };

    return { checkCache, addToCache, transferBuildInfo };
}
