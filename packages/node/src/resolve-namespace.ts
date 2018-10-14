import { processNamespace } from '@stylable/core';
import { dirname, relative } from 'path';
const hash = require('murmurhash');
const findConfig = require('find-config');

export const resolveNamespace: typeof processNamespace = (namespace, source) => {
    const configPath = findConfig('package.json', { cwd: dirname(source) });
    const config = require(configPath);
    const fromRoot = relative(dirname(configPath), source);
    return namespace + hash.v3(config.name + '@' + config.version + '/' + fromRoot);
};
