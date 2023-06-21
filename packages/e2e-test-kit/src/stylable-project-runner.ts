import { ProjectRunner } from './project-runner';

export class StylableProjectRunner extends ProjectRunner {
    protected loadWebpackConfig() {
        const config = super.loadWebpackConfig();
        if (config.plugins) {
            const plugin = config.plugins.find(
                (plugin) => plugin?.constructor.name === 'StylableWebpackPlugin'
            );

            if (plugin) {
                if ('userOptions' in plugin) {
                    plugin.userOptions.optimize = plugin.userOptions.optimize || {};
                } else {
                    throw new Error('This is not a StylableWebpackPlugin');
                }
            }
        }
        return config;
    }
}
