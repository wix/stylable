import { expect } from 'chai';
import { createTransformer } from '@stylable/core-test-kit';

describe('post-process', () => {
    it("should call postProcess after transform and use it's return value", () => {
        const t = createTransformer(
            {
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: ``,
                    },
                },
            },
            {
                postProcessor: (res) => {
                    return { ...res, postProcessed: true };
                },
            }
        );

        const res = t.transform(t.fileProcessor.process('/entry.st.css'));

        expect(res).to.contain({ postProcessed: true });
    });
});
