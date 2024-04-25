export default {
  pinnedPackages: [
    { name: 'flat', reason: 'esm only' },
    { name: 'mime', reason: 'esm only' },
    { name: '@types/mime', reason: 'v4 has built-in types, but is esm only' },
    { name: 'chai', reason: 'esm only from v5' },
    { name: 'eslint', reason: 'plugins are not yet compatible with v9' },
  ],
};
