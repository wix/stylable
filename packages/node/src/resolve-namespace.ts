import { processNamespace } from '@stylable/core';
import hash from 'murmurhash';
import { dirname, relative } from 'path';
const findConfig = require('find-config');

export const resolveNamespace: typeof processNamespace = (namespace: string, stylesheetPath: string) => {
    const configPath = findConfig('package.json', { cwd: dirname(stylesheetPath) });
    const config = require(configPath);
    const fromRoot = relative(dirname(configPath), stylesheetPath).replace(/\\/g, '/');
    return namespace + hash.v3(config.name + '@' + config.version + '/' + fromRoot, 0);
};
