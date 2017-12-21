import { expect } from 'chai';
import * as postcss from 'postcss';
import { createTransformer } from '../utils/generate-test-util';

describe('post-process-and-hooks', () => {

    it('should call postProcess after transform and use it\'s return value', () => {

        const t = createTransformer({
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                        :vars {
                            param: "red";
                            param1: green;
                        }
                        .container {
                            color: value(param);
                            background: value(param1);
                        }
                        `
                }
            }
        }, undefined, undefined, res => {
            return { ...res, postProcessed: true };
        });

        const res = t.transform(t.fileProcessor.process('/entry.st.css'));

        expect(res).to.contain({ postProcessed: true });

    });

    it('should call replaceValueHook and use it\'s return value', () => {
        let valueCallCount = 0;
        const t = createTransformer({
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                        :vars {
                            param: "red";
                            param1: green;
                        }
                        .container {
                            color: value(param);
                            background: value(param1);
                        }
                        `
                }
            }
        }, undefined, () => {
            return '__VALUE__' + valueCallCount++;
        });

        const res = t.transform(t.fileProcessor.process('/entry.st.css'));
        const rule = res.meta.outputAst!.nodes![0] as postcss.Rule;

        expect((rule.nodes![0] as postcss.Declaration).value).to.equal('__VALUE__0');
        expect((rule.nodes![1] as postcss.Declaration).value).to.equal('__VALUE__1');

    });

    it('should enable/disable root scoping by flag (enable)', () => {
        const t = createTransformer({
            scopeRoot: true,
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                        .container {
                        }
                        `
                }
            }
        });

        const res = t.transform(t.fileProcessor.process('/entry.st.css'));
        const rule = res.meta.outputAst!.nodes![0] as postcss.Rule;

        expect(rule.selector).to.equal('.entry--root .entry--container');
    });

    it('should enable/disable root scoping by flag (disable)', () => {
        const t = createTransformer({
            scopeRoot: false,
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                        .container {
                        }
                        `
                }
            }
        });

        const res = t.transform(t.fileProcessor.process('/entry.st.css'));
        const rule = res.meta.outputAst!.nodes![0] as postcss.Rule;

        expect(rule.selector).to.equal('.entry--container');
    });

});
