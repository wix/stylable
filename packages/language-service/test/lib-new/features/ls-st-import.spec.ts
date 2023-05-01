import { createDefaultResolver } from '@stylable/core';
import { createTempDirectorySync } from '@stylable/core-test-kit';
import { testLangService } from '../../test-kit/test-lang-service';
import { Command } from 'vscode-languageserver';

const triggerCompletion = Command.create('additional', 'editor.action.triggerSuggest');

describe('LS: st-import', () => {
    let tempDir: ReturnType<typeof createTempDirectorySync>;
    beforeEach('crate temp dir', () => {
        tempDir = createTempDirectorySync('lps-import-test-');
    });
    afterEach('remove temp dir', () => {
        tempDir.remove();
    });
    it('should suggest @st-import at top level', () => {
        // ToDo: refactor code to be handled as part of the st-import feature
        // and use new ls-context instead of TopLevelDirectiveProvider
        const { service, carets, assertCompletions, fs, textEditContext } = testLangService(
            {
                'a.st.css': `
                    ^topLevel^
                `,
                'b.st.css': `
                    /* existing in file */
                    @st-import from "./a.st.css";
                    
                    @st^partial^
                `,
                'c.st.css': `
                    .root {
                        ^nestedInRule^
                    }
                    @media {
                        ^nestedInMedia^
                    }
                    @st-scope .root {
                        ^nestedInStScope^
                    }
                    ^beforeSelector^ .x {}
                `,
            },
            { testOnNativeFileSystem: tempDir.path }
        );
        const aPath = fs.join(tempDir.path, 'a.st.css');
        const bPath = fs.join(tempDir.path, 'b.st.css');
        const cPath = fs.join(tempDir.path, 'c.st.css');
        const aCarets = carets[aPath];
        const bCarets = carets[bPath];
        const cCarets = carets[cPath];
        const { replaceText: bReplaceText } = textEditContext(bPath);

        assertCompletions({
            message: 'top-level',
            actualList: service.onCompletion(aPath, aCarets.topLevel),
            expectedList: [{ label: '@st-import' }],
        });
        assertCompletions({
            message: 'partial',
            actualList: service.onCompletion(bPath, bCarets.partial),
            expectedList: [
                {
                    label: '@st-import',
                    textEdit: bReplaceText(bCarets.partial, `@st-import $2 from "$1";`, {
                        deltaStart: -3,
                    }),
                },
            ],
        });
        assertCompletions({
            message: 'nested-in-rule',
            actualList: service.onCompletion(cPath, cCarets.nestedInRule),
            unexpectedList: [{ label: '@st-import' }],
        });
        // ToDo: remove specific at-rules handling - @st-import should only be top level
        assertCompletions({
            message: 'nested-in-media',
            actualList: service.onCompletion(cPath, cCarets.nestedInMedia),
            unexpectedList: [{ label: '@st-import' }],
        });
        assertCompletions({
            message: 'nested-in-st-scope',
            actualList: service.onCompletion(cPath, cCarets.nestedInStScope),
            unexpectedList: [{ label: '@st-import' }],
        });
        assertCompletions({
            message: 'before-selector',
            actualList: service.onCompletion(cPath, cCarets.beforeSelector),
            unexpectedList: [{ label: '@st-import' }],
        });
    });
    describe('named imports', () => {
        it('should suggest named imports', () => {
            const { service, carets, assertCompletions, fs, textEditContext } = testLangService(
                {
                    'source.st.css': `
                        .classA {}
                        .classB {
                            --propA: 1;
                        }
                        :vars {
                            varA: green;
                            varB: red;
                        }
                        @property --propB;
                        @keyframe jump {}
                        @layer comps {}
                    `,
                    'entry.st.css': `
                        @st-import [classB, --propA, ^topEmpty^] from './source.st.css';
                        @st-import [classB, --pro^partial^] from './source.st.css';
                    `,
                },
                { testOnNativeFileSystem: tempDir.path }
            );
            const entryPath = fs.join(tempDir.path, 'entry.st.css');
            const entryCarets = carets[entryPath];
            const { replaceText } = textEditContext(entryPath);

            assertCompletions({
                message: 'top',
                actualList: service.onCompletion(entryPath, entryCarets.topEmpty),
                expectedList: [
                    { label: 'root' },
                    { label: 'classA' },
                    { label: 'varA' },
                    { label: 'varB' },
                    { label: '--propB' },
                ],
                unexpectedList: [
                    { label: 'classB' },
                    { label: '--propA' },
                    { label: 'jump' },
                    { label: 'comp' },
                ],
            });

            assertCompletions({
                message: 'top',
                actualList: service.onCompletion(entryPath, entryCarets.partial),
                expectedList: [
                    {
                        label: '--propA',
                        textEdit: replaceText(entryCarets.partial, '--propA', { deltaStart: -5 }),
                    },
                    {
                        label: '--propB',
                        textEdit: replaceText(entryCarets.partial, '--propB', { deltaStart: -5 }),
                    },
                ],
                unexpectedList: [
                    { label: 'root' },
                    { label: 'classA' },
                    { label: 'varA' },
                    { label: 'varB' },
                    { label: 'classB' },
                    { label: 'jump' },
                    { label: 'comp' },
                ],
            });
        });
        it('should suggest symbols from native css', () => {
            const { service, carets, assertCompletions, fs } = testLangService(
                {
                    'native.css': `
                        .classA {}
                        .classB {
                            --propA: 1;
                        }
                        :vars {
                            varA: green;
                        }
                        @property --propB;
                    `,
                    'entry.st.css': `
                        @st-import [^top^] from './native.css';
                    `,
                },
                {
                    // ToDo: this part of the completion provider still relays on old code
                    // that cannot run in memory-fs on windows. once the code is refactor this test
                    // should remove the "testOnNativeFileSystem" flag
                    testOnNativeFileSystem: tempDir.path,
                }
            );
            const entryPath = fs.join(tempDir.path, 'entry.st.css');
            const entryCarets = carets[entryPath];

            assertCompletions({
                message: 'top',
                actualList: service.onCompletion(entryPath, entryCarets.top),
                expectedList: [
                    { label: 'classA' },
                    { label: 'classB' },
                    { label: 'varA' },
                    { label: '--propA' },
                    { label: '--propB' },
                ],
            });
        });
    });
    describe('specifier completion', () => {
        it('should suggest relative paths', () => {
            const { service, carets, assertCompletions, fs } = testLangService(
                {
                    'a.st.css': ``,
                    'b.js': ``,
                    src: {
                        'c.st.css': ``,
                        inner: {
                            'd.st.css': ``,
                        },
                        'entry.st.css': `
                            @st-import from '.^justDot^';
                            @st-import from './^sameDir^';
                            @st-import from '../^upDir^';
                            @st-import from '..^upDirNoSlash^';
                            @st-import from './inner/^nestedDir^';
                        `,
                    },
                },
                {
                    testOnNativeFileSystem: tempDir.path,
                }
            );
            const entryPath = fs.join(tempDir.path, 'src', 'entry.st.css');
            const entryCarets = carets[entryPath];

            assertCompletions({
                message: 'same dir',
                actualList: service.onCompletion(entryPath, entryCarets.sameDir),
                expectedList: [
                    { label: 'c.st.css', command: undefined },
                    {
                        label: 'inner/',
                        command: triggerCompletion,
                    },
                ],
                unexpectedList: [{ label: 'entry.st.css' }],
            });

            assertCompletions({
                message: 'up dir',
                actualList: service.onCompletion(entryPath, entryCarets.upDir),
                expectedList: [{ label: 'a.st.css' }, { label: 'b.js' }, { label: 'src/' }],
            });

            assertCompletions({
                message: 'nested dir',
                actualList: service.onCompletion(entryPath, entryCarets.nestedDir),
                expectedList: [{ label: 'd.st.css' }],
            });

            assertCompletions({
                message: 'just dot without slash',
                actualList: service.onCompletion(entryPath, entryCarets.justDot),
                unexpectedList: [
                    { label: '/c.st.css' },
                    { label: '/inner/' },
                    { label: '/entry.st.css' },
                ],
            });

            assertCompletions({
                message: 'up dir without slash',
                actualList: service.onCompletion(entryPath, entryCarets.upDirNoSlash),
                unexpectedList: [
                    { label: '/a.st.css' },
                    { label: '/b.js' },
                    { label: '/c.st.css' },
                    { label: '/inner/' },
                    { label: '/entry.st.css' },
                ],
            });
        });
        it('should suggest from both relative directory and base', () => {
            const { service, carets, assertCompletions, textEditContext, fs } = testLangService(
                {
                    'file.st.css': ``,
                    files: {
                        'a.st.css': ``,
                    },
                    fil: {
                        'b.st.css': ``,
                    },
                    'not-start-with-fil.st.css': ``,
                    'entry.st.css': `
                        @st-import from './fil^^';
                    `,
                },
                {
                    testOnNativeFileSystem: tempDir.path,
                }
            );
            const entryPath = fs.join(tempDir.path, 'entry.st.css');
            const entryCarets = carets[entryPath];
            const { replaceText } = textEditContext(entryPath);

            assertCompletions({
                actualList: service.onCompletion(entryPath, entryCarets[0]),
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
        describe('node_modules', () => {
            it('should suggest picked up node_modules package names', () => {
                const { service, carets, assertCompletions, textEditContext, fs } = testLangService(
                    {
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
                                @st-import from '^empty^';
                                @st-import from 'p^startWithP^';
                                @st-import from '@^startWithAt^';
                            `,
                        },
                    },
                    { testOnNativeFileSystem: tempDir.path }
                );
                const entryPath = fs.join(tempDir.path, 'src/entry.st.css');
                const entryCarets = carets[entryPath];
                const { replaceText } = textEditContext(entryPath);

                assertCompletions({
                    message: 'empty',
                    actualList: service.onCompletion(entryPath, entryCarets.empty),
                    expectedList: [
                        { label: '@scoped-a/pack1' },
                        { label: '@scoped-a/pack2' },
                        { label: '@scoped-a/pack3' },
                        { label: 'package-a' },
                    ],
                });

                assertCompletions({
                    message: 'start with p',
                    actualList: service.onCompletion(entryPath, entryCarets.startWithP),
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
                    actualList: service.onCompletion(entryPath, entryCarets.startWithAt),
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
                const { service, carets, assertCompletions, textEditContext, fs } = testLangService(
                    {
                        node_modules: {
                            '@scoped': {
                                package: {
                                    dist: { 'file.js': `` },
                                    src: { 'file.ts': `` },
                                    'package.json': `{
                                        "main": "./dist/file.js"
                                    }`,
                                },
                            },
                            'flat-package': {
                                esm: { 'file.js': `` },
                                lib: { 'file.ts': `` },
                                'package.json': `{
                                    "main": "./esm/file.js"
                                }`,
                            },
                        },
                        'entry.st.css': `
                            @st-import from '@scoped/package/^scopedRoot^';
                            @st-import from 'flat-package/^flatRoot^';
                            @st-import from '@scoped/package/dist/fi^scopedInternal^';
                            @st-import from 'flat-package/esm/fi^flatInternal^';
                        `,
                    },
                    { testOnNativeFileSystem: tempDir.path }
                );
                const entryPath = fs.join(tempDir.path, 'entry.st.css');
                const entryCarets = carets[entryPath];
                const { replaceText } = textEditContext(entryPath);

                assertCompletions({
                    message: 'scoped root',
                    actualList: service.onCompletion(entryPath, entryCarets.scopedRoot),
                    expectedList: [
                        { label: 'dist/' },
                        { label: 'src/' },
                        { label: 'package.json' },
                    ],
                });

                assertCompletions({
                    message: 'flat root',
                    actualList: service.onCompletion(entryPath, entryCarets.flatRoot),
                    expectedList: [{ label: 'esm/' }, { label: 'lib/' }, { label: 'package.json' }],
                });

                assertCompletions({
                    message: 'scoped internal',
                    actualList: service.onCompletion(entryPath, entryCarets.scopedInternal),
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
                    actualList: service.onCompletion(entryPath, entryCarets.flatInternal),
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
                const { service, carets, assertCompletions, fs } = testLangService(
                    {
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
                                @st-import from 'x/^^';
                            `,
                        },
                    },
                    { testOnNativeFileSystem: tempDir.path }
                );
                const entryPath = fs.join(tempDir.path, 'src', 'entry.st.css');
                const entryCarets = carets[entryPath];

                assertCompletions({
                    message: 'empty',
                    actualList: service.onCompletion(entryPath, entryCarets[0]),
                    expectedList: [{ label: 'green.js' }, { label: 'package.json' }],
                    unexpectedList: [{ label: 'red.js' }],
                });
            });
            it('should suggest package exports', () => {
                const { service, carets, assertCompletions, fs } = testLangService(
                    {
                        node_modules: {
                            x: {
                                'private.js': '',
                                src: {
                                    anyof: {
                                        'c-file.js': '',
                                        'd-file.js': '',
                                        inner: {
                                            'e-file.js': '',
                                        },
                                        internal: {
                                            'x-file.js': '',
                                        },
                                    },
                                },
                                'package.json': `{
                                    "exports": {
                                        "./inner-a": "./src/inner-a.js",
                                        "./inner-b": "./src/inner-b.js",
                                        "./wild/*": "./src/anyof/*",
                                        "./wild/internal/*": null,
                                        "./internal": null,
                                        "./invalid-1/*/*": "./src/anyof/*",
                                        "./invalid-2/*": "./src/anyof/*/*"
                                    }
                                }`,
                            },
                        },
                        'entry.st.css': `
                            @st-import from 'x/^packageRoot^';
                            @st-import from 'x/wild/^wildCardAtEnd^';
                            @st-import from 'x/wild/c^wildCardAtEndPartial^';
                            @st-import from 'x/wild/internal^internal^';
                        `,
                    },
                    { testOnNativeFileSystem: tempDir.path }
                );
                const entryPath = fs.join(tempDir.path, 'entry.st.css');
                const entryCarets = carets[entryPath];

                assertCompletions({
                    message: 'package root',
                    actualList: service.onCompletion(entryPath, entryCarets.packageRoot),
                    expectedList: [{ label: 'inner-a' }, { label: 'inner-b' }, { label: 'wild/' }],
                    unexpectedList: [
                        { label: 'private.js' },
                        { label: 'wild/internal' },
                        { label: 'internal' },
                        { label: 'package.json' },
                        {
                            label: 'invalid-1/',
                        },
                        { label: 'invalid-2/' },
                    ],
                });

                assertCompletions({
                    message: 'wild card at end',
                    actualList: service.onCompletion(entryPath, entryCarets.wildCardAtEnd),
                    expectedList: [
                        { label: 'c-file.js', command: undefined },
                        { label: 'd-file.js', command: undefined },
                        { label: 'inner/', command: triggerCompletion },
                    ],
                    unexpectedList: [
                        // { label: 'internal' }, // ToDo: handle exclude patterns
                        { label: 'inner-a' },
                        { label: 'inner-b' },
                        { label: 'private.js' },
                        { label: 'package.json' },
                    ],
                });

                assertCompletions({
                    message: 'wild card at end with partial file name',
                    actualList: service.onCompletion(entryPath, entryCarets.wildCardAtEndPartial),
                    expectedList: [{ label: 'c-file.js' }],
                    unexpectedList: [
                        { label: 'd-file.js' },
                        { label: 'inner/' },
                        // { label: 'internal' }, // ToDo: handle exclude patterns
                        { label: 'inner-a' },
                        { label: 'inner-b' },
                        { label: 'private.js' },
                        { label: 'package.json' },
                    ],
                });

                assertCompletions({
                    message: 'internal',
                    actualList: service.onCompletion('/entry.st.css', entryCarets.internal),
                    unexpectedList: [{ label: 'x-file.js' }],
                });
            });
            it('should handle conditional exports', () => {
                /**
                 * very naive first find-first-known-conditional (dfs) implementation
                 * will only get hard-coded known conditions:
                 * node, import, require, default, browse
                 */
                const { service, carets, assertCompletions, fs } = testLangService(
                    {
                        node_modules: {
                            topLevelConditions: {
                                'package.json': `{
                                    "exports": {
                                        "unknown": {
                                            "./unknown.js": "./unknown.js"
                                        },
                                        "import": {
                                            "./import.js": "./import.js"
                                        },
                                        "default": {
                                            "./default.js": "./default.js"
                                        }
                                    }
                                }`,
                            },
                            nestedConditions: {
                                node: {
                                    'a.js': '',
                                    'b.js': '',
                                },
                                whatever: {
                                    'x.js': '',
                                },
                                'package.json': `{
                                    "exports": {
                                        "default": {
                                            "require": {
                                                "./give-me/*": {
                                                    "node": "./node/*",
                                                    "default": "./whatever/*"
                                                }
                                            },
                                            "import": {
                                                "./import.js": "./import.js"
                                            }
                                        }
                                    }
                                }`,
                            },
                        },
                        'entry.st.css': `
                            @st-import from 'topLevelConditions/^topLevelConditions^';
                            @st-import from 'nestedConditions/^nestedConditions^';
                            @st-import from 'nestedConditions/give-me/^nestedSubpathConditions^';
                        `,
                    },
                    { testOnNativeFileSystem: tempDir.path }
                );
                const entryPath = fs.join(tempDir.path, 'entry.st.css');
                const entryCarets = carets[entryPath];

                assertCompletions({
                    message: 'known conditions',
                    actualList: service.onCompletion(entryPath, entryCarets.topLevelConditions),
                    expectedList: [{ label: 'import.js' }],
                    unexpectedList: [{ label: 'require.js' }, { label: 'default.js' }],
                });

                assertCompletions({
                    message: 'nested conditions',
                    actualList: service.onCompletion(entryPath, entryCarets.nestedConditions),
                    expectedList: [{ label: 'give-me/' }],
                    unexpectedList: [{ label: 'import.js' }],
                });

                assertCompletions({
                    message: 'nested subpath conditions',
                    actualList: service.onCompletion(
                        entryPath,
                        entryCarets.nestedSubpathConditions
                    ),
                    expectedList: [{ label: 'a.js' }, { label: 'b.js' }],
                    unexpectedList: [{ label: 'x.js' }],
                });
            });
        });
        describe('custom resolve', () => {
            it('should suggest from custom mapped', () => {
                const { service, carets, assertCompletions, fs } = testLangService(
                    {
                        node_modules: {
                            x: {
                                'yellow.js': `{}`,
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
                                @st-import from 'x/^^';
                            `,
                        },
                    },
                    {
                        testOnNativeFileSystem: tempDir.path,
                        stylableConfig: {
                            resolveModule: (contextPath: string, specifier: string) => {
                                if (specifier.startsWith('x/')) {
                                    return (
                                        fs.join(
                                            tempDir.path,
                                            'src/mapped',
                                            ...specifier.split('/')
                                        ) + (specifier.endsWith('/') ? fs.sep : '')
                                    );
                                }
                                return defaultResolveModule(contextPath, specifier);
                            },
                        },
                    }
                );
                const defaultResolveModule = createDefaultResolver(fs, {});
                const entryPath = fs.join(tempDir.path, 'src', 'entry.st.css');
                const entryCarets = carets[entryPath];
                /**
                 * mapping like this cannot override the original resolved package
                 * and combine suggestions from both locations.
                 */
                assertCompletions({
                    actualList: service.onCompletion(entryPath, entryCarets[0]),
                    expectedList: [
                        { label: 'green.js' },
                        { label: 'yellow.js' },
                        { label: 'package.json' },
                    ],
                });
            });
        });
    });
});
