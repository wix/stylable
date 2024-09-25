export default {
  pinnedPackages: [
    { name: 'flat', reason: 'esm-only' },
    { name: 'mime', reason: 'esm-only' },
    { name: 'chai', reason: 'esm-only' },
    { name: '@types/chai', reason: 'esm-only' },
    { name: '@types/mime', reason: 'v4 has built-in types, but is esm-only' },
    { name: 'rimraf', reason: 'drops node 18 support' },
  ],
};
