import { createDefaultResolver } from '@stylable/core';
import { createTempDirectorySync } from '@stylable/core-test-kit';
import { testLangService } from '../../test-kit/test-lang-service';
import { stImportNamedCompletion } from '@stylable/language-service/dist/lib/completion-types';
import { Command } from 'vscode-languageserver';
import { parseCssSelector } from '@tokey/css-selector-parser';

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
        const { service, assertCompletions, fs } = testLangService(
            {
                'a.st.css': `
                    ^topLevel^
                `,
                'b.st.css': `
                    /* existing in file */
                    @st-import "./a.st.css";
                    
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

        assertCompletions(aPath, ({ filePath, carets }) => ({
            message: 'top-level',
            actualList: service.onCompletion(filePath, carets.topLevel),
            expectedList: [{ label: '@st-import' }],
        }));
        assertCompletions(bPath, ({ filePath, carets, textEdit: { replaceText } }) => ({
            message: 'partial',
            actualList: service.onCompletion(filePath, carets.partial),
            expectedList: [
                {
                    label: '@st-import',
                    textEdit: replaceText(carets.partial, `@st-import $2 from "$1";`, {
                        deltaStart: -3,
                    }),
                },
            ],
        }));
        assertCompletions(cPath, ({ filePath, carets }) => ({
            message: 'nested-in-rule',
            actualList: service.onCompletion(filePath, carets.nestedInRule),
            unexpectedList: [{ label: '@st-import' }],
        }));
        // ToDo: remove specific at-rules handling - @st-import should only be top level
        assertCompletions(cPath, ({ filePath, carets }) => ({
            message: 'nested-in-media',
            actualList: service.onCompletion(filePath, carets.nestedInMedia),
            unexpectedList: [{ label: '@st-import' }],
        }));
        assertCompletions(cPath, ({ filePath, carets }) => ({
            message: 'nested-in-st-scope',
            actualList: service.onCompletion(filePath, carets.nestedInStScope),
            unexpectedList: [{ label: '@st-import' }],
        }));
        assertCompletions(cPath, ({ filePath, carets }) => ({
            message: 'before-selector',
            actualList: service.onCompletion(filePath, carets.beforeSelector),
            unexpectedList: [{ label: '@st-import' }],
        }));
    });
    it('should not suggest native css or selectors', () => {
        const { service, assertCompletions, fs } = testLangService(
            {
                'other.st.css': ``,
                'entry.st.css': `
                    @st-import ^default^ from '.^specifierEmpty^';
                    @st-import [^named^, keyframes(^namedTyped^)] from '.^specifierWithDot^';
                    
                    .xxx {}
                `,
            },
            { testOnNativeFileSystem: tempDir.path }
        );

        const entryPath = fs.join(tempDir.path, 'entry.st.css');

        const unexpectedList = [
            { label: '.xxx' },
            { label: 'input' },
            { label: '@media' },
            { label: ':global()' },
        ];
        assertCompletions(entryPath, ({ filePath, carets }) => ({
            message: 'specifierEmpty',
            actualList: service.onCompletion(filePath, carets.specifierEmpty),
            unexpectedList,
        }));
        assertCompletions(entryPath, ({ filePath, carets }) => ({
            message: 'specifierWithDot',
            actualList: service.onCompletion(filePath, carets.specifierWithDot),
            unexpectedList,
        }));
        assertCompletions(entryPath, ({ filePath, carets }) => ({
            message: 'default',
            actualList: service.onCompletion(filePath, carets.default),
            unexpectedList,
        }));
        assertCompletions(entryPath, ({ filePath, carets }) => ({
            message: 'named',
            actualList: service.onCompletion(filePath, carets.named),
            unexpectedList,
        }));
        assertCompletions(entryPath, ({ filePath, carets }) => ({
            message: 'namedTyped',
            actualList: service.onCompletion(filePath, carets.namedTyped),
            unexpectedList,
        }));
    });
    describe('named imports', () => {
        it('should suggest named imports', () => {
            const { service, assertCompletions, fs } = testLangService(
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
                        @keyframes jump {}
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

            assertCompletions(entryPath, ({ filePath, carets }) => ({
                message: 'top',
                actualList: service.onCompletion(filePath, carets.topEmpty),
                expectedList: [
                    {
                        label: 'root',
                        detail: stImportNamedCompletion.detail({
                            relativePath: './source.st.css',
                            symbol: { _kind: 'class', name: 'root' },
                        }),
                    },
                    {
                        label: 'classA',
                        detail: stImportNamedCompletion.detail({
                            relativePath: './source.st.css',
                            symbol: { _kind: 'class', name: 'classA' },
                        }),
                    },
                    {
                        label: 'varA',
                        detail: stImportNamedCompletion.detail({
                            relativePath: './source.st.css',
                            symbol: { _kind: 'var', name: 'varA', text: 'green' },
                        }),
                    },
                    {
                        label: 'varB',
                        detail: stImportNamedCompletion.detail({
                            relativePath: './source.st.css',
                            symbol: { _kind: 'var', name: 'varB', text: 'red' },
                        }),
                    },
                    {
                        label: '--propB',
                        detail: stImportNamedCompletion.detail({
                            relativePath: './source.st.css',
                            symbol: { _kind: 'cssVar', name: '--propB' },
                        }),
                    },
                ],
                unexpectedList: [
                    { label: 'classB' },
                    { label: '--propA' },
                    { label: 'jump' },
                    { label: 'comp' },
                ],
            }));

            assertCompletions(entryPath, ({ filePath, carets, textEdit: { replaceText } }) => ({
                message: 'partial',
                actualList: service.onCompletion(filePath, carets.partial),
                expectedList: [
                    {
                        label: '--propA',
                        textEdit: replaceText(carets.partial, '--propA', { deltaStart: -5 }),
                    },
                    {
                        label: '--propB',
                        textEdit: replaceText(carets.partial, '--propB', { deltaStart: -5 }),
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
            }));
        });
        it('should suggest typed named imports', () => {
            const { service, assertCompletions, fs, completion } = testLangService(
                {
                    'source.st.css': `
                        .aClass {
                            --aProp: 1;
                            container-name: aContainer;
                        }
                        @container bContainer;
                        :vars {
                            aBuildVar: red;
                        }
                        @keyframes aKeyframes {}
                        @keyframes bKeyframes {}
                        @layer aLayer {}
                        @layer bLayer {}
                    `,
                    'entry.st.css': `
                        @st-import [
                            keyframes(^keyframesEmpty^)
                            layer(^layerEmpty^)
                            container(^containerEmpty^)
                        ] from './source.st.css';
                        @st-import [
                            keyframes(a^keyframesPartial^)
                            layer(a^layerPartial^)
                            container(a^containerPartial^)
                        ] from './source.st.css';
                    `,
                },
                { testOnNativeFileSystem: tempDir.path }
            );
            const entryPath = fs.join(tempDir.path, 'entry.st.css');

            const capitalize = (value: string) => value[0].toUpperCase() + value.slice(1);
            const supportedTypes = ['keyframes', 'layer', 'container'] as const;
            const allTypes = ['class', 'prop', 'buildVar', ...supportedTypes] as const;
            for (const type of supportedTypes) {
                const capitalizedType = capitalize(type);
                assertCompletions(entryPath, ({ filePath, carets }) => ({
                    message: `empty ${type}`,
                    actualList: service.onCompletion(filePath, carets[type + 'Empty']),
                    expectedList: [
                        // a&b param from type
                        ...completion(['a' + capitalizedType, 'b' + capitalizedType], (name) => ({
                            label: name,
                            detail: stImportNamedCompletion.detail({
                                relativePath: './source.st.css',
                                symbol: { _kind: type, name },
                            }),
                        })),
                    ],
                    unexpectedList: [
                        // list of a&b params from all other types
                        ...completion(
                            allTypes
                                .filter((typeName) => typeName !== type)
                                .reduce((acc, paramType) => {
                                    acc.push('a' + capitalize(paramType));
                                    acc.push('b' + capitalize(paramType));
                                    return acc;
                                }, [] as string[]),
                            (name) => ({
                                label: name,
                            })
                        ),
                    ],
                }));
                assertCompletions(entryPath, ({ filePath, carets, textEdit: { replaceText } }) => ({
                    message: `partial ${type}`,
                    actualList: service.onCompletion(filePath, carets[type + 'Partial']),
                    expectedList: [
                        // a param from type (without b)
                        {
                            label: 'a' + capitalizedType,
                            textEdit: replaceText(carets[type + 'Partial'], 'a' + capitalizedType, {
                                deltaStart: -1,
                            }),
                            detail: stImportNamedCompletion.detail({
                                relativePath: './source.st.css',
                                symbol: { _kind: type, name: 'a' + capitalizedType },
                            }),
                        },
                    ],
                    unexpectedList: [
                        // list of a&b params from all other types + b from current type
                        { label: 'b' + capitalizedType },
                        ...completion(
                            allTypes
                                .filter((typeName) => typeName !== type)
                                .reduce((acc, paramType) => {
                                    acc.push('a' + capitalize(paramType));
                                    acc.push('b' + capitalize(paramType));
                                    return acc;
                                }, [] as string[]),
                            (name) => ({
                                label: name,
                            })
                        ),
                    ],
                }));
            }
        });
        it('should suggest typed import asserters', () => {
            const { service, assertCompletions, fs, completion } = testLangService(
                {
                    'source.st.css': ``,
                    'code.js': ``,
                    'entry.st.css': `
                        @st-import [
                            ^topLevelEmpty^
                        ] from './source.st.css';
                        @st-import [
                            lay^topPartial^
                        ] from './source.st.css';
                        @st-import [
                            keyframes(),
                            ^topWithExisting^
                            layer(),
                        ] from './source.st.css';
                        @st-import [
                            keyframes(^notTop^)
                        ] from './source.st.css';
                        @st-import [
                            keyframes(^onlyInCSS^)
                        ] from './code.js';
                    `,
                },
                { testOnNativeFileSystem: tempDir.path }
            );
            const entryPath = fs.join(tempDir.path, 'entry.st.css');

            const supportedTypes = ['keyframes', 'layer', 'container'] as const;
            assertCompletions(entryPath, ({ filePath, carets }) => ({
                message: `all`,
                actualList: service.onCompletion(filePath, carets['topLevelEmpty']),
                expectedList: [
                    ...completion([...supportedTypes], (type) => ({
                        label: type + '()',
                        detail: stImportNamedCompletion.typeAssertCallDetail(type),
                    })),
                ],
            }));
            assertCompletions(entryPath, ({ filePath, carets, textEdit: { replaceText } }) => ({
                message: `partial`,
                actualList: service.onCompletion(filePath, carets['topPartial']),
                expectedList: [
                    // partial "lay" - only layer()
                    {
                        label: 'layer()',
                        textEdit: replaceText(carets['topPartial'], 'layer($1)', {
                            deltaStart: -3,
                        }),
                        detail: stImportNamedCompletion.typeAssertCallDetail('layer'),
                        command: triggerCompletion,
                    },
                ],
                unexpectedList: [
                    // all except layer
                    ...completion(
                        [...supportedTypes.filter((type) => type !== 'layer')],
                        (type) => ({ label: type + '()' })
                    ),
                ],
            }));
            assertCompletions(entryPath, ({ filePath, carets, textEdit: { replaceText } }) => ({
                message: `with existing`,
                actualList: service.onCompletion(filePath, carets['topWithExisting']),
                expectedList: [
                    //  keyframes&layer already exist - only container
                    {
                        label: 'container()',
                        textEdit: replaceText(carets['topWithExisting'], 'container($1)'),
                        detail: stImportNamedCompletion.typeAssertCallDetail('container'),
                        command: triggerCompletion,
                    },
                ],
                unexpectedList: [
                    // all except container
                    ...completion(
                        [...supportedTypes.filter((type) => type !== 'container')],
                        (type) => ({ label: type + '()' })
                    ),
                ],
            }));
            assertCompletions(entryPath, ({ filePath, carets }) => ({
                message: `only at top of params`,
                actualList: service.onCompletion(filePath, carets['notTop']),
                unexpectedList: [
                    // all
                    ...completion([...supportedTypes], (type) => ({ label: type + '()' })),
                ],
            }));
            assertCompletions(entryPath, ({ filePath, carets }) => ({
                message: `only in CSS`,
                actualList: service.onCompletion(filePath, carets['onlyInCSS']),
                unexpectedList: [
                    // all
                    ...completion([...supportedTypes], (type) => ({ label: type + '()' })),
                ],
            }));
        });
        it('should suggest re-exports', () => {
            const { service, assertCompletions, fs } = testLangService(
                {
                    'origin.st.css': `
                        .originClassA {
                            --propA: 1;
                        }
                        :vars {
                            varA: green;
                        }
                        @property --propB;
                        @keyframes jump {}
                        @layer comps {}
                    `,
                    'extend.st.css': `
                        @st-import [originClassA, varA, --propA, --propB, keyframes(jump), layer(comps)] from './origin.st.css';
                        .classA {
                            -st-extends: originClassA;
                        }
                    `,
                    'proxy.st.css': `
                        @st-import [
                            classA as proxyClassA, 
                            varA as proxyVarA, 
                            --propA as --proxyPropA,
                            --propB as --proxyPropB,
                            keyframes(
                                jump as proxyJump
                            ), 
                            layer(
                                comps as  proxyComps
                            )
                        ] from './extend.st.css';
                    `,
                    'entry.st.css': `
                        @st-import [^topEmpty^] from './proxy.st.css';
                    `,
                },
                { testOnNativeFileSystem: tempDir.path }
            );
            const entryPath = fs.join(tempDir.path, 'entry.st.css');

            assertCompletions(entryPath, ({ filePath, carets }) => ({
                message: 'top',
                actualList: service.onCompletion(filePath, carets.topEmpty),
                expectedList: [
                    {
                        label: 'root',
                        detail: stImportNamedCompletion.detail({
                            relativePath: './proxy.st.css',
                            symbol: { _kind: 'class', name: 'root' },
                        }),
                    },
                    {
                        label: 'proxyClassA',
                        detail: stImportNamedCompletion.detail({
                            relativePath: './extend.st.css',
                            symbol: { _kind: 'class', name: 'classA' },
                        }),
                    },
                    {
                        label: 'proxyVarA',
                        detail: stImportNamedCompletion.detail({
                            relativePath: './origin.st.css',
                            symbol: { _kind: 'var', name: 'varA', text: 'green' },
                        }),
                    },
                    {
                        label: '--proxyPropA',
                        detail: stImportNamedCompletion.detail({
                            relativePath: './origin.st.css',
                            symbol: { _kind: 'cssVar', name: '--propA' },
                        }),
                    },
                    {
                        label: '--proxyPropB',
                        detail: stImportNamedCompletion.detail({
                            relativePath: './origin.st.css',
                            symbol: { _kind: 'cssVar', name: '--propB' },
                        }),
                    },
                ],
                unexpectedList: [{ label: 'proxyJump' }, { label: 'proxyComp' }],
            }));
        });
        it('should show global information as part of detail', () => {
            const { service, assertCompletions, fs } = testLangService(
                {
                    'source.st.css': `
                        .classA {
                            -st-global: '.globalA';
                        }
                        @property st-global(--propA);
                        @keyframes st-global(jump) {}
                        @layer st-global(comps) {}
                        @container st-global(box);
                    `,
                    'entry.st.css': `
                        @st-import [
                            ^top^, keyframes(^keyframes^), layer(^layer^), container(^container^)
                        ] from './source.st.css';
                    `,
                },
                { testOnNativeFileSystem: tempDir.path }
            );
            const entryPath = fs.join(tempDir.path, 'entry.st.css');

            assertCompletions(entryPath, ({ filePath, carets }) => ({
                message: 'top',
                actualList: service.onCompletion(filePath, carets.top),
                expectedList: [
                    {
                        label: 'classA',
                        detail: stImportNamedCompletion.detail({
                            relativePath: './source.st.css',
                            symbol: {
                                _kind: 'class',
                                name: 'classA',
                                '-st-global': parseCssSelector('.globalA'),
                            },
                        }),
                    },
                    {
                        label: '--propA',
                        detail: stImportNamedCompletion.detail({
                            relativePath: './source.st.css',
                            symbol: { _kind: 'cssVar', name: '--propA', global: true },
                        }),
                    },
                ],
            }));
            assertCompletions(entryPath, ({ filePath, carets }) => ({
                message: 'keyframes',
                actualList: service.onCompletion(filePath, carets.keyframes),
                expectedList: [
                    {
                        label: 'jump',
                        detail: stImportNamedCompletion.detail({
                            relativePath: './source.st.css',
                            symbol: { _kind: 'keyframes', name: 'jump', global: true },
                        }),
                    },
                ],
            }));
            assertCompletions(entryPath, ({ filePath, carets }) => ({
                message: 'layer',
                actualList: service.onCompletion(filePath, carets.layer),
                expectedList: [
                    {
                        label: 'comps',
                        detail: stImportNamedCompletion.detail({
                            relativePath: './source.st.css',
                            symbol: { _kind: 'layer', name: 'comps', global: true },
                        }),
                    },
                ],
            }));
            assertCompletions(entryPath, ({ filePath, carets }) => ({
                message: 'container',
                actualList: service.onCompletion(filePath, carets.container),
                expectedList: [
                    {
                        label: 'box',
                        detail: stImportNamedCompletion.detail({
                            relativePath: './source.st.css',
                            symbol: { _kind: 'container', name: 'box', global: true },
                        }),
                    },
                ],
            }));
        });
        it('should suggest symbols from native css', () => {
            const { service, assertCompletions, fs } = testLangService(
                {
                    'native.css': `
                        .classA {}
                        .classB {
                            --propA: 1;
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

            assertCompletions(entryPath, ({ filePath, carets }) => ({
                message: 'top',
                actualList: service.onCompletion(filePath, carets.top),
                expectedList: [
                    {
                        label: 'classA',
                        detail: stImportNamedCompletion.detail({
                            relativePath: './native.css',
                            symbol: {
                                _kind: 'class',
                                name: 'classA',
                                '-st-global': parseCssSelector('.classA'),
                            },
                        }),
                    },
                    {
                        label: 'classB',
                        detail: stImportNamedCompletion.detail({
                            relativePath: './native.css',
                            symbol: {
                                _kind: 'class',
                                name: 'classB',
                                '-st-global': parseCssSelector('.classB'),
                            },
                        }),
                    },
                    {
                        label: '--propA',
                        detail: stImportNamedCompletion.detail({
                            relativePath: './native.css',
                            symbol: { _kind: 'cssVar', name: '--propA', global: true },
                        }),
                    },
                ],
            }));
        });
        it('should suggest symbols from js', () => {
            const { service, assertCompletions, fs } = testLangService(
                {
                    'code.js': `
                        exports.mixinA = function mixinA(){}
                        exports.mixinB = function mixinB(){}
                        exports.formatterA = function formatterA(){}
                        exports.strA = "abc";
                        exports.numA = 123;
                        exports.boolA = true;
                    `,
                    'entry.st.css': `
                        @st-import [^top^] from './code.js';
                        @st-import [mix^partial^] from './code.js';
                    `,
                },
                { testOnNativeFileSystem: tempDir.path }
            );
            const entryPath = fs.join(tempDir.path, 'entry.st.css');

            assertCompletions(entryPath, ({ filePath, carets }) => ({
                message: 'top',
                actualList: service.onCompletion(filePath, carets.top),
                expectedList: [
                    {
                        label: 'mixinA',
                        detail: stImportNamedCompletion.detail({
                            relativePath: './code.js',
                            jsValue: function mixinA() {
                                /**/
                            },
                        }),
                    },
                    {
                        label: 'mixinB',
                        detail: stImportNamedCompletion.detail({
                            relativePath: './code.js',
                            jsValue: function mixinB() {
                                /**/
                            },
                        }),
                    },
                    {
                        label: 'formatterA',
                        detail: stImportNamedCompletion.detail({
                            relativePath: './code.js',
                            jsValue: function formatterA() {
                                /**/
                            },
                        }),
                    },
                    {
                        label: 'strA',
                        detail: stImportNamedCompletion.detail({
                            relativePath: './code.js',
                            jsValue: 'abc',
                        }),
                    },
                    {
                        label: 'numA',
                        detail: stImportNamedCompletion.detail({
                            relativePath: './code.js',
                            jsValue: 123,
                        }),
                    },
                    {
                        label: 'boolA',
                        detail: stImportNamedCompletion.detail({
                            relativePath: './code.js',
                            jsValue: true,
                        }),
                    },
                ],
            }));

            assertCompletions(entryPath, ({ filePath, carets, textEdit: { replaceText } }) => ({
                message: 'partial',
                actualList: service.onCompletion(filePath, carets.partial),
                expectedList: [
                    {
                        label: 'mixinA',
                        detail: stImportNamedCompletion.detail({
                            relativePath: './code.js',
                            jsValue: function mixinA() {
                                /**/
                            },
                        }),
                        textEdit: replaceText(carets.partial, 'mixinA', { deltaStart: -3 }),
                    },
                    {
                        label: 'mixinB',
                        detail: stImportNamedCompletion.detail({
                            relativePath: './code.js',
                            jsValue: function mixinB() {
                                /**/
                            },
                        }),
                        textEdit: replaceText(carets.partial, 'mixinB', { deltaStart: -3 }),
                    },
                ],
                unexpectedList: [{ label: 'formatterA' }, { label: 'strA' }, { label: 'boolA' }],
            }));
        });
    });
    describe('specifier completion', () => {
        it('should suggest relative paths', () => {
            const { service, assertCompletions, fs } = testLangService(
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

            assertCompletions(entryPath, ({ filePath, carets }) => ({
                message: 'same dir',
                actualList: service.onCompletion(filePath, carets.sameDir),
                expectedList: [
                    { label: 'c.st.css', command: undefined },
                    {
                        label: 'inner/',
                        command: triggerCompletion,
                    },
                ],
                unexpectedList: [{ label: 'entry.st.css' }],
            }));

            assertCompletions(entryPath, ({ filePath, carets }) => ({
                message: 'up dir',
                actualList: service.onCompletion(filePath, carets.upDir),
                expectedList: [{ label: 'a.st.css' }, { label: 'b.js' }, { label: 'src/' }],
            }));

            assertCompletions(entryPath, ({ filePath, carets }) => ({
                message: 'nested dir',
                actualList: service.onCompletion(filePath, carets.nestedDir),
                expectedList: [{ label: 'd.st.css' }],
            }));

            assertCompletions(entryPath, ({ filePath, carets }) => ({
                message: 'just dot without slash',
                actualList: service.onCompletion(filePath, carets.justDot),
                unexpectedList: [
                    { label: '/c.st.css' },
                    { label: '/inner/' },
                    { label: '/entry.st.css' },
                ],
            }));

            assertCompletions(entryPath, ({ filePath, carets }) => ({
                message: 'up dir without slash',
                actualList: service.onCompletion(filePath, carets.upDirNoSlash),
                unexpectedList: [
                    { label: '/a.st.css' },
                    { label: '/b.js' },
                    { label: '/c.st.css' },
                    { label: '/inner/' },
                    { label: '/entry.st.css' },
                ],
            }));
        });
        it('should suggest from both relative directory and base', () => {
            const { service, assertCompletions, fs } = testLangService(
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

            assertCompletions(entryPath, ({ filePath, carets, textEdit: { replaceText } }) => ({
                actualList: service.onCompletion(filePath, carets[0]),
                expectedList: [
                    {
                        label: 'file.st.css',
                        textEdit: replaceText(carets[0], 'file.st.css', { deltaStart: -3 }),
                    },
                    {
                        label: 'files/',
                        textEdit: replaceText(carets[0], 'files/', { deltaStart: -3 }),
                    },
                    {
                        label: 'fil/',
                        textEdit: replaceText(carets[0], 'fil/', { deltaStart: -3 }),
                    },
                    { label: '/b.st.css' },
                ],
                unexpectedList: [{ label: 'entry.st.css' }, { label: 'not-start-with-fil.st.css' }],
            }));
        });
        describe('node_modules', () => {
            it('should suggest picked up node_modules package names', () => {
                const { service, assertCompletions, fs } = testLangService(
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

                assertCompletions(entryPath, ({ filePath, carets }) => ({
                    message: 'empty',
                    actualList: service.onCompletion(filePath, carets.empty),
                    expectedList: [
                        { label: '@scoped-a/pack1' },
                        { label: '@scoped-a/pack2' },
                        { label: '@scoped-a/pack3' },
                        { label: 'package-a' },
                    ],
                }));

                assertCompletions(entryPath, ({ filePath, carets, textEdit: { replaceText } }) => ({
                    message: 'start with p',
                    actualList: service.onCompletion(filePath, carets.startWithP),
                    expectedList: [
                        {
                            label: 'package-a',
                            textEdit: replaceText(carets.startWithP, 'package-a', {
                                deltaStart: -1,
                            }),
                        },
                    ],
                    unexpectedList: [
                        { label: '@scoped-a/pack1' },
                        { label: '@scoped-a/pack2' },
                        { label: '@scoped-a/pack3' },
                    ],
                }));

                assertCompletions(entryPath, ({ filePath, carets, textEdit: { replaceText } }) => ({
                    message: 'start with @',
                    actualList: service.onCompletion(filePath, carets.startWithAt),
                    expectedList: [
                        {
                            label: '@scoped-a/pack1',
                            textEdit: replaceText(carets.startWithAt, '@scoped-a/pack1', {
                                deltaStart: -1,
                            }),
                        },
                        {
                            label: '@scoped-a/pack2',
                            textEdit: replaceText(carets.startWithAt, '@scoped-a/pack2', {
                                deltaStart: -1,
                            }),
                        },
                        {
                            label: '@scoped-a/pack3',
                            textEdit: replaceText(carets.startWithAt, '@scoped-a/pack3', {
                                deltaStart: -1,
                            }),
                        },
                    ],
                    unexpectedList: [{ label: 'package-a' }],
                }));
            });
            it('should suggest package relative content (no exports field)', () => {
                const { service, assertCompletions, fs } = testLangService(
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

                assertCompletions(entryPath, ({ filePath, carets }) => ({
                    message: 'scoped root',
                    actualList: service.onCompletion(filePath, carets.scopedRoot),
                    expectedList: [
                        { label: 'dist/' },
                        { label: 'src/' },
                        { label: 'package.json' },
                    ],
                }));

                assertCompletions(entryPath, ({ filePath, carets }) => ({
                    message: 'flat root',
                    actualList: service.onCompletion(filePath, carets.flatRoot),
                    expectedList: [{ label: 'esm/' }, { label: 'lib/' }, { label: 'package.json' }],
                }));

                assertCompletions(entryPath, ({ filePath, carets, textEdit: { replaceText } }) => ({
                    message: 'scoped internal',
                    actualList: service.onCompletion(filePath, carets.scopedInternal),
                    expectedList: [
                        {
                            label: 'file.js',
                            textEdit: replaceText(carets.scopedInternal, 'file.js', {
                                deltaStart: -2,
                            }),
                        },
                    ],
                }));

                assertCompletions(entryPath, ({ filePath, carets, textEdit: { replaceText } }) => ({
                    message: 'flat internal',
                    actualList: service.onCompletion(filePath, carets.flatInternal),
                    expectedList: [
                        {
                            label: 'file.js',
                            textEdit: replaceText(carets.flatInternal, 'file.js', {
                                deltaStart: -2,
                            }),
                        },
                    ],
                }));
            });
            it('should suggest closer resolved package', () => {
                const { service, assertCompletions, fs } = testLangService(
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

                assertCompletions(entryPath, ({ filePath, carets }) => ({
                    message: 'empty',
                    actualList: service.onCompletion(filePath, carets[0]),
                    expectedList: [{ label: 'green.js' }, { label: 'package.json' }],
                    unexpectedList: [{ label: 'red.js' }],
                }));
            });
            it('should suggest package exports', () => {
                const { service, assertCompletions, fs } = testLangService(
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

                assertCompletions(entryPath, ({ filePath, carets }) => ({
                    message: 'package root',
                    actualList: service.onCompletion(filePath, carets.packageRoot),
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
                }));

                assertCompletions(entryPath, ({ filePath, carets }) => ({
                    message: 'wild card at end',
                    actualList: service.onCompletion(filePath, carets.wildCardAtEnd),
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
                }));

                assertCompletions(entryPath, ({ filePath, carets }) => ({
                    message: 'wild card at end with partial file name',
                    actualList: service.onCompletion(filePath, carets.wildCardAtEndPartial),
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
                }));

                assertCompletions(entryPath, ({ filePath, carets }) => ({
                    message: 'internal',
                    actualList: service.onCompletion(filePath, carets.internal),
                    unexpectedList: [{ label: 'x-file.js' }],
                }));
            });
            it('should handle conditional exports', () => {
                /**
                 * very naive first find-first-known-conditional (dfs) implementation
                 * will only get hard-coded known conditions:
                 * node, import, require, default, browse
                 */
                const { service, assertCompletions, fs } = testLangService(
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

                assertCompletions(entryPath, ({ filePath, carets }) => ({
                    message: 'known conditions',
                    actualList: service.onCompletion(filePath, carets.topLevelConditions),
                    expectedList: [{ label: 'import.js' }],
                    unexpectedList: [{ label: 'require.js' }, { label: 'default.js' }],
                }));

                assertCompletions(entryPath, ({ filePath, carets }) => ({
                    message: 'nested conditions',
                    actualList: service.onCompletion(filePath, carets.nestedConditions),
                    expectedList: [{ label: 'give-me/' }],
                    unexpectedList: [{ label: 'import.js' }],
                }));

                assertCompletions(entryPath, ({ filePath, carets }) => ({
                    message: 'nested subpath conditions',
                    actualList: service.onCompletion(filePath, carets.nestedSubpathConditions),
                    expectedList: [{ label: 'a.js' }, { label: 'b.js' }],
                    unexpectedList: [{ label: 'x.js' }],
                }));
            });
        });
        describe('custom resolve', () => {
            it('should suggest from custom mapped', () => {
                const { service, assertCompletions, fs } = testLangService(
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
                /**
                 * mapping like this cannot override the original resolved package
                 * and combine suggestions from both locations.
                 */
                assertCompletions(entryPath, ({ filePath, carets }) => ({
                    actualList: service.onCompletion(filePath, carets[0]),
                    expectedList: [
                        { label: 'green.js' },
                        { label: 'yellow.js' },
                        { label: 'package.json' },
                    ],
                }));
            });
        });
    });
});
