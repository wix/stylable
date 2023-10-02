import { testStylableCore, generateStylableEnvironment, deindent } from '@stylable/core-test-kit';
import { expect } from 'chai';

describe('Stylable', () => {
    describe(`analyze (generate meta) `, () => {
        it(`should accept path`, () => {
            const src = `.a {}`;
            const path = `/entry.st.css`;
            const { stylable } = testStylableCore({
                [path]: src,
            });

            const meta = stylable.analyze(path);

            expect(meta, `meta field`).to.contain({
                source: path,
                namespace: `entry`,
            });
            expect(meta.getClass(`a`), `src ast`).to.contain({});
        });
        it(`should accept content override to path`, () => {
            const path = `/entry.st.css`;
            const fsContent = `.fs {}`;
            const overrideContent = `.override {}`;
            const { stylable } = testStylableCore({
                [path]: fsContent,
            });

            const fsMetaBefore = stylable.analyze(path);
            const overrideMeta = stylable.analyze(path, overrideContent);
            const fsMetaAfter = stylable.analyze(path);

            expect(overrideMeta.sourceAst.toString(), `override src ast`).to.eql(`.override {}`);
            expect(overrideMeta, `override meta`).to.contain({
                source: path,
                namespace: `entry`,
            });
            expect(fsMetaBefore.sourceAst.toString(), `fs before src ast`).to.eql(`.fs {}`);
            expect(fsMetaBefore, `fs meta`).to.contain({
                source: path,
                namespace: `entry`,
            });
            expect(fsMetaAfter, `meta cached`).to.equal(fsMetaBefore);
        });
    });

    describe('resolveModule option', () => {
        it('should accept resolve options', () => {
            const { stylable } = testStylableCore(
                {
                    '/abc.js': ``,
                },
                {
                    stylableConfig: {
                        resolveModule: { alias: { '@abc': '/abc.js' } },
                    },
                }
            );

            expect(stylable.resolvePath('/', '@abc')).to.equal('/abc.js');
        });
    });
    describe(`transformation`, () => {
        it(`should transform a stylesheet from meta`, () => {
            const src = `
                :vars {
                    varA: red;
                }
                .a {
                    prop: value(varA);
                }
            `;
            const path = `/entry.st.css`;
            const { stylable, fs } = testStylableCore({});
            fs.writeFileSync(path, src);
            const meta = stylable.analyze(path);

            const defaultTransform = stylable.transform(meta);

            expect(
                deindent(defaultTransform.meta.targetAst!.toString()),
                `default output CSS`
            ).to.eql(
                deindent(`
                    .entry__a {
                        prop: red;
                    }
                `)
            );
            expect(defaultTransform.exports.classes.a, `JS export`).to.eql(`entry__a`);
            expect(defaultTransform.exports.stVars.varA, `default var JS export`).to.eql(`red`);

            // test with override
            const varOverrideTransform = stylable.transform(meta, {
                stVarOverride: { varA: 'green' },
            });

            expect(
                deindent(varOverrideTransform.meta.targetAst!.toString()),
                `override vars output CSS`
            ).to.eql(
                deindent(`
                    .entry__a {
                        prop: green;
                    }
                `)
            );
            // ToDo: fix JS export for programmatic override
            // expect(varOverrideTransform.exports.stVars.varA, `override var JS export`).to.eql(
            //     `green`
            // );
        });
        it(`should transform selector`, () => {
            const path = `/entry.st.css`;
            const { stylable } = testStylableCore({
                [path]: `.a { -st-states: x; }`,
            });

            const resultFromPath = stylable.transformSelector(path, `.a:x`);
            const resultFromMeta = stylable.transformSelector(stylable.analyze(path), `.a:x`);

            expect(resultFromPath.selector, `by path`).to.eql(`.entry__a.entry--x`);
            expect(resultFromMeta.selector, `by meta`).to.eql(`.entry__a.entry--x`);
        });
        it(`should resolve selector components`, () => {
            const path = `/entry.st.css`;
            const { stylable, sheets } = testStylableCore({
                [path]: `.a {}`,
            });

            const { meta } = sheets[path];
            const resultFromPath = stylable.transformSelector(path, `.a`);
            const resultFromMeta = stylable.transformSelector(stylable.analyze(path), `.a`);

            const expectedResolve = [
                [
                    {
                        type: 'class',
                        name: 'a',
                        resolved: [
                            {
                                meta,
                                symbol: meta.getClass(`a`),
                                _kind: 'css',
                            },
                        ],
                    },
                ],
            ];
            expect(resultFromPath.resolved, `by path`).to.eql(expectedResolve);
            expect(resultFromMeta.resolved, `by meta`).to.eql(expectedResolve);
        });
        it(`should transform declaration prop/value`, () => {
            const path = `/entry.st.css`;
            const { stylable } = testStylableCore({
                [path]: `
                    @property --x;
                    @keyframes jump {}
                `,
            });
            const meta = stylable.analyze(path);

            const declAnimation = stylable.transformDecl(path, `animation`, `var(--x) jump`);
            const declFromPath = stylable.transformDecl(path, `--x`, `var(--x) jump`);
            const declFromMeta = stylable.transformDecl(meta, `--x`, `var(--x) jump`);

            expect(declAnimation, `animation context`).to.eql({
                prop: `animation`,
                value: `var(--entry-x) entry__jump`,
            });
            expect(declFromPath, `by path`).to.eql({
                prop: `--entry-x`,
                value: `var(--entry-x) jump`,
            });
            expect(declFromMeta, `by path`).to.eql({
                prop: `--entry-x`,
                value: `var(--entry-x) jump`,
            });
        });
        it(`should transform declaration prop/value with override st-vars`, () => {
            const path = `/entry.st.css`;
            const { stylable } = testStylableCore({
                [path]: `
                    :vars {
                        x: red;
                        a: value(x);
                        b: blue;
                    }
                `,
            });

            const decl = stylable.transformDecl(path, `prop`, `value(a) value(b) value(x)`, {
                stVarOverride: {
                    x: 'green',
                },
            });

            expect(decl, `value override`).to.eql({
                prop: `prop`,
                value: `green blue green`,
            });
        });
        it(`should transform custom property`, () => {
            const path = `/entry.st.css`;
            const { stylable } = testStylableCore({
                'props.st.css': `
                    @property --imported;
                `,
                [path]: `
                    @st-import [--imported] from './props.st.css';
                    @property --local;`,
            });

            const localFromPath = stylable.transformCustomProperty(path, `--local`);
            const localFromMeta = stylable.transformCustomProperty(
                stylable.analyze(path),
                `--local`
            );
            const importedFromPath = stylable.transformCustomProperty(path, `--imported`);
            const importedFromMeta = stylable.transformCustomProperty(
                stylable.analyze(path),
                `--imported`
            );

            expect(localFromPath, `local by path`).to.eql(`--entry-local`);
            expect(localFromMeta, `local by meta`).to.eql(`--entry-local`);
            expect(importedFromPath, `imported by path`).to.eql(`--props-imported`);
            expect(importedFromMeta, `imported by meta`).to.eql(`--props-imported`);
        });
    });
    describe('Cache', () => {
        it('should invalidate cache', () => {
            const { fs, stylable } = generateStylableEnvironment({
                'foo.st.css': '.foo {}',
                'entry.st.css': `
                  @st-import [foo] from './foo.st.css';
                  .baz {
                    -st-extends: foo;
                  }
                `,
            });

            stylable.initCache();
            stylable.transform(stylable.analyze('/entry.st.css'));

            fs.writeFileSync('/foo.st.css', '.bar {}');
            fs.writeFileSync(
                '/entry.st.css',
                `
                @st-import [bar] from './foo.st.css';
                .baz {
                    -st-extends: bar;
                }

                `
            );

            // invalidate cache
            stylable.initCache();

            const res = stylable.transform(stylable.analyze('/entry.st.css'));

            expect(res.exports.classes).to.eql({
                baz: 'entry__baz foo__bar',
                root: 'entry__root',
            });
            expect(
                res.meta.transformDiagnostics!.reports,
                'no diagnostics reported for foo import'
            ).to.eql([]);
        });

        it('should clear cache only for filtered items', () => {
            const resolverCache = new Map();
            const { fs, stylable } = generateStylableEnvironment(
                {
                    'foo.st.css': '.foo {}',
                    'bar.st.css': '.bar {}',
                    'entry.st.css': `
                          @st-import [bar] from './bar.st.css';
                          @st-import [foo] from './foo.st.css';
                          .root .foo .bar { }
                    `,
                },
                { resolverCache }
            );

            stylable.transform(stylable.analyze('/entry.st.css'));

            // remove foo class
            fs.writeFileSync('/foo.st.css', '');
            stylable.initCache({
                filter(_, entity) {
                    // keep 'foo.st.css' in cache
                    return Boolean(entity.value && entity.resolvedPath.includes('foo.st.css'));
                },
            });

            expect(resolverCache.size, 'has one cache entity').to.eql(1);

            const res = stylable.transform(stylable.analyze('/entry.st.css'));

            expect(
                res.meta.transformDiagnostics!.reports,
                'no diagnostics reported for foo import'
            ).to.eql([]);
        });
    });
});
