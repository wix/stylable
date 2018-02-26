import {create} from '../../src/runtime';
import { RuntimeStylesheet, StylesheetLocals } from '../../src/types';

const idObj = new Proxy({}, {
  get: (target: StylesheetLocals, key: string | symbol) => {
    if (key === Symbol.toPrimitive) {
      return () => {
        return null;
      };
    }

    if (typeof key === 'string' && key.match(/^\$/)) { // e.g. $cssState
      return target[key]; // use the reserved stylable functions and don't proxy
    }

    return key;
  },
  set: (target: StylesheetLocals, key: string, value: any) => target[key] = value
});

export default create('root', 'namespace', idObj, null, 'moduleId');
