import { processNamespace } from '@stylable/core';
import { dirname, relative } from 'path';
const findConfig = require('find-config');

export const resolveNamespace: typeof processNamespace = (namespace, source) => {
    const configPath = findConfig('package.json', { cwd: dirname(source) });
    const config = require(configPath);
    const fromRoot = relative(dirname(configPath), source);
    console.log(namespace, fromRoot, config.name + '@' + config.version);
    return '!!!';
};
