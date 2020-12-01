import { Compiler } from 'webpack';
import findConfig from 'find-config';
import { Options } from './plugin';

export function loadStylableConfig(
    context: string
):
    | undefined
    | {
          webpackPlugin?: (options: Required<Options>, compiler: Compiler) => Required<Options>;
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
