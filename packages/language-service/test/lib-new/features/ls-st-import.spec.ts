import { createDefaultResolver } from '@stylable/core';
import { testLangService } from '../../test-kit/test-lang-service';

describe('LS: st-import', () => {
    describe('specifier completion', () => {
        it('should suggest relative paths', () => {
            const { service, carets, assertCompletions } = testLangService({
                'a.st.css': ``,
                'b.js': ``,
                src: {
                    'c.st.css': ``,
                    inner: {
                        'd.st.css': ``,
                    },
                    'entry.st.css': `
                        @st-import from './/*^sameDir*/';
                        @st-import from '..//*^upDir*/';
                        @st-import from './inner//*^nestedDir*/';
                    `,
                },
            });
            const entryCarets = carets['/src/entry.st.css'];

            assertCompletions({
                message: 'same dir',
                actualList: service.onCompletion('/src/entry.st.css', entryCarets.sameDir),
                expectedList: [
                    { label: 'c.st.css' },
                    {
                        label: 'inner/',
                    },
                ],
                unexpectedList: [{ label: 'entry.st.css' }],
            });

            assertCompletions({
                message: 'up dir',
                actualList: service.onCompletion('/src/entry.st.css', entryCarets.upDir),
                expectedList: [{ label: 'a.st.css' }, { label: 'b.js' }, { label: 'src/' }],
            });

            assertCompletions({
                message: 'nested dir',
                actualList: service.onCompletion('/src/entry.st.css', entryCarets.nestedDir),
                expectedList: [{ label: 'd.st.css' }],
            });
        });
        it('should suggest from both relative directory and base', () => {
            const { service, carets, assertCompletions, textEditContext } = testLangService({
                'file.st.css': ``,
                files: {
                    'a.st.css': ``,
                },
                fil: {
                    'b.st.css': ``,
                },
                'not-start-with-fil.st.css': ``,
                'entry.st.css': `
                    @st-import from './fil/*^*/';
                `,
            });
            const entryCarets = carets['/entry.st.css'];
            const { replaceText } = textEditContext('/entry.st.css');

            assertCompletions({
                actualList: service.onCompletion('/entry.st.css', entryCarets[0]),
                expectedList: [
                    {
                        label: 'file.st.css',
                        textEdit: replaceText(entryCarets[0], 'file.st.css', { deltaStart: -3 }),
                    },
                    {
                        label: 'files/',
                        textEdit: replaceText(entryCarets[0], 'files/', { deltaStart: -3 }),
                    },
                    {
                        label: 'fil/',
                        textEdit: replaceText(entryCarets[0], 'fil/', { deltaStart: -3 }),
                    },
                    { label: '/b.st.css' },
                ],
                unexpectedList: [{ label: 'entry.st.css' }, { label: 'not-start-with-fil.st.css' }],
            });
        });
        // ToDo: support project root path
        describe('node_modules', () => {
            it('should suggest picked up node_modules package names', () => {
                const { service, carets, assertCompletions, textEditContext } = testLangService({
                    node_modules: {
                        '@scoped-a': {
                            pack1: {},
                            pack2: {},
                        },
                        'package-a': {},
                    },
                    src: {
                        node_modules: {
                            '@scoped-a': {
                                pack3: {},
                            },
                        },
                        'entry.st.css': `
                            @st-import from '/*^empty*/';
                            @st-import from 'p/*^startWithP*/';
                            @st-import from '@/*^startWithAt*/';
                        `,
                    },
                });
                const entryCarets = carets['/src/entry.st.css'];
                const { replaceText } = textEditContext('/src/entry.st.css');

                assertCompletions({
                    message: 'empty',
                    actualList: service.onCompletion('/src/entry.st.css', entryCarets.empty),
                    expectedList: [
                        { label: '@scoped-a/pack1' },
                        { label: '@scoped-a/pack2' },
                        { label: '@scoped-a/pack3' },
                        { label: 'package-a' },
                    ],
                });

                assertCompletions({
                    message: 'start with p',
                    actualList: service.onCompletion('/src/entry.st.css', entryCarets.startWithP),
                    expectedList: [
                        {
                            label: 'package-a',
                            textEdit: replaceText(entryCarets.startWithP, 'package-a', {
                                deltaStart: -1,
                            }),
                        },
                    ],
                    unexpectedList: [
                        { label: '@scoped-a/pack1' },
                        { label: '@scoped-a/pack2' },
                        { label: '@scoped-a/pack3' },
                    ],
                });

                assertCompletions({
                    message: 'start with @',
                    actualList: service.onCompletion('/src/entry.st.css', entryCarets.startWithAt),
                    expectedList: [
                        {
                            label: '@scoped-a/pack1',
                            textEdit: replaceText(entryCarets.startWithAt, '@scoped-a/pack1', {
                                deltaStart: -1,
                            }),
                        },
                        {
                            label: '@scoped-a/pack2',
                            textEdit: replaceText(entryCarets.startWithAt, '@scoped-a/pack2', {
                                deltaStart: -1,
                            }),
                        },
                        {
                            label: '@scoped-a/pack3',
                            textEdit: replaceText(entryCarets.startWithAt, '@scoped-a/pack3', {
                                deltaStart: -1,
                            }),
                        },
                    ],
                    unexpectedList: [{ label: 'package-a' }],
                });
            });
            it('should suggest package relative content (no exports field)', () => {
                const { service, carets, assertCompletions, textEditContext } = testLangService({
                    node_modules: {
                        '@scoped': {
                            package: {
                                dist: { 'file.js': `` },
                                src: { 'file.ts': `` },
                                'package.json': `{}`,
                            },
                        },
                        'flat-package': {
                            esm: { 'file.js': `` },
                            lib: { 'file.ts': `` },
                            'package.json': `{}`,
                        },
                    },
                    'entry.st.css': `
                        @st-import from '@scoped/package//*^scopedRoot*/';
                        @st-import from 'flat-package//*^flatRoot*/';
                        @st-import from '@scoped/package/dist/fi/*^scopedInternal*/';
                        @st-import from 'flat-package/esm/fi/*^flatInternal*/';
                    `,
                });
                const entryCarets = carets['/entry.st.css'];
                const { replaceText } = textEditContext('/entry.st.css');

                assertCompletions({
                    message: 'scoped root',
                    actualList: service.onCompletion('/entry.st.css', entryCarets.scopedRoot),
                    expectedList: [
                        { label: 'dist/' },
                        { label: 'src/' },
                        { label: 'package.json' },
                    ],
                });

                assertCompletions({
                    message: 'flat root',
                    actualList: service.onCompletion('/entry.st.css', entryCarets.flatRoot),
                    expectedList: [{ label: 'esm/' }, { label: 'lib/' }, { label: 'package.json' }],
                });

                assertCompletions({
                    message: 'scoped internal',
                    actualList: service.onCompletion('/entry.st.css', entryCarets.scopedInternal),
                    expectedList: [
                        {
                            label: 'file.js',
                            textEdit: replaceText(entryCarets.scopedInternal, 'file.js', {
                                deltaStart: -2,
                            }),
                        },
                    ],
                });

                assertCompletions({
                    message: 'flat internal',
                    actualList: service.onCompletion('/entry.st.css', entryCarets.flatInternal),
                    expectedList: [
                        {
                            label: 'file.js',
                            textEdit: replaceText(entryCarets.flatInternal, 'file.js', {
                                deltaStart: -2,
                            }),
                        },
                    ],
                });
            });
            it('should suggest closer resolved package', () => {
                const { service, carets, assertCompletions } = testLangService({
                    node_modules: {
                        x: {
                            'red.js': `{}`,
                            'package.json': `{}`,
                        },
                    },
                    src: {
                        node_modules: {
                            x: {
                                'green.js': `{}`,
                                'package.json': `{}`,
                            },
                        },
                        'entry.st.css': `
                            @st-import from 'x//*^*/';
                        `,
                    },
                });
                const entryCarets = carets['/src/entry.st.css'];

                assertCompletions({
                    message: 'empty',
                    actualList: service.onCompletion('/src/entry.st.css', entryCarets[0]),
                    expectedList: [{ label: 'green.js' }, { label: 'package.json' }],
                    unexpectedList: [{ label: 'red.js' }],
                });
            });
            it('should suggest package exports', () => {
                const { service, carets, assertCompletions } = testLangService({
                    node_modules: {
                        x: {
                            'private.js': '',
                            'package.json': `{
                                "exports": {
                                    "./inner-a": "./src/inner-a.js",
                                    "./inner-b": "./src/inner-b.js"
                                }
                            }`,
                        },
                    },
                    'entry.st.css': `
                        @st-import from 'x//*^*/';
                    `,
                });
                const entryCarets = carets['/entry.st.css'];

                assertCompletions({
                    message: 'scoped root',
                    actualList: service.onCompletion('/entry.st.css', entryCarets[0]),
                    expectedList: [{ label: 'inner-a' }, { label: 'inner-b' }],
                    unexpectedList: [{ label: 'private.js' }, { label: 'package.json' }],
                });
            });
        });
        describe('custom resolve', () => {
            it('should suggest from custom mapped', () => {
                const { service, carets, assertCompletions, fs } = testLangService(
                    {
                        node_modules: {
                            x: {
                                'red.js': `{}`,
                                'package.json': `{}`,
                            },
                        },
                        src: {
                            mapped: {
                                x: {
                                    'green.js': `{}`,
                                    'package.json': `{}`,
                                },
                            },
                            'entry.st.css': `
                                @st-import from 'x//*^*/';
                            `,
                        },
                    },
                    {
                        stylableConfig: {
                            resolveModule: (contextPath: string, specifier: string) => {
                                if (specifier.startsWith('x/')) {
                                    return specifier.replace('x/', '/src/mapped/x/');
                                }
                                return defaultResolveModule(contextPath, specifier);
                            },
                        },
                    }
                );
                const defaultResolveModule = createDefaultResolver(fs, {});
                const entryCarets = carets['/src/entry.st.css'];

                assertCompletions({
                    actualList: service.onCompletion('/src/entry.st.css', entryCarets[0]),
                    expectedList: [{ label: 'green.js' }, { label: 'package.json' }],
                    unexpectedList: [{ label: 'red.js' }],
                });
            });
        });
    });
});
