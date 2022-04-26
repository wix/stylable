import { testStylableCore, generateStylableEnvironment } from '@stylable/core-test-kit';
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
            const fsContent = `.a {}`;
            const overrideContent = `.b {}`;
            const { stylable } = testStylableCore({
                [path]: fsContent,
            });

            const meta = stylable.analyze(path, overrideContent);

            expect(meta, `meta field`).to.contain({
                source: path,
                namespace: `entry`,
            });
            expect(meta.ast.toString(), `src ast`).to.eql(`.b {}`);
        });
    });
    describe(`transformation`, () => {
        it(`should transform a stylesheet by content & path`, () => {
            const src = `.a {}`;
            const path = `/entry.st.css`;
            const { stylable } = testStylableCore({});

            const { meta, exports } = stylable.transform(src, path);

            expect(meta.outputAst?.toString(), `output CSS`).to.eql(`.entry__a {}`);
            expect(exports.classes.a, `JS export`).to.eql(`entry__a`);
        });
        it(`should transform a stylesheet from meta`, () => {
            const src = `.a {}`;
            const path = `/entry.st.css`;
            const { stylable, fs } = testStylableCore({});
            fs.writeFileSync(path, src);

            const { meta, exports } = stylable.transform(stylable.analyze(path));

            expect(meta.outputAst?.toString(), `output CSS`).to.eql(`.entry__a {}`);
            expect(exports.classes.a, `JS export`).to.eql(`entry__a`);
        });
        it(`should transform selector`, () => {
            const path = `/entry.st.css`;
            const { stylable } = testStylableCore({
                [path]: `.a { -st-states: x; }`,
            });

            const resultFromPath = stylable.transformSelector(path, `.a:x {}`);
            const resultFromMeta = stylable.transformSelector(stylable.analyze(path), `.a:x {}`);

            expect(resultFromPath.selector, `by path`).to.eql(`.entry__a.entry--x {}`);
            expect(resultFromMeta.selector, `by meta`).to.eql(`.entry__a.entry--x {}`);
        });
        it(`should resolve selector elements selector`, () => {
            const path = `/entry.st.css`;
            const { stylable, sheets } = testStylableCore({
                [path]: `.a {}`,
            });

            const { meta } = sheets[path];
            const resultFromPath = stylable.transformSelector(path, `.a {}`);
            const resultFromMeta = stylable.transformSelector(stylable.analyze(path), `.a {}`);

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
        it(`should transform declaration prop`, () => {
            const path = `/entry.st.css`;
            const { stylable } = testStylableCore({
                [path]: `@property --x;`,
            });

            const propFromPath = stylable.transformDeclProp(path, `--x`);
            const propFromMeta = stylable.transformDeclProp(stylable.analyze(path), `--x`);

            expect(propFromPath, `by path`).to.eql(`--entry-x`);
            expect(propFromMeta, `by meta`).to.eql(`--entry-x`);
        });
        it(`should transform declaration value`, () => {
            const path = `/entry.st.css`;
            const { stylable } = testStylableCore({
                [path]: `@property --x;`,
            });

            const valueFromPath = stylable.transformDeclValue(path, `var(--x)`);
            const valueFromMeta = stylable.transformDeclValue(stylable.analyze(path), `var(--x)`);

            expect(valueFromPath, `by path`).to.eql(`var(--entry-x)`);
            expect(valueFromMeta, `by meta`).to.eql(`var(--entry-x)`);
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

            const localFromPath = stylable.transformDeclProp(path, `--local`);
            const localFromMeta = stylable.transformDeclProp(stylable.analyze(path), `--local`);
            const importedFromPath = stylable.transformDeclProp(path, `--imported`);
            const importedFromMeta = stylable.transformDeclProp(
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
                  .root .foo { }
                `,
            });

            stylable.initCache();
            stylable.transform(stylable.analyze('/entry.st.css'));

            fs.writeFileSync('/foo.st.css', '.bar {}');
            fs.writeFileSync(
                '/entry.st.css',
                `
                @st-import [bar] from './foo.st.css';
                .root .bar { }

                `
            );

            // invalidate cache
            stylable.initCache();

            const res = stylable.transform(stylable.analyze('/entry.st.css'));

            expect(res.exports.classes).to.eql({
                bar: 'foo__bar',
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
