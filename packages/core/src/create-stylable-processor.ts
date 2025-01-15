import { cachedProcessFile, CacheItem, MinimalFS } from './cached-process-file.js';
import { cssParse, CssParser } from './parser.js';
import { type processNamespace, StylableProcessor } from './stylable-processor.js';
import type { StylableMeta } from './stylable-meta.js';
import type { Diagnostics } from './diagnostics.js';
import { defaultFeatureFlags, type FeatureFlags } from './features/feature.js';

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
                flags,
            ).process(cssParser(content, { from }));
        },
        (resolvedPath: string) => {
            return fileSystem.readFileSync(resolvedPath, 'utf8');
        },
        onProcess && [onProcess],
        cache,
    );
}
