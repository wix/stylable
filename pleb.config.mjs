export default {
  pinnedPackages: [
    {
      name: '@typescript-eslint/eslint-plugin',
      reason: 'drop node 14 and type issues with ESLintUtils.RuleCreator',
    },
    {
      name: '@typescript-eslint/parser',
      reason: 'drop node 14 and type issues with ESLintUtils.RuleCreator',
    },
    {
      name: '@typescript-eslint/utils',
      reason: 'drop node 14 and type issues with ESLintUtils.RuleCreator',
    },
    {
      name: '@wixc3/resolve-directory-context',
      reason: 'drop node 14',
    },
    {
      name: 'balanced-match',
      reason: 'esm only',
    },
    {
      name: 'flat',
      reason: 'esm only',
    },
    {
      name: 'chai',
      reason: 'version 5 is esm only',
    },
    {
      name: 'postcss-safe-parser',
      reason: 'version 7 removed support for node 16/14/12',
    },
    {
      name: 'mime',
      reason: 'version 4 is esm only & removed support for node < 18',
    },
  ],
};
