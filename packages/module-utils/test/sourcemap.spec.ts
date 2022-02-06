import { generateStylableResult } from '@stylable/core-test-kit';
import { generateDTSSourceMap, generateDTSContent } from '@stylable/module-utils';
import { expect } from 'chai';
import deindent from 'deindent';
import { SourceMapConsumer } from 'source-map';

function getPosition(content: string, query: string) {
    const lines = content.split('\n');

    for (const [zeroBasedLineNumber, line] of lines.entries()) {
        const queryIndex = line.indexOf(query);

        if (queryIndex !== -1) {
            return {
                line: zeroBasedLineNumber + 1,
                column: queryIndex,
            };
        }
    }

    throw new Error(`couldn't locate query: ${query} in the provided .d.ts content: ${content}`);
}

describe('.d.ts source-maps', () => {
    let sourceMapConsumer: SourceMapConsumer;

    afterEach(() => {
        sourceMapConsumer.destroy();
    });

    it('maps an empty stylesheet ".d.ts" to the first character of the original ".st.css" file', async () => {
        const res = generateStylableResult({
            entry: `/entry.st.css`,
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: ``,
                },
            },
        });

        const dtsText = generateDTSContent(res);
        const sourcemapText = generateDTSSourceMap(dtsText, res.meta);

        expect(JSON.parse(sourcemapText).sources).to.eql(['entry.st.css']);

        sourceMapConsumer = await new SourceMapConsumer(sourcemapText);
        const originalPosition = sourceMapConsumer.originalPositionFor(
            getPosition(dtsText, 'root":') // source mapping starts after the first double quote
        );

        expect(originalPosition).to.eql({ line: 1, column: 0, source: 'entry.st.css', name: null });
    });

    it('should generate source maps and set specific file path as the source file path', () => {
        const res = generateStylableResult({
            entry: `/entry.st.css`,
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: ``,
                },
            },
        });

        const dtsText = generateDTSContent(res);
        const sourcemapText = generateDTSSourceMap(dtsText, res.meta, 'src');

        expect(JSON.parse(sourcemapText).sources).to.eql(['src/entry.st.css']);
    });

    it('maps the "root" class in the ".d.ts" to its position in the original ".st.css" file', async () => {
        const res = generateStylableResult({
            entry: `/entry.st.css`,
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `.root {}`,
                },
            },
        });

        const dtsText = generateDTSContent(res);
        const sourcemapText = generateDTSSourceMap(dtsText, res.meta);

        sourceMapConsumer = await new SourceMapConsumer(sourcemapText);
        const originalPosition = sourceMapConsumer.originalPositionFor(
            getPosition(dtsText, 'root":') // source mapping starts after the first double quote
        );

        expect(originalPosition).to.eql({ line: 1, column: 0, source: 'entry.st.css', name: null });
    });

    it('maps the "c1" st variable in the ".d.ts" to its position in the original ".st.css" file', async () => {
        const res = generateStylableResult({
            entry: `/entry.st.css`,
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: deindent(`
                    :vars {
                        c1: green;
                    }`),
                },
            },
        });

        const dtsText = generateDTSContent(res);
        const sourcemapText = generateDTSSourceMap(dtsText, res.meta);

        sourceMapConsumer = await new SourceMapConsumer(sourcemapText);
        const originalPosition = sourceMapConsumer.originalPositionFor(
            getPosition(dtsText, 'c1":') // source mapping starts after the first double quote
        );

        expect(originalPosition).to.eql({ line: 3, column: 4, source: 'entry.st.css', name: null });
    });

    it('maps the "c1" css variable in the ".d.ts" to its position in the original ".st.css" file', async () => {
        const res = generateStylableResult({
            entry: `/entry.st.css`,
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `.root { --c1: green; }`,
                },
            },
        });

        const dtsText = generateDTSContent(res);
        const sourcemapText = generateDTSSourceMap(dtsText, res.meta);

        sourceMapConsumer = await new SourceMapConsumer(sourcemapText);
        const originalPosition = sourceMapConsumer.originalPositionFor(
            getPosition(dtsText, 'c1":') // source mapping starts after the first double quote
        );

        expect(originalPosition).to.eql({ line: 1, column: 8, source: 'entry.st.css', name: null });
    });

    it('maps the "k1" keyframe in the ".d.ts" to its position in the original ".st.css" file', async () => {
        const res = generateStylableResult({
            entry: `/entry.st.css`,
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `@keyframes k1 {}`,
                },
            },
        });

        const dtsText = generateDTSContent(res);
        const sourcemapText = generateDTSSourceMap(dtsText, res.meta);

        sourceMapConsumer = await new SourceMapConsumer(sourcemapText);
        const originalPosition = sourceMapConsumer.originalPositionFor(
            getPosition(dtsText, 'k1":') // source mapping starts after the first double quote
        );

        expect(originalPosition).to.eql({ line: 1, column: 0, source: 'entry.st.css', name: null });
    });

    it('maps states in the ".d.ts" to their positions in the original ".st.css" file', async () => {
        const res = generateStylableResult({
            entry: `/entry.st.css`,
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: deindent(`
                    .root { -st-states: state1; }
                    .other { -st-states: state2; }`),
                },
            },
        });

        const dtsText = generateDTSContent(res);
        const sourcemapText = generateDTSSourceMap(dtsText, res.meta);

        sourceMapConsumer = await new SourceMapConsumer(sourcemapText);
        const state1OriginalPosition = sourceMapConsumer.originalPositionFor(
            getPosition(dtsText, 'state1"?:') // source mapping starts after the first double quote
        );
        const state2OriginalPosition = sourceMapConsumer.originalPositionFor(
            getPosition(dtsText, 'state2"?:')
        );

        expect(state1OriginalPosition).to.eql({
            line: 2,
            column: 8,
            source: 'entry.st.css',
            name: null,
        });
        expect(state2OriginalPosition).to.eql({
            line: 3,
            column: 9,
            source: 'entry.st.css',
            name: null,
        });
    });

    it('maps locally extended states in the ".d.ts" to their positions in the original ".st.css" file', async () => {
        const res = generateStylableResult({
            entry: `/entry.st.css`,
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: deindent(`
                    .test { -st-states: state; -st-extends: testBase1; }
                    .testBase1 { -st-states: state2; -st-extends: testBase2; }
                    .testBase2 { -st-states: state3; }
                    `),
                },
            },
        });

        const dtsText = generateDTSContent(res);
        const sourcemapText = generateDTSSourceMap(dtsText, res.meta);

        sourceMapConsumer = await new SourceMapConsumer(sourcemapText);
        const state1OriginalPosition = sourceMapConsumer.originalPositionFor(
            getPosition(dtsText, 'state"?:') // source mapping starts after the first double quote
        );
        const state2OriginalPosition = sourceMapConsumer.originalPositionFor(
            getPosition(dtsText, 'state2"?:')
        );
        const state3OriginalPosition = sourceMapConsumer.originalPositionFor(
            getPosition(dtsText, 'state3"?:')
        );

        expect(state1OriginalPosition).to.eql({
            line: 2,
            column: 8,
            source: 'entry.st.css',
            name: null,
        });
        expect(state2OriginalPosition).to.eql({
            line: 3,
            column: 13,
            source: 'entry.st.css',
            name: null,
        });
        expect(state3OriginalPosition).to.eql({
            line: 4,
            column: 13,
            source: 'entry.st.css',
            name: null,
        });
    });

    it('maps locally overridden states in the ".d.ts" to their "top-most" definition in the original ".st.css" file', async () => {
        const res = generateStylableResult({
            entry: `/entry.st.css`,
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: deindent(`
                    .test { -st-states: sameState(string); -st-extends: testBase1; }
                    .testBase1 { -st-states: sameState(number); }
                    `),
                },
            },
        });

        const dtsText = generateDTSContent(res);
        const sourcemapText = generateDTSSourceMap(dtsText, res.meta);

        sourceMapConsumer = await new SourceMapConsumer(sourcemapText);
        const sameStateOriginalPosition = sourceMapConsumer.originalPositionFor(
            getPosition(dtsText, 'sameState"?:') // source mapping starts after the first double quote
        );

        expect(sameStateOriginalPosition).to.eql({
            line: 2, // expect .test class (1 based index)
            column: 8,
            source: 'entry.st.css',
            name: null,
        });
    });

    it('maps a complex example to its positions in the original ".st.css" file', async () => {
        const res = generateStylableResult({
            entry: `/entry.st.css`,
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: deindent(`
                    :vars {
                        c1: red;
                        c2: green;
                    }
                    .root {
                        -st-states: state1;
                        --css1: red;
                    }
                    .other { 
                        -st-states: state2;
                        --css2: green;
                    }
                    @keyframes k1 {}
                    `),
                },
            },
        });

        const dtsText = generateDTSContent(res);
        const sourcemapText = generateDTSSourceMap(dtsText, res.meta);

        sourceMapConsumer = await new SourceMapConsumer(sourcemapText);

        const class1OriginalPosition = sourceMapConsumer.originalPositionFor(
            getPosition(dtsText, 'root": "') // source mapping starts after the first double quote
        );
        const class2OriginalPosition = sourceMapConsumer.originalPositionFor(
            getPosition(dtsText, 'other": "')
        );
        const stVar1OriginalPosition = sourceMapConsumer.originalPositionFor(
            getPosition(dtsText, 'c1":')
        );
        const stVar2OriginalPosition = sourceMapConsumer.originalPositionFor(
            getPosition(dtsText, 'c2":')
        );
        const cssVar1OriginalPosition = sourceMapConsumer.originalPositionFor(
            getPosition(dtsText, 'css1":')
        );
        const cssVar2OriginalPosition = sourceMapConsumer.originalPositionFor(
            getPosition(dtsText, 'css2":')
        );
        const state1OriginalPosition = sourceMapConsumer.originalPositionFor(
            getPosition(dtsText, 'state1"?:')
        );
        const state2OriginalPosition = sourceMapConsumer.originalPositionFor(
            getPosition(dtsText, 'state2"?:')
        );
        const keyframes1OriginalPosition = sourceMapConsumer.originalPositionFor(
            getPosition(dtsText, 'k1":')
        );

        expect(class1OriginalPosition).to.eql({
            line: 6,
            column: 0,
            source: 'entry.st.css',
            name: null,
        });
        expect(class2OriginalPosition).to.eql({
            line: 10,
            column: 0,
            source: 'entry.st.css',
            name: null,
        });
        expect(stVar1OriginalPosition).to.eql({
            line: 3,
            column: 4,
            source: 'entry.st.css',
            name: null,
        });
        expect(stVar2OriginalPosition).to.eql({
            line: 4,
            column: 4,
            source: 'entry.st.css',
            name: null,
        });
        expect(cssVar1OriginalPosition).to.eql({
            line: 8,
            column: 4,
            source: 'entry.st.css',
            name: null,
        });
        expect(cssVar2OriginalPosition).to.eql({
            line: 12,
            column: 4,
            source: 'entry.st.css',
            name: null,
        });
        expect(state1OriginalPosition).to.eql({
            line: 7,
            column: 4,
            source: 'entry.st.css',
            name: null,
        });
        expect(state2OriginalPosition).to.eql({
            line: 11,
            column: 4,
            source: 'entry.st.css',
            name: null,
        });
        expect(keyframes1OriginalPosition).to.eql({
            line: 14,
            column: 0,
            source: 'entry.st.css',
            name: null,
        });
    });

    it('maps a complex st-vars example to its positions in the original ".st.css" file', async () => {
        const res = generateStylableResult({
            entry: `/entry.st.css`,
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: deindent(`
                    :vars {
                        a: st-map(b st-array(red,
                            st-map(e blue),
                            st-map(d green)),
                          c gold,
                        )
                    }
                    `),
                },
            },
        });

        const dtsText = generateDTSContent(res);
        const sourcemapText = generateDTSSourceMap(dtsText, res.meta);

        sourceMapConsumer = await new SourceMapConsumer(sourcemapText);

        const aOriginalPosition = sourceMapConsumer.originalPositionFor(
            getPosition(dtsText, 'a":')
        );
        const bOriginalPosition = sourceMapConsumer.originalPositionFor(
            getPosition(dtsText, 'b":')
        );
        const cOriginalPosition = sourceMapConsumer.originalPositionFor(
            getPosition(dtsText, 'c":')
        );
        const dOriginalPosition = sourceMapConsumer.originalPositionFor(
            getPosition(dtsText, 'd":')
        );
        const eOriginalPosition = sourceMapConsumer.originalPositionFor(
            getPosition(dtsText, 'e":')
        );

        expect(aOriginalPosition).to.eql({
            column: 4,
            line: 3,
            name: null,
            source: 'entry.st.css',
        });
        expect(bOriginalPosition).to.eql({
            column: 14,
            line: 3,
            name: null,
            source: 'entry.st.css',
        });
        expect(cOriginalPosition).to.eql({
            column: 6,
            line: 6,
            name: null,
            source: 'entry.st.css',
        });
        expect(dOriginalPosition).to.eql({
            column: 15,
            line: 5,
            name: null,
            source: 'entry.st.css',
        });
        expect(eOriginalPosition).to.eql({
            column: 15,
            line: 4,
            name: null,
            source: 'entry.st.css',
        });
    });
});
