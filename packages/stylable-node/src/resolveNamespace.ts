import { dirname, relative } from 'path';
import { processNamespace } from 'stylable';
const findConfig = require('find-config');

export const resolveNamespace: typeof processNamespace = (namespace, source) => {
    const configPath = findConfig('package.json', { cwd: dirname(source) });
    const config = require(configPath);
    const fromRoot = relative(dirname(configPath), source);
    console.log(namespace, fromRoot, config.name + '@' + config.version);
    return '!!!';
};
