import { cachedProcessFile, CacheItem, MinimalFS } from './cached-process-file';
import { cssParse, CssParser } from './parser';
import { processNamespace, StylableProcessor } from './stylable-processor';
import type { StylableMeta } from './stylable-meta';
import type { Diagnostics } from './diagnostics';
import { defaultFeatureFlags, type FeatureFlags } from './features/feature';

export function createStylableFileProcessor({
    fileSystem,
    onProcess,
    resolveNamespace,
    cssParser = cssParse,
    cache,
    createDiagnostics,
    flags = { ...defaultFeatureFlags },
}: {
    fileSystem: MinimalFS;
    flags?: FeatureFlags;
    onProcess?: (meta: StylableMeta, path: string) => StylableMeta;
    resolveNamespace?: typeof processNamespace;
    cssParser?: CssParser;
    cache?: Record<string, CacheItem<StylableMeta>>;
    createDiagnostics?: (from: string) => Diagnostics;
}) {
    return cachedProcessFile<StylableMeta>(
        (from, content) => {
            return new StylableProcessor(
                createDiagnostics?.(from),
                resolveNamespace,
                flags
            ).process(cssParser(content, { from }));
        },
        (resolvedPath: string) => {
            return fileSystem.readFileSync(resolvedPath, 'utf8');
        },
        onProcess && [onProcess],
        cache
    );
}
