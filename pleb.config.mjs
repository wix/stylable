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
  ],
};
