import webpack from 'webpack';

export class RemoveUnusedCSSModules {
    public apply(compiler: webpack.Compiler) {
        compiler.hooks.compilation.tap(
            RemoveUnusedCSSModules.name,
            (compilation: webpack.compilation.Compilation) => {
                compilation.hooks.afterOptimizeChunks.tap(
                    RemoveUnusedCSSModules.name,
                    (chunks: webpack.compilation.Chunk[]) => {
                        chunks.forEach(this.removeUnusedModules, this);
                    }
                );
            }
        );
    }

    private removeUnusedModules(chunk: webpack.compilation.Chunk) {
        const bootstraps: any[] = [];
        const removed = new Set();
        Array.from(chunk.modulesIterable).forEach((_module: any) => {
            if (_module.type === 'stylable-bootstrap') {
                bootstraps.push(_module);
            }
            if (_module.type === 'stylable') {
                if (!_module.buildInfo.isImportedByNonStylable) {
                    removed.add(_module);
                    chunk.removeModule(_module);
                }
            }
        });
        const stylableBootstrap = (chunk as any).stylableBootstrap;
        if (stylableBootstrap) {
          bootstraps.push(stylableBootstrap);
        }
        bootstraps.forEach(bootstrap => {
            bootstrap.dependencies = bootstrap.dependencies.filter((dep: any) => {
                return !removed.has(dep.module);
            });
        });
    }
}
