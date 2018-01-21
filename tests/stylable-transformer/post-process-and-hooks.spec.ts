import { expect } from 'chai';
import * as path from 'path';
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
        }, undefined, (resolved, name, isLocal) => {
            return `__VALUE__${valueCallCount++} ${resolved}-${name}-${isLocal}`;
        });

        const res = t.transform(t.fileProcessor.process('/entry.st.css'));
        const rule = res.meta.outputAst!.nodes![0] as postcss.Rule;

        expect((rule.nodes![0] as postcss.Declaration).value).to.equal('__VALUE__0 red-param-true');
        expect((rule.nodes![1] as postcss.Declaration).value).to.equal('__VALUE__1 green-param1-true');

    });

    it('should call replaceValueHook on mixin overrides', () => {
        let index = 0;
        const expectedValueCalls = [
            ['green', 'param1', true, []]
        ];

        const t = createTransformer({
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                        :import {
                            -st-from: "./style.st.css";
                            -st-default: Style
                        }
                        :vars {
                            myColor: red;
                            myBG: green;
                        }
                        .root {
                            -st-mixin: Style(param value(myColor), param1 value(myBG));
                        }
                    `
                },
                '/style.st.css': {
                    namespace: 'style',
                    content: `
                        :import {
                            -st-from: "./style1.st.css";
                            -st-named: x
                        }
                        :vars {
                            param: red;
                            param1: green;
                            param2: "Ariel";
                        }
                        .root {
                            -st-mixin: x(var1 value(param2));
                            color: value(param);
                            background: value(param1);
                            font-family: value(param2);
                        }
                    `
                },
                '/style1.st.css': {
                    namespace: 'style1',
                    content: `
                        :vars {
                            var1: green;
                        }
                        .x {
                            border: 4px solid value(var1);
                        }
                    `
                }
            }
        }, undefined, (resolved, name, isLocal, path) => {
            const m = expected[index];
            expect([resolved, name, isLocal, path], [resolved, name, isLocal, path].join(',')).to.eqls(m);
            index++;
            return (isLocal && path.length === 0) ? `[${name}]` : resolved;
        });

        const expected = [
            ['red', 'myColor', true, []],
            ['green', 'myBG', true, []],
            ['Ariel', 'param2', true, [`default from ${path.resolve('/entry.st.css')}`]],
            ['Ariel', 'param2', true, [`default from ${path.resolve('/entry.st.css')}`]]
        ];

        const res = t.transform(t.fileProcessor.process('/entry.st.css'));

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
                        & .container {
                        }
                        `
                }
            }
        });

        const res = t.transform(t.fileProcessor.process('/entry.st.css'));
        const rule = res.meta.outputAst!.nodes![0] as postcss.Rule;
        expect(rule.selector).to.equal('.entry--root .entry--container');

        const rule1 = res.meta.outputAst!.nodes![1] as postcss.Rule;
        expect(rule1.selector).to.equal('& .entry--container');
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
