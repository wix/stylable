/**
 * Extracted from webpack 4.
 * @param {*} chunk
 * @param {*} filterFn
 * @param {*} filterChunkFn
 */
function getModuleInGraph(chunk, filterFn, filterChunkFn) {
    const queue = new Set(chunk.groupsIterable);
    const chunksProcessed = new Set();
    const modules = new Set();

    for (const chunkGroup of queue) {
        for (const chunk of chunkGroup.chunks) {
            if (!chunksProcessed.has(chunk)) {
                chunksProcessed.add(chunk);
                if (!filterChunkFn || filterChunkFn(chunk)) {
                    for (const module of chunk.modulesIterable) {
                        if (filterFn(module)) {
                            modules.add(module);
                        }
                    }
                }
            }
        }
        for (const child of chunkGroup.childrenIterable) {
            queue.add(child);
        }
    }
    return modules;
}

exports.getModuleInGraph = getModuleInGraph;
