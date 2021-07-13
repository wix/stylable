import { getDocumentFormatting } from '@stylable/code-formatter';
import { expect } from 'chai';

describe('Formatting', () => {
    it('should format an entire stylesheet with extra spaces', () => {
        const res = getDocumentFormatting('.root { color: red      ;}');

        expect(res).to.eql('.root {\n    color: red;\n}');
    });

    it('should perserve custom selectors with immediate decendants ', () => {
        const res = getDocumentFormatting(
            '@custom-selector :--some-selector     >      :global(div) > :global(span);'
        );

        expect(res).to.eql('@custom-selector :--some-selector > :global(div) > :global(span);');
    });

    it('should format a specific range', () => {
        const res = getDocumentFormatting('.root { color: red      ;}', { start: 14, end: 25 });

        expect(res).to.eql(' red;');
    });

    describe('beautifying options', () => {
        it('end_with_newline: true', () => {
            const res = getDocumentFormatting('.root { color: red;}', undefined, {
                end_with_newline: true,
            });

            expect(res).to.eql('.root {\n    color: red;\n}\n');
        });

        it('indent_empty_lines: true', () => {
            const res = getDocumentFormatting(
                '.root { color: red;\n\nbackground: green; }',
                undefined,
                {
                    indent_empty_lines: true,
                }
            );

            expect(res).to.eql('.root {\n    color: red;\n    \n    background: green;\n}');
        });

        it('indent_size: 2', () => {
            const res = getDocumentFormatting('.root {color:red;}', undefined, {
                indent_size: 2,
            });

            expect(res).to.eql('.root {\n  color: red;\n}');
        });

        it('indent_with_tabs: true', () => {
            const res = getDocumentFormatting('.root {color:red;}', undefined, {
                indent_with_tabs: true,
            });

            expect(res).to.eql('.root {\n\tcolor: red;\n}');
        });

        it('max_preserve_newlines: 2', () => {
            const res = getDocumentFormatting(
                '.root {\n    color: red;\n\n\nbackground: green;\n}\n',
                undefined,
                {
                    max_preserve_newlines: 2,
                }
            );

            expect(res).to.eql('.root {\n    color: red;\n\n    background: green;\n}');
        });

        it('newline_between_rules: false', () => {
            const res = getDocumentFormatting('.root {} .part {}', undefined, {
                newline_between_rules: false,
            });

            expect(res).to.eql('.root {}\n.part {}');
        });

        it('preserve_newlines: true', () => {
            const res = getDocumentFormatting(
                '.root { color: red; \n\n\nbackground: green; }',
                undefined,
                {
                    preserve_newlines: true,
                }
            );

            expect(res).to.eql('.root {\n    color: red;\n\n\n    background: green;\n}');
        });

        it('selector_separator_newline: false', () => {
            const res = getDocumentFormatting('.root,.part {}', undefined, {
                selector_separator_newline: false,
            });

            expect(res).to.eql('.root, .part {}');
        });

        it('selector_separator_newline: true', () => {
            const res = getDocumentFormatting('.root,.part {}', undefined, {
                selector_separator_newline: true,
            });

            expect(res).to.eql('.root,\n.part {}');
        });

        xit('wrap_line_length: 10', () => {
            // does not appear to work for CSS :(
            const res = getDocumentFormatting(
                `.background { background: repeating-linear-gradient(-45deg,transparent 0,transparent 25%,dodgerblue 0,dodgerblue 50%);}`,
                undefined,
                {
                    wrap_line_length: 10,
                }
            );

            expect(res).to.eql(
                '.background {\n    background: repeating-linear-gradient(\n-45deg,\ntransparent 0,\ntransparent 25%,\ndodgerblue 0,\ndodgerblue 50%);\n}'
            );
        });
    });
});
