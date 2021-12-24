import { relative } from 'path';
import { Module, Compiler, NormalModule, sources } from 'webpack';

const isNormalModule = (module: Module): module is NormalModule => {
    return (module as NormalModule).resource !== undefined;
};

export class TestManifestPlugin {
    apply(compiler: Compiler) {
        compiler.hooks.compilation.tap(TestManifestPlugin.name, (compilation) => {
            compilation.hooks.additionalAssets.tap(TestManifestPlugin.name, () => {
                const data: Record<string, string> = {};
                for (const module of compilation.modules) {
                    if (isNormalModule(module)) {
                        const {
                            resource,
                            buildInfo: { stylableNamespace },
                        } = module;

                        if (resource.endsWith('.st.css') && stylableNamespace) {
                            data[relative(compiler.context, resource)] = stylableNamespace;
                        }
                    }
                }

                compilation.assets['test-manifest.json'] = new sources.RawSource(
                    JSON.stringify(data, null, 4)
                );
            });
        });
    }
}
