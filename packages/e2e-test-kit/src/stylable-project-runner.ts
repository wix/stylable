import { ProjectRunner } from './project-runner';
import { basename } from 'path';

export class StylableProjectRunner extends ProjectRunner {
    public loadTestConfig(configName?: string) {
        const config = super.loadTestConfig(configName);
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

export function getProjectName(__filename: string) {
    return basename(__filename).replace(/\.spec\.(j|t)sx?/, '');
}
