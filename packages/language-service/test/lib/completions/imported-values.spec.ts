import { createRange, ProviderRange } from '../../../src/lib/completion-providers';
import { Completion } from '../../../src/lib/completion-types';
import * as asserters from '../../../test-kit/completions-asserters';

describe('Imported Values', () => {
    describe('from path', () => {
        const str1 = 'Comp';
        const str2 = 'shlomo';
        const str3 = '.shlomo';
        const realPath = './import-from-here.st.css';
        const jsPath = '../mixins/js-mixins.js';
        const tsPath = '../mixins/my-mixins.ts';
        const createComp = (str: string, rng: ProviderRange, path: string) =>
            asserters.extendsCompletion(str.slice(1), rng, path);
        const createComp2 = (str: string, rng: ProviderRange, path: string) =>
            asserters.extendsCompletion(str, rng, path);

        [' ' + str1, ' ' + str2].forEach((str, j, a) => {
            str.split('').forEach((_c, i) => {
                const prefix = str.slice(0, i + 1);
                const rng = createRange(7, 17, 7, 17 + i);

                it(
                    'completes default and named imports in -st-extends, with prefix ' +
                        prefix +
                        ' ',
                    async () => {
                        const asserter = await asserters.getCompletions(
                            'imports/st-extends.st.css',
                            prefix
                        );
                        const exp: Array<Partial<Completion>> = [];
                        const notExp: Array<Partial<Completion>> = [];
                        exp.push(createComp(a[j], rng, realPath));
                        if (prefix.length <= 1) {
                            exp.push(createComp(a[1 - j], rng, realPath));
                        } else {
                            notExp.push(createComp(a[1 - j], rng, realPath));
                        }
                        asserter.suggested(exp);
                        asserter.notSuggested(notExp);
                    }
                );

                it(
                    'completes named and default imports in -st-extends with final ; , with prefix ' +
                        prefix +
                        ' ',
                    async () => {
                        const asserter = await asserters.getCompletions(
                            'imports/st-extends-with-semicolon.st.css',
                            prefix
                        );
                        const exp: Array<Partial<Completion>> = [];
                        const notExp: Array<Partial<Completion>> = [];
                        exp.push(createComp(a[j], rng, realPath));
                        if (prefix.length <= 1) {
                            exp.push(createComp(a[1 - j], rng, realPath));
                        } else {
                            notExp.push(createComp(a[1 - j], rng, realPath));
                        }
                        asserter.suggested(exp);
                        asserter.notSuggested(notExp);
                    }
                );
            });
        });

        it('does not complete mixins, formatters, or vars in -st-extends', async () => {
            const oneVar = 'oneVar';
            const twoVar = 'twoVar';
            const mixin = 'paramfulMixin';
            const formatter = 'aFormatter';

            const asserter = await asserters.getCompletions('imports/st-extends-mixins.st.css');
            const notExp: Array<Partial<Completion>> = [];
            notExp.push(createComp2(oneVar, createRange(0, 0, 0, 0), realPath));
            notExp.push(createComp2(twoVar, createRange(0, 0, 0, 0), realPath));
            notExp.push(createComp2(mixin, createRange(0, 0, 0, 0), tsPath));
            notExp.push(createComp2(formatter, createRange(0, 0, 0, 0), jsPath));
            asserter.notSuggested(notExp);
        });

        [str1, str3].forEach((str, j, a) => {
            str.split('').forEach((_c, i) => {
                const createComp = (str: string, rng: ProviderRange) =>
                    asserters.classCompletion(str, rng, true);
                const prefix = str.slice(0, i);

                it(
                    'completes named and default imports as initial selectors, with prefix ' +
                        prefix +
                        ' ',
                    async () => {
                        const rng = createRange(6, 0, 6, i);
                        const asserter = await asserters.getCompletions(
                            'imports/st-extends-selectors.st.css',
                            prefix
                        );
                        const exp: Array<Partial<Completion>> = [];
                        const notExp: Array<Partial<Completion>> = [];
                        exp.push(createComp(a[j], rng));
                        if (prefix.length === 0) {
                            exp.push(createComp(a[1 - j], rng));
                        } else {
                            notExp.push(createComp(a[1 - j], rng));
                        }
                        asserter.suggested(exp);
                        asserter.notSuggested(notExp);
                    }
                );

                it(
                    'completes named and default imports as non-initial selectors, with prefix ' +
                        prefix +
                        ' ',
                    async () => {
                        const rng = createRange(6, 6, 6, 6 + i);
                        const asserter = await asserters.getCompletions(
                            'imports/st-extends-complex-selectors.st.css',
                            prefix
                        );
                        const exp: Array<Partial<Completion>> = [];
                        const notExp: Array<Partial<Completion>> = [];
                        exp.push(createComp(a[j], rng));
                        if (prefix.length === 0) {
                            exp.push(createComp(a[1 - j], rng));
                        } else {
                            notExp.push(createComp(a[1 - j], rng));
                        }
                        asserter.suggested(exp);
                        asserter.notSuggested(notExp);
                    }
                );
            });
        });
    });

    describe('from node_modules package', () => {
        const defaultComp = ' Comp';
        const namedComp = ' part1';
        const realPath = 'fake-stylable-package/stylesheet.st.css';
        const createComp = (str: string, rng: ProviderRange, path: string) =>
            asserters.extendsCompletion(str.slice(1), rng, path);

        [defaultComp, namedComp].forEach((str, j, a) => {
            str.split('').forEach((_c, i) => {
                const prefix = str.slice(0, i + 1);
                const rng = createRange(7, 17, 7, 17 + i);

                it(
                    'completes default and named imports in -st-extends, with prefix ' +
                        prefix +
                        ' ',
                    async () => {
                        const asserter = await asserters.getCompletions(
                            'imports/from-package/st-extends.st.css',
                            prefix
                        );
                        const exp: Array<Partial<Completion>> = [];
                        const notExp: Array<Partial<Completion>> = [];
                        exp.push(createComp(a[j], rng, realPath));
                        if (prefix.length <= 1) {
                            exp.push(createComp(a[1 - j], rng, realPath));
                        } else {
                            notExp.push(createComp(a[1 - j], rng, realPath));
                        }
                        asserter.suggested(exp);
                        asserter.notSuggested(notExp);
                    }
                );
            });
        });
    });
});
