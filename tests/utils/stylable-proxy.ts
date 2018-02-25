import {create} from '../../src/runtime';

const idObj = new Proxy({}, {
  get: (target: any, key: any) => {
    if (key === Symbol.toPrimitive) {
      return () => {
        return null;
      };
    }

    if (key.match(/^\$/)) { // e.g. $cssState
      return target[key]; // use the reserved stylable functions and don't proxy
    }

    return key;
  },
  set: (target: any, key: any, value: any) => target[key] = value
});

export default (create('root', 'namespace', idObj, null, 'moduleId') as any);
