import { createFeature } from './feature';

// HOOKS

export const hooks = createFeature({
    transformAtRuleNode({ atRule, context }) {
        if (atRule.name !== 'media') {
            return;
        }
        atRule.params = context.evaluator.evaluateValue(context, {
            value: atRule.params,
            meta: context.meta,
            node: atRule,
            initialNode: atRule,
        }).outputValue;
    },
});
