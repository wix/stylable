import { createTransformer } from '@stylable/core-test-kit';
import { expect } from 'chai';
import postcss from 'postcss';

describe('post-process-and-hooks', () => {
    it("should call postProcess after transform and use it's return value", () => {
        const t = createTransformer(
            {
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
            },
            undefined,
            undefined,
            res => {
                return { ...res, postProcessed: true };
            }
        );

        const res = t.transform(t.fileProcessor.process('/entry.st.css'));

        expect(res).to.contain({ postProcessed: true });
    });

    it('should call replaceValueHook on js function', () => {
        const t = createTransformer(
            {
                files: {
                    '/entry.st.css': {
                        namespace: 'entry',
                        content: `
                        :import {
                            -st-from: './function.js';
                            -st-named: fn1, fn2;
                        }
                        .container {
                            color: fn1(fn2(1));
                        }
                        `
                    },
                    '/function.js': {
                        content: `
                        module.exports.fn1 = function(x){return 'fn1'}
                        module.exports.fn2 = function(x){return 'fn2'}
                    `
                    }
                }
            },
            undefined,
            (_resolved, fn) => {
                if (typeof fn !== 'string') {
                    return `hooked_${fn.name}(${fn.args})`;
                }
                return '';
            }
        );

        const res = t.transform(t.fileProcessor.process('/entry.st.css'));
        const rule = res.meta.outputAst!.nodes![0] as postcss.Rule;

        expect((rule.nodes![0] as postcss.Declaration).value).to.equal('hooked_fn1(hooked_fn2(1))');
    });

    it("should call replaceValueHook and use it's return value", () => {
        let valueCallCount = 0;
        const t = createTransformer(
            {
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
            },
            undefined,
            (resolved, name, isLocal) => {
                return `__VALUE__${valueCallCount++} ${resolved}-${name}-${isLocal}`;
            }
        );

        const res = t.transform(t.fileProcessor.process('/entry.st.css'));
        const rule = res.meta.outputAst!.nodes![0] as postcss.Rule;

        expect((rule.nodes![0] as postcss.Declaration).value).to.equal('__VALUE__0 red-param-true');
        expect((rule.nodes![1] as postcss.Declaration).value).to.equal(
            '__VALUE__1 green-param1-true'
        );
    });

    it('should call replaceValueHook on mixin overrides', () => {
        let index = 0;

        const t = createTransformer(
            {
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
            },
            undefined,
            (resolved, name, isLocal, path) => {
                const m = expected[index];
                expect(
                    [resolved, name, isLocal, path],
                    [resolved, name, isLocal, path].join(',')
                ).to.eqls(m);
                index++;
                return isLocal && path.length === 0 ? `[${name}]` : resolved;
            }
        );

        const expected = [
            ['red', 'myColor', true, []],
            ['green', 'myBG', true, []],
            ['Ariel', 'param2', true, [`default from ${'/entry.st.css'}`]],
            ['Ariel', 'param2', true, [`default from ${'/entry.st.css'}`]]
        ];

        t.transform(t.fileProcessor.process('/entry.st.css'));
    });
});
