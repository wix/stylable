import { relative } from 'path';
import webpack from 'webpack';
import { RawSource } from 'webpack-sources';

export class TestManifestPlugin {
    apply(compiler: webpack.Compiler) {
        compiler.hooks.compilation.tap(TestManifestPlugin.name, (compilation) => {
            compilation.hooks.additionalAssets.tap(TestManifestPlugin.name, () => {
                const data: Record<string, string> = {};
                for (const module of compilation.modules) {
                    if (module.resource?.endsWith('.st.css')) {
                        data[relative(compiler.context, module.resource)] =
                            module.buildInfo.stylableNamespace;
                    }
                }
                compilation.assets['test-manifest.json'] = new RawSource(
                    JSON.stringify(data, null, 4)
                );
            });
        });
    }
}
