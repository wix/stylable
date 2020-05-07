import webpack from 'webpack';
import { ProjectRunner } from './project-runner';

export class StylableProjectRunner extends ProjectRunner {
    public loadTestConfig(configName?: string, webpackOptions: webpack.Configuration = {}) {
        const config = super.loadTestConfig(configName, webpackOptions);
        if (config.plugins) {
            const plugin = config.plugins.find(
                (p: any) => p.constructor.name === 'StylableWebpackPlugin'
            );
            if (plugin) {
                plugin.userOptions.optimize = plugin.userOptions.optimize || {};
            }
        }
        return config;
    }
}
