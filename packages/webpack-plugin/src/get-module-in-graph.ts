import webpack from 'webpack';
import { StylableModule } from './types';

const earlyReturn = Symbol('earlyReturn');

/**
 * Extracted from webpack 4.
 * ADD EARLY BREAK WITH RETURN
 * @param {*} chunk
 * @param {*} filterFn
 * @param {*} filterChunkFn
 */
export function getModuleInGraph(
    chunk: webpack.compilation.Chunk,
    filterFn: (m: StylableModule) => symbol | boolean,
    filterChunkFn?: (c: webpack.compilation.Chunk) => boolean
) {
    const queue = new Set<webpack.compilation.ChunkGroup>(chunk.groupsIterable);
    const chunksProcessed = new Set<webpack.compilation.Chunk>();
    const modules = new Set<StylableModule>();

    for (const chunkGroup of queue) {
        for (const chunk of (chunkGroup as any).chunks) {
            if (!chunksProcessed.has(chunk)) {
                chunksProcessed.add(chunk);
                if (!filterChunkFn || filterChunkFn(chunk)) {
                    for (const module of chunk.modulesIterable) {
                        const res = filterFn(module);
                        if (res) {
                            modules.add(module);
                            if (res === earlyReturn) {
                                return modules;
                            }
                        }
                    }
                }
            }
        }
        for (const child of (chunkGroup as any).childrenIterable) {
            queue.add(child);
        }
    }
    return modules;
}

export function hasStylableModuleInGraph(chunk: webpack.compilation.Chunk) {
    return getModuleInGraph(chunk, m => (m.type === 'stylable' ? earlyReturn : false)).size !== 0;
}
