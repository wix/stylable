import { Stylable, StylableConfig } from '@stylable/core';
import type { Compiler } from 'webpack';
import decache from 'decache';

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
        const requireModuleCache = new Set<string>();
        const requireModule = (id: string) => {
            requireModuleCache.add(id);
            return require(id);
        };

        stylable = new Stylable({ ...initialConfig, requireModule });
        compiler.hooks.done.tap('StylableLoader stylable.initCache', () => {
            stylable!.initCache();
            for (const id of requireModuleCache) {
                decache(id);
            }
            requireModuleCache.clear();
        });
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
