import { expect } from 'chai';
import { testStylableCore } from '@stylable/core-test-kit';

describe('post-process', () => {
    it("should call postProcess after transform and use it's return value", () => {
        const { sheets } = testStylableCore(`.part {}`, {
            stylableConfig: {
                hooks: {
                    postProcessor(res) {
                        res.meta.outputAst!.walkRules((rule) => {
                            rule.selector = rule.selector.replace(`.entry__part`, `.custom-part`);
                        });
                        res.exports.classes.part = `custom-part`;
                        return res;
                    },
                },
            },
        });

        const { meta, exports } = sheets[`/entry.st.css`];
        expect(meta.outputAst?.toString(), `change meta`).to.eql(`.custom-part {}`);
        expect(exports.classes.part, `JS exports`).to.eql(`custom-part`);
    });
});
