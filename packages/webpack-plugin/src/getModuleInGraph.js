const earlyReturn = Symbol('earlyReturn');

/**
 * Extracted from webpack 4.
 * ADD EARLY BREAK WITH RETURN
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
        for (const child of chunkGroup.childrenIterable) {
            queue.add(child);
        }
    }
    return modules;
}

function hasStylableModuleInGraph(chunk) {
    return getModuleInGraph(chunk, m => (m.type === 'stylable' ? earlyReturn : false)).size !== 0;
}

exports.hasStylableModuleInGraph = hasStylableModuleInGraph;
exports.getModuleInGraph = getModuleInGraph;
