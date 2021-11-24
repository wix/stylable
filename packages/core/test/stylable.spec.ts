import { generateStylableEnvironment } from '@stylable/core-test-kit';
import { expect } from 'chai';

describe('Stylable', () => {
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
            stylable.transform(stylable.process('/entry.st.css'));

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

            const res = stylable.transform(stylable.process('/entry.st.css'));

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

            stylable.transform(stylable.process('/entry.st.css'));

            // remove foo class
            fs.writeFileSync('/foo.st.css', '');
            stylable.initCache({
                filter(_, entity) {
                    // keep 'foo.st.css' in cache
                    return Boolean(entity.value && entity.resolvedPath.includes('foo.st.css'));
                },
            });

            expect(resolverCache.size, 'has one cache entity').to.eql(1);

            const res = stylable.transform(stylable.process('/entry.st.css'));

            expect(
                res.meta.transformDiagnostics!.reports,
                'no diagnostics reported for foo import'
            ).to.eql([]);
        });
    });
});
