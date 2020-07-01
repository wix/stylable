import { Stylable, StylableConfig } from '@stylable/core';
import { Compiler } from 'webpack';

const stylableInstancesCache = new WeakMap<Compiler, Map<Stylable, StylableConfig>>();

export function getStylable(compiler: Compiler, initialConfig: StylableConfig): Stylable {
    compiler = getTopParentCompiler(compiler);
    let cache = stylableInstancesCache.get(compiler);
    if (!cache) {
        cache = new Map();
        stylableInstancesCache.set(compiler, cache);
    }

    let stylable = findMatchingStylableInstance(initialConfig, cache);
    if (!stylable) {
        stylable = Stylable.create(initialConfig);
        cache.set(stylable, initialConfig);
    }
    return stylable;
}

function findMatchingStylableInstance(
    initialConfig: StylableConfig,
    stylableInstances: Map<Stylable, StylableConfig>
) {
    const entries = Object.entries(initialConfig) as [keyof StylableConfig, unknown][];
    for (const [instance, config] of stylableInstances) {
        if (entries.every(([key, value]) => config[key] === value)) {
            return instance;
        }
    }
    return undefined;
}

function getTopParentCompiler(compiler: Compiler /* webpack.Compiler */): Compiler {
    while (compiler.isChild()) {
        const parentCompiler: Compiler = (compiler as any).parentCompilation?.compiler;
        if (!parentCompiler) {
            return compiler;
        }
        compiler = parentCompiler;
    }
    return compiler;
}
