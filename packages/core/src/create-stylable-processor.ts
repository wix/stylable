import { cachedProcessFile, CacheItem, MinimalFS } from './cached-process-file';
import { cssParse, CssParser } from './parser';
import { processNamespace, StylableProcessor } from './stylable-processor';
import type { StylableMeta } from './stylable-meta';
import type { Diagnostics } from './diagnostics';

export function createStylableFileProcessor(
    fileSystem: MinimalFS,
    onProcess?: (meta: StylableMeta, path: string) => StylableMeta,
    resolveNamespace?: typeof processNamespace,
    cssParser: CssParser = cssParse,
    cache?: Record<string, CacheItem<StylableMeta>>,
    createDiagnostics?: (from: string) => Diagnostics
) {
    return cachedProcessFile<StylableMeta>(
        (from, content) => {
            return new StylableProcessor(createDiagnostics?.(from), resolveNamespace).process(
                cssParser(content, { from })
            );
        },
        {
            readFileSync(resolvedPath: string) {
                return fileSystem.readFileSync(resolvedPath, 'utf8');
            },
            statSync(resolvedPath: string) {
                const stat = fileSystem.statSync(resolvedPath);
                if (!stat.mtime) {
                    return {
                        mtime: new Date(0),
                    };
                }
                return stat;
            },
            readlinkSync() {
                throw new Error(`not implemented`);
            },
        },
        onProcess && [onProcess],
        cache
    );
}
