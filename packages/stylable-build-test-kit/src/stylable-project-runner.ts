import { ProjectRunner } from './project-runner';

export class StylableProjectRunner extends ProjectRunner {
  public loadTestConfig() {
    const config = super.loadTestConfig();
    if (config.plugins) {
      const plugin = config.plugins.find(
        (p: any) => p.constructor.name === 'StylableWebpackPlugin'
      );
      if (plugin) {
        plugin.userOptions.optimize = plugin.userOptions.optimize || {};
        plugin.userOptions.optimize.shortNamespaces = true;
      }
    }
    return config;
  }
}
