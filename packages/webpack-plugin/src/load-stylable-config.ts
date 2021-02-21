import type { Compiler } from 'webpack';
import findConfig from 'find-config';
import type { StylableWebpackPluginOptions } from './plugin';

export function loadStylableConfig(
    context: string
):
    | undefined
    | {
          webpackPlugin?: (options: Required<StylableWebpackPluginOptions>, compiler: Compiler) => Required<StylableWebpackPluginOptions>;
      } {
    const path = findConfig('stylable.config.js', { cwd: context });
    let config;
    if (path) {
        try {
            config = require(path);
        } catch (e) {
            throw new Error(`Failed to load "stylable.config.js" from ${path}\n${e.stack}`);
        }
        if (!config) {
            throw new Error(`Missing Stylable configuration ${config}`);
        }
        return config;
    }
    return undefined;
}
