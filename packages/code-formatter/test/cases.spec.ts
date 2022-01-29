import { expect } from 'chai';
import * as codeFormatter from '@stylable/code-formatter';

const { formatCSS } = codeFormatter;

describe('Formatting - Top level', () => {
    it('empty input stay empty', () => {
        expect(formatCSS('')).to.equal('');
    });
    it('add new line at the end', () => {
        expect(formatCSS(' ')).to.equal(' \n');
    });
    it('preserve new line type at the end', () => {
        expect(formatCSS('/*\r\n*/')).to.equal('/*\r\n*/\r\n');
    });
    it('one line separation after each node', () => {
        expect(formatCSS('.root {}\n\n\n.root {}')).to.equal('.root {}\n\n.root {}\n');
        expect(formatCSS('.root {}\n\n.root {}')).to.equal('.root {}\n\n.root {}\n');
        expect(formatCSS('.root {}\n.root {}')).to.equal('.root {}\n\n.root {}\n');
        expect(formatCSS('.root {}.root {}')).to.equal('.root {}\n\n.root {}\n');
        expect(formatCSS('.root {}@media {}')).to.equal('.root {}\n\n@media {}\n');
        expect(formatCSS('.root {}/*COMMENT*/')).to.equal('.root {}\n\n/*COMMENT*/\n');
        expect(formatCSS('@media {.root {}/*COMMENT*/}')).to.equal(
            '@media {\n    .root {}\n\n    /*COMMENT*/\n}\n'
        );
    });

    it('no line separation after comment', () => {
        expect(formatCSS('/*COMMENT*/.root {}')).to.equal('/*COMMENT*/\n.root {}\n');
        expect(formatCSS('/*COMMENT*/\n\n\n.root {}')).to.equal('/*COMMENT*/\n.root {}\n');
    });

    it('no format between comments', () => {
        expect(formatCSS('/*COMMENT*//*COMMENT*/')).to.equal('/*COMMENT*//*COMMENT*/\n');
        expect(formatCSS('/*COMMENT*/\n/*COMMENT*/')).to.equal('/*COMMENT*/\n/*COMMENT*/\n');
        expect(formatCSS('/*COMMENT*/\n\n/*COMMENT*/')).to.equal('/*COMMENT*/\n\n/*COMMENT*/\n');
    });

    it('no spaces before level 1 selector', () => {
        expect(formatCSS('   .root {}\n')).to.equal('.root {}\n');
    });
});

describe('Formatting - Rule', () => {
    it('one space after between selector and open block', () => {
        expect(formatCSS('.root{}\n')).to.equal('.root {}\n');
        expect(formatCSS('.root\n\n\n{}\n')).to.equal('.root {}\n');
        expect(formatCSS('.root\r\n\r\n\r\n{}\n')).to.equal('.root {}\n');
    });

    it('empty rule should have no spaces inside block', () => {
        expect(formatCSS('.root {   }\n')).to.equal('.root {}\n');
        expect(formatCSS('.root {\n\n\n}\n')).to.equal('.root {}\n');
    });

    it('rule with comment before brace', () => {
        expect(formatCSS('.root/*  */{}\n')).to.equal('.root /*  */ {}\n');
        expect(formatCSS('.root /*  */ {}\n')).to.equal('.root /*  */ {}\n');
        expect(formatCSS('.root   /*  */   {}\n')).to.equal('.root /*  */ {}\n');
        expect(formatCSS('.root   /*  */ /*  */  /*  */   {}\n')).to.equal(
            '.root /*  */ /*  */ /*  */ {}\n'
        );
        expect(formatCSS('.root   /*  */\n/*  */\n/*  */   {}\n')).to.equal(
            '.root /*  */ /*  */ /*  */ {}\n'
        );
        expect(formatCSS('.root   /*  */\r\n/*  */\r\n/*  */   {}\n')).to.equal(
            '.root /*  */ /*  */ /*  */ {}\n'
        );
    });

    it('multiple selectors are separated with one comma and space between each selector', () => {
        expect(formatCSS('h1,h2{}\n')).to.equal('h1, h2 {}\n');
    });

    it('multiple selectors sorted by length short to long', () => {
        expect(formatCSS('ccc,bb,a{}\n')).to.equal('a, bb, ccc {}\n');
    });

    it('new line between long selector', () => {
        expect(
            formatCSS(
                'yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy,xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx{}\n'
            )
        ).to.equal(
            'yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy,\nxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx {}\n'
        );
    });

    it('format groups that contains same amount of newlines should stay grouped', () => {
        const res = `:global(p), :global(a), :global(q), :global(s), :global(b),
:global(u), :global(i), :global(h1), :global(h2), :global(h3),
:global(h4), :global(h5), :global(h6), :global(em), :global(tt),
:global(dl), :global(dt), :global(dd), :global(ol), :global(ul),
:global(li), :global(tr), :global(th), :global(td), :global(div),
:global(pre), :global(big), :global(del), :global(dfn), :global(img),
:global(ins), :global(kbd), :global(sub), :global(sup), :global(var),
:global(nav), :global(html), :global(body), :global(span),
:global(abbr), :global(cite), :global(code), :global(samp),
:global(form), :global(menu), :global(ruby), :global(time),
:global(mark), :global(small), :global(label), :global(table),
:global(tbody), :global(tfoot), :global(thead), :global(aside),
:global(embed), :global(audio), :global(video), :global(applet),
:global(object), :global(iframe), :global(strike), :global(strong),
:global(center), :global(legend), :global(canvas), :global(figure),
:global(footer), :global(header), :global(hgroup), :global(output),
:global(acronym), :global(address), :global(caption), :global(article),
:global(details), :global(section), :global(summary), :global(fieldset),
:global(blockquote), :global(figcaption) {}
`;
        expect(
            formatCSS(
                `:global(html), :global(body), :global(div), :global(span), :global(applet), :global(object), :global(iframe), :global(h1), :global(h2), :global(h3), :global(h4), :global(h5), :global(h6), :global(p), :global(blockquote), :global(pre), :global(a), :global(abbr), :global(acronym), :global(address), :global(big), :global(cite), :global(code), :global(del), :global(dfn), :global(em), :global(img), :global(ins), :global(kbd), :global(q), :global(s), :global(samp), :global(small), :global(strike), :global(strong), :global(sub), :global(sup), :global(tt), :global(var), :global(b), :global(u), :global(i), :global(center), :global(dl), :global(dt), :global(dd), :global(ol), :global(ul), :global(li), :global(fieldset), :global(form), :global(label), :global(legend), :global(table), :global(caption), :global(tbody), :global(tfoot), :global(thead), :global(tr), :global(th), :global(td), :global(article), :global(aside), :global(canvas), :global(details), :global(embed), :global(figure), :global(figcaption), :global(footer), :global(header), :global(hgroup), :global(menu), :global(nav), :global(output), :global(ruby), :global(section), :global(summary), :global(time), :global(mark), :global(audio), :global(video) {\n}`
            )
        ).to.equal(res);
        expect(formatCSS(res)).to.equal(res);
    });

    it('multiple selectors should be sorted by length and grouped until reach max length each group has its own line', () => {
        expect(
            formatCSS(
                'x,xx,xxx,xxxx,xxxxx,xxxxxx,xxxxxxx,xxxxxxxx,xxxxxxxxx,xxxxxxxxxx,xxxxxxxxxxx,xxxxxxxxxxxx,xxxxxxxxxxxxx,xxxxxxxxxxxxxx,xxxxxxxxxxxxxxx,xxxxxxxxxxxxxxxx {   }\n'
            )
        ).to.equal(
            'x, xx, xxx, xxxx, xxxxx, xxxxxx, xxxxxxx, xxxxxxxx, xxxxxxxxx, xxxxxxxxxx,\nxxxxxxxxxxx, xxxxxxxxxxxx, xxxxxxxxxxxxx, xxxxxxxxxxxxxx,\nxxxxxxxxxxxxxxx, xxxxxxxxxxxxxxxx {}\n'
        );
    });

    it('selectors that included newline should preserve the newline', () => {
        expect(formatCSS('.root,\n.part {}\n')).to.equal('.root,\n.part {}\n');
    });

    it('rule with declarations should have newline after open block declaration should be indented once then new line before closing block closing block should start at rule selector start', () => {
        expect(formatCSS('.root {color: red;}\n')).to.equal('.root {\n    color: red;\n}\n');
    });

    it('multiple declarations separated by one new line each indented to same level', () => {
        expect(formatCSS('.root {color: red;background: green;}\n')).to.equal(
            '.root {\n    color: red;\n    background: green;\n}\n'
        );
        expect(
            formatCSS('.root {color: red;\n\n\nbackground: green;}\n'),
            'many lines separation'
        ).to.equal('.root {\n    color: red;\n    background: green;\n}\n');
    });
});

describe('Formatting - Decl', () => {
    it('add semicolon on last declaration', () => {
        expect(formatCSS('.root {\n    color: red}\n')).to.equal('.root {\n    color: red;\n}\n');
        expect(formatCSS('.root {\n    color: red/*!*/}\n'), 'comment variant').to.equal(
            '.root {\n    color: red;/*!*/\n}\n'
        );
    });

    it('one space after colon', () => {
        expect(formatCSS('.root {color:\n\n\nred;}\n')).to.equal('.root {\n    color: red;\n}\n');
        expect(formatCSS('.root {color:red;}\n')).to.equal('.root {\n    color: red;\n}\n');
    });

    it('no space before colon', () => {
        expect(formatCSS('.root {color   : red;}\n')).to.equal('.root {\n    color: red;\n}\n');
        expect(formatCSS('.root {color\n\n\n: red;}\n')).to.equal('.root {\n    color: red;\n}\n');
    });

    it('no space before closing semi colon', () => {
        expect(formatCSS('.root {\n    color: red    ;}\n')).to.equal(
            '.root {\n    color: red;\n}\n'
        );
    });

    it('keep only one space between tokens in custom properties', () => {
        expect(formatCSS('.root {\n    --x:   "a" 1  2 "b"  ;\n}\n')).to.equal(
            '.root {\n    --x: "a" 1 2 "b" ;\n}\n'
        );
    });

    it('keep broken custom properties', () => {
        expect(formatCSS('.root {--x:;}')).to.equal(`.root {\n    --x:;\n}\n`);
    });

    it.skip('Broken parsing', () => {
        expect(formatCSS('.root {--x: /*a*/}')).to.equal(``);
    });

    it('keep spaces in side strings', () => {
        expect(formatCSS('.root {--x:"  ";}')).to.equal(`.root {\n    --x:"  ";\n}\n`);
    });

    it('css custom property with comments in raws preserve comments', () => {
        expect(formatCSS('.root {--x/*a*/:/*b*/1;}')).to.equal(
            `.root {\n    --x/*a*/:/*b*/1;\n}\n`
        );
    });

    it('css custom property with comments and spaces in raws preserve comments and space after colon comments', () => {
        // THIS TEST IS BASED ON HOW BROKEN POSTCSS PARSE CSS PROPERTY
        expect(formatCSS('.root {--x /*a*/ :   /*b*/   ;}')).to.equal(
            `.root {\n    --x/*a*/: /*b*/ ;\n}\n`
        );
    });

    it('remove css variable space after decl props and place in new line', () => {
        expect(formatCSS('.root {--x    : "a" 1 2 "b";\n}\n')).to.equal(
            '.root {\n    --x: "a" 1 2 "b";\n}\n'
        );
    });

    it('multiple values are separated with one comma and space between each value (short line)', () => {
        expect(formatCSS('.root {\n    font-family: A,B,C;\n}\n')).to.equal(
            '.root {\n    font-family: A, B, C;\n}\n'
        );
        expect(formatCSS('.root {\n    font-family: A, B, C;\n}\n')).to.equal(
            '.root {\n    font-family: A, B, C;\n}\n'
        );
        expect(formatCSS('.root {\n    font-family: A,   B   ,   C;\n}\n')).to.equal(
            '.root {\n    font-family: A, B, C;\n}\n'
        );
    });

    it('multiple long values each placed in a new line and preserved original indent', () => {
        const declWithIndent = `    font-family: `;
        const declIndent = declWithIndent.length;
        expect(
            formatCSS(
                `.root {\n${declWithIndent}${'A'.repeat(50)},${'B'.repeat(50)},${'C'.repeat(
                    50
                )};\n}\n`
            )
        ).to.equal(
            `.root {\n    font-family: ${'A'.repeat(50)},\n${' '.repeat(declIndent)}${'B'.repeat(
                50
            )},\n${' '.repeat(declIndent)}${'C'.repeat(50)};\n}\n`
        );
        // with spaces after decl
        expect(
            formatCSS(
                `.root {\n${declWithIndent}${'    '}${'A'.repeat(50)},${'B'.repeat(
                    50
                )},${'C'.repeat(50)};\n}\n`
            )
        ).to.equal(
            `.root {\n    font-family: ${'A'.repeat(50)},\n${' '.repeat(declIndent)}${'B'.repeat(
                50
            )},\n${' '.repeat(declIndent)}${'C'.repeat(50)};\n}\n`
        );
    });

    it('multiple values are grouped. each group is in new line and preserved original indent', () => {
        const declWithIndent = `    font-family: `;
        const declIndent = declWithIndent.length;
        expect(
            formatCSS(
                `.root {\n${declWithIndent}${'1,2,3,'}${'A'.repeat(50)},${'B'.repeat(
                    50
                )},${'C'.repeat(50)};\n}\n`
            )
        ).to.equal(
            `.root {\n    font-family: ${'1, 2, 3, '}${'A'.repeat(50)},\n${' '.repeat(
                declIndent
            )}${'B'.repeat(50)},\n${' '.repeat(declIndent)}${'C'.repeat(50)};\n}\n`
        );
    });

    it('preserve new line after colon and indent value +1', () => {
        expect(formatCSS('\ngrid-template-areas:\n    "A B"\n    "A B";\n')).to.equal(
            '\ngrid-template-areas:\n    "A B"\n    "A B";\n'
        );
        expect(formatCSS(`\ngrid-template-areas:${'    '}\n    "A B"\n    "A B";\n`)).to.equal(
            '\ngrid-template-areas:\n    "A B"\n    "A B";\n'
        );
    });

    it('re-indent values contains newlines', () => {
        expect(formatCSS(`\ngrid-template-areas:\n        "A B"\n        "A B";\n`)).to.equal(
            '\ngrid-template-areas:\n    "A B"\n    "A B";\n'
        );
    });

    it('preserve comments in values', () => {
        expect(formatCSS('left: calc(1em * 1.414 /* ~sqrt(2) */);')).to.equal(
            '\nleft: calc(1em * 1.414 /* ~sqrt(2) */);\n'
        );
    });

    it('comments before and after colon', () => {
        expect(formatCSS('.root {color /*!*/ : /*!*/ red;}\n')).to.equal(
            '.root {\n    color/*!*/: /*!*/red;\n}\n'
        );
    });

    it('comments with newline after colon and value does not contains newline with add single space', () => {
        expect(formatCSS('.root {color /*!*/ :\n/*!*/ red;}\n')).to.equal(
            '.root {\n    color/*!*/: /*!*/red;\n}\n'
        );
    });

    it('multiline value and no newline after colon', () => {
        expect(formatCSS('.root {border:1px \n solid \n red;}\n')).to.equal(
            `.root {\n    border: 1px\n${' '.repeat(12)}solid\n${' '.repeat(12)}red;\n}\n`
        );
    });
    it('value with newlines each line get same indent', () => {
        const indent = ' '.repeat('    box-shadow: '.length);

        expect(
            formatCSS(`.root {box-shadow:0px\n0px\n0px\nblack, 1px\n1px\n1px\nblack;\n}\n`)
        ).to.equal(
            `.root {\n    box-shadow: 0px\n${indent}0px\n${indent}0px\n${indent}black,\n${indent}1px\n${indent}1px\n${indent}1px\n${indent}black;\n}\n`
        );
    });
    it('value with newlines and newline after colon each line get base indent', () => {
        const indent = ' '.repeat(8);
        expect(
            formatCSS('.root {box-shadow:\n0px\n0px\n0px\nblack, 1px\n1px\n1px\nblack;\n}\n')
        ).to.equal(
            `.root {\n    box-shadow:\n${indent}0px\n${indent}0px\n${indent}0px\n${indent}black,\n${indent}1px\n${indent}1px\n${indent}1px\n${indent}black;\n}\n`
        );
    });
});

describe('Formatting - AtRule', () => {
    it('no children only atRule (no semi colon)', () => {
        expect(formatCSS(`@namespace "abc"`)).to.equal(`@namespace "abc"\n`);
    });
    it('no children only atRule', () => {
        expect(formatCSS(`@namespace "abc";`)).to.equal(`@namespace "abc";\n`);
    });
    it('atRule with decelerations (no params)', () => {
        expect(formatCSS(`@font-face { font-family: "Open Sans";}`)).to.equal(
            `@font-face {\n    font-family: "Open Sans";\n}\n`
        );
    });
    it('one space after name', () => {
        expect(formatCSS(`@media${'    '}screen {}\n`)).to.equal(`@media screen {}\n`);
    });
    it('one space after params', () => {
        expect(formatCSS(`@media screen${'    '}{}\n`)).to.equal(`@media screen {}\n`);
    });
    it('format children with indent no separation before first rule', () => {
        expect(formatCSS('@media screen {.root {color: red;}}\n')).to.equal(
            '@media screen {\n    .root {\n        color: red;\n    }\n}\n'
        );
        expect(formatCSS('@media screen {\n\n\n\n.root {color: red;}}\n')).to.equal(
            '@media screen {\n    .root {\n        color: red;\n    }\n}\n'
        );
    });
    it('selector group indentation', () => {
        expect(formatCSS(`@media screen {.${'x'.repeat(50)},.${'y'.repeat(50)} {}}\n`)).to.equal(
            `@media screen {\n    .${'x'.repeat(50)},\n    .${'y'.repeat(50)} {}\n}\n`
        );
    });

    it('rule before at rule with no children should have newline separation', () => {
        expect(formatCSS(`.root {}\n@namespace "x";`)).to.equal(`.root {}\n\n@namespace "x";\n`);
        expect(formatCSS(`.root {}\n\n@namespace "x";`)).to.equal(`.root {}\n\n@namespace "x";\n`);
        expect(formatCSS(`.root {}\n\n\n\n\n@namespace "x";`)).to.equal(`.root {}\n\n@namespace "x";\n`);
    });
});

// xdescribe('Formatting From cases', () => {
//     const casesDir = join(
//         require.resolve('@stylable/code-formatter/package.json'),
//         '../test',
//         'cases'
//     );
//     const struct = loadDirStructureSync(casesDir);

//     forEachTestCase(struct, ({ parent, input, out }: any) => {
//         it(`${join(parent, input.name)} -> ${join(parent, out.name)}`, () => {
//             expect(formatCSS(input.value)).to.equal(out.value);
//         });
//     });
// });
