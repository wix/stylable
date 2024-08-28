import { relative } from 'path';
import type { Module, Compiler, NormalModule } from 'webpack';

const isNormalModule = (module: Module): module is NormalModule => {
    return (module as NormalModule).resource !== undefined;
};

export class TestManifestPlugin {
    apply(compiler: Compiler) {
        compiler.hooks.compilation.tap(TestManifestPlugin.name, (compilation) => {
            compilation.hooks.additionalAssets.tap(TestManifestPlugin.name, () => {
                const data: Record<string, string> = {};
                for (const module of compilation.modules) {
                    if (isNormalModule(module) && module.resource.endsWith('.st.css')) {
                        const stylableNamespace = module.buildInfo?.stylableNamespace;

                        if (!stylableNamespace) {
                            throw new Error('No stylableNamespace found in buildInfo');
                        }

                        data[relative(compiler.context, module.resource)] = stylableNamespace;
                    }
                }

                compilation.assets['test-manifest.json'] = new compiler.webpack.sources.RawSource(
                    JSON.stringify(data, null, 4),
                );
            });
        });
    }
}
