import { expect } from 'chai';
import { testStylableCore } from '@stylable/core-test-kit';
import { parseCssSelector, PseudoElement } from '@tokey/css-selector-parser';
import {
    stExtendsParser,
    resolveType,
    ExpNode,
} from '@stylable/core/dist/parsers/st-extends-parser';

describe.skip('resolveType', () => {
    it('two roots intersection', () => {
        const { sheets, stylable } = testStylableCore({
            'a.st.css': ``,
            'b.st.css': ``,
            'c.st.css': `
                @st-import A from "./a.st.css";
                @st-import B from "./b.st.css";
                /* @rule .c__root */
                .root {
                    -st-extends: A & B;
                }
            `,
        });

        const entry = sheets['c.st.css'].meta;

        const resolved = resolveType(
            [{ meta: entry, symbol: entry.getClass('root') }],
            null,
            stylable.resolver
        );

        expect(resolved).to.eql({
            errors: [],
            resolved: [{ meta: entry, symbol: entry.getClass('root') }],
        });
    });

    it('two roots intersection inner part resolved to never', () => {
        const { sheets, stylable } = testStylableCore({
            'a.st.css': `.part{}`,
            'b.st.css': `.part{}`,
            'c.st.css': `
                @st-import A from "./a.st.css";
                @st-import B from "./b.st.css";
                /* @rule .c__root */
                .root {
                    -st-extends: A & B;
                }

                /* 
                    @transform-error .part in A & B does reference the same part.
                    @rule .c__root::part
                */
                .root::part {

                }
            `,
        });

        // const metaA = sheets['a.st.css'].meta;
        // const metaB = sheets['b.st.css'].meta;
        const entry = sheets['c.st.css'].meta;

        const partNode = parseCssSelector('::part')[0].nodes[0] as PseudoElement;

        const resolved = resolveType(
            [{ meta: entry, symbol: entry.getClass('root') }],
            partNode,
            stylable.resolver
        );

        expect(resolved).to.eql({
            errors: ['.part in A & B does reference the same part.'],
            resolved: [],
        });
    });

    it('two roots intersection common inner part', () => {
        const { sheets, stylable } = testStylableCore({
            'common.st.css': `.part{}`,
            'a.st.css': `@st-import [part] from "./common.st.css"; .part{}`,
            'b.st.css': `@st-import [part] from "./common.st.css"; .part{}`,
            'c.st.css': `
                @st-import A from "./a.st.css";
                @st-import B from "./b.st.css";
                /* @rule .c__root */
                .root {
                    -st-extends: A & B;
                }

                /* 
                    @rule .c__root .common__part
                */
                .root::part {

                }
            `,
        });

        const metaCommon = sheets['common.st.css'].meta;
        const entry = sheets['c.st.css'].meta;

        const partNode = parseCssSelector('::part')[0].nodes[0] as PseudoElement;

        const resolved = resolveType(
            [{ meta: entry, symbol: entry.getClass('root') }],
            partNode,
            stylable.resolver
        );

        expect(resolved).to.eql({
            errors: [],
            resolved: [{ meta: metaCommon, symbol: metaCommon.getClass('part') }],
        });
    });

    it('two roots union with inner parts and common part', () => {
        const { sheets, stylable } = testStylableCore({
            'common.st.css': `.commonPart{}`,
            'a.st.css': ` @st-import Common from "./common.st.css"; .part{-st-extends: Common;}`,
            'b.st.css': ` @st-import Common from "./common.st.css"; .part{-st-extends: Common;}`,
            'c.st.css': `
                @st-import A from "./a.st.css";
                @st-import B from "./b.st.css";
                
                /* @rule .c__root */
                .root {
                    -st-extends: A | B;
                }

                /* @rule .c__root :is(.a__part, .b__part) */
                .root::part {}

                /* @rule .c__root :is(.a__part, .b__part) .common__commonPart */
                .root::part::commonPart {}
            `,
        });

        const entry = sheets['c.st.css'].meta;
        const common = sheets['common.st.css'].meta;
        const metaA = sheets['a.st.css'].meta;
        const metaB = sheets['b.st.css'].meta;

        const resolved = resolveType(
            [{ meta: entry, symbol: entry.getClass('root') }],
            null,
            stylable.resolver
        );

        expect(resolved).to.eql({
            errors: [],
            resolved: [{ meta: entry, symbol: entry.getClass('root') }],
        });

        const partNode = parseCssSelector('::part')[0].nodes[0] as PseudoElement;
        const resolvedPart = resolveType(
            [{ meta: entry, symbol: entry.getClass('root') }],
            partNode,
            stylable.resolver
        );

        expect(resolvedPart).to.eql({
            errors: [],
            resolved: [
                { meta: metaA, symbol: metaA.getClass('part') },
                { meta: metaB, symbol: metaB.getClass('part') },
            ],
        });

        const commonPartNode = parseCssSelector('::common')[0].nodes[0] as PseudoElement;

        const resolvedInnerCommonPart = resolveType(
            resolvedPart.resolved,
            commonPartNode,
            stylable.resolver
        );

        expect(resolvedInnerCommonPart).to.eql({
            errors: [],
            resolved: [{ meta: common, symbol: common.getClass('commonPart') }],
        });
    });

    it('intersection and union', () => {
        const { sheets, stylable } = testStylableCore({
            'a.st.css': `.part{}`,
            'b.st.css': `.part{}`,
            'c.st.css': `.part{}`,
            'entry.st.css': `
                @st-import A from "./a.st.css";
                @st-import B from "./b.st.css";
                @st-import C from "./b.st.css";
                
                /* @rule .c__root */
                .root {
                    -st-extends: (A & B) | C;
                }

                /* 
                    @rule .c__root .common__part
                */
                .root::part {

                }
            `,
        });

        const metaCommon = sheets['common.st.css'].meta;
        const entry = sheets['c.st.css'].meta;

        const partNode = parseCssSelector('::part')[0].nodes[0] as PseudoElement;

        const resolved = resolveType(
            [{ meta: entry, symbol: entry.getClass('root') }],
            partNode,
            stylable.resolver
        );

        expect(resolved).to.eql({
            errors: [],
            resolved: [{ meta: metaCommon, symbol: metaCommon.getClass('part') }],
        });
    });
});

describe('-st-extends parser', () => {
    it('parse single', () => {
        const ast = stExtendsParser('a');
        expect(ast).to.eql(new ExpNode('a'));
    });

    it('parse single |', () => {
        const ast = stExtendsParser('a | b');
        expect(ast).to.eql(new ExpNode('a', 'b', '|'));
        const ast2 = stExtendsParser('a|b');
        expect(ast2).to.eql(new ExpNode('a', 'b', '|'));
    });

    it('parse multi |', () => {
        const ast = stExtendsParser('a | b | c');
        expect(ast).to.eql(new ExpNode('a', new ExpNode('b', 'c', '|'), '|'));
    });

    it('parse single &', () => {
        const ast = stExtendsParser('a & b');
        expect(ast).to.eql(new ExpNode('a', 'b', '&'));
        const ast2 = stExtendsParser('a&b');
        expect(ast2).to.eql(new ExpNode('a', 'b', '&'));
    });

    it('parse multi &', () => {
        const ast = stExtendsParser('a & b & c');
        expect(ast).to.eql(new ExpNode('a', new ExpNode('b', 'c', '&'), '&'));
    });

    it('parse operator order |&', () => {
        const ast = stExtendsParser('a | b & c');
        expect(ast).to.eql(new ExpNode('a', new ExpNode('b', 'c', '&'), '|'));
    });

    it('parse operator order &|', () => {
        const ast = stExtendsParser('a & b | c');
        expect(ast).to.eql(new ExpNode(new ExpNode('a', 'b', '&'), 'c', '|'));
    });

    it('parse single | with parens', () => {
        const ast = stExtendsParser('(a | b)');
        expect(ast).to.eql(new ExpNode('a', 'b', '|'));
    });

    it('parse operator order parens |&', () => {
        const ast = stExtendsParser('(a | b) & c');
        expect(ast).to.eql(new ExpNode(new ExpNode('a', 'b', '|'), 'c', '&'));
    });

    it('parse operator order parens &|', () => {
        const ast = stExtendsParser('a & (b | c)');
        expect(ast).to.eql(new ExpNode('a', new ExpNode('b', 'c', '|'), '&'));
    });

    it('unwrap complex expression', () => {
        const ast = stExtendsParser('(((a | b) | c))');
        expect(ast).to.eql(new ExpNode(new ExpNode('a', 'b', '|'), 'c', '|'));
    });

    it('unwrap single expression', () => {
        const ast = stExtendsParser('(((a)))');
        expect(ast).to.eql(new ExpNode('a'));
    });

    describe('errors', () => {
        it('unclosed parenthesis', () => {
            expect(() => {
                stExtendsParser('(');
            }).to.throw('unclosed parenthesis');
        });

        it('empty parenthesis', () => {
            expect(() => {
                stExtendsParser('()');
            }).to.throw('empty parenthesis');
        });

        it('missing expression right side |', () => {
            expect(() => {
                stExtendsParser('(a|)');
            }).to.throw('missing expression right side after | operator');
        });

        it('missing expression right side &', () => {
            expect(() => {
                stExtendsParser('(a&)');
            }).to.throw('missing expression right side after & operator');
        });

        it('missing expression left side |', () => {
            expect(() => {
                stExtendsParser('(|a)');
            }).to.throw('missing expression left side before | operator');
            expect(() => {
                stExtendsParser('|a');
            }).to.throw('missing expression left side before | operator');
        });

        it('missing expression left side &', () => {
            expect(() => {
                stExtendsParser('(&a)');
            }).to.throw('missing expression left side before & operator');
            expect(() => {
                stExtendsParser('&a');
            }).to.throw('missing expression left side before & operator');
        });

        it('consecutive | operators (no space)', () => {
            expect(() => {
                stExtendsParser('||');
            }).to.throw(`invalid node type literal with value ||`);
        });

        it('consecutive & operators (no space)', () => {
            expect(() => {
                stExtendsParser('&&');
            }).to.throw(`invalid node type literal with value &&`);
        });

        it('consecutive &| operators (no space)', () => {
            expect(() => {
                stExtendsParser('&|');
            }).to.throw(`invalid node type literal with value &|`);
        });

        it('consecutive |& operators (no space)', () => {
            expect(() => {
                stExtendsParser('|&');
            }).to.throw(`invalid node type literal with value |&`);
        });

        it('missing value with | first', () => {
            expect(() => {
                stExtendsParser('a | |');
            }).to.throw(`missing value between | and | operators`);
            expect(() => {
                stExtendsParser('a | &');
            }).to.throw(`missing value between | and & operators`);
        });

        it('missing value with & first', () => {
            expect(() => {
                stExtendsParser('a & |');
            }).to.throw(`missing value between & and | operators`);
            expect(() => {
                stExtendsParser('a & &');
            }).to.throw(`missing value between & and & operators`);
        });
    });
});
