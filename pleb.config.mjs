export default {
  // pinnedPackages: [{ name: 'name', reason: 'reason' }],
  pinnedPackages: [
    {
      name: '@types/yargs',
      reason:
        'regression in option type: https://github.com/DefinitelyTyped/DefinitelyTyped/discussions/63433 & https://github.com/DefinitelyTyped/DefinitelyTyped/pull/63415',
    },
  ],
};
