import { expect } from 'chai';
import type * as postcss from 'postcss';
import { applyStylableForceStateSelectors } from '@stylable/webpack-extensions';
import { safeParse } from '@stylable/core';

describe('stylable-forcestates plugins', () => {
    it('basic native plugin support', () => {
        const ast = safeParse(`.x.my-state:hover {}`);

        applyStylableForceStateSelectors(ast, {}, 'dfs-', (ctx) => ({
            ...ctx,
            isStateClassName(content) {
                if (content === 'my-state') {
                    return true;
                }
                return false;
            },
            getStateClassName(name) {
                return name;
            },
        }));

        expect((ast.nodes[0] as postcss.Rule).selector).to.equal(
            '.x.my-state:hover,.x[dfs-my-state][dfs-hover]'
        );
    });
});
