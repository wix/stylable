import { expect } from 'chai';
import { formatCSS } from '@stylable/code-formatter';

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
    it('one line after each rule', () => {
        expect(formatCSS('.root {}\n\n.root {}')).to.equal('.root {}\n.root {}\n');
    });
    it('no spaces before level 1 selector', () => {
        expect(formatCSS('   .root {}\n')).to.equal('.root {}\n');
    });
});

describe('Formatting - Rule', () => {
    it('one space after between selector and open block', () => {
        expect(formatCSS('.root{}\n')).to.equal('.root {}\n');
        expect(formatCSS('.root\n\n\n{}\n')).to.equal('.root {}\n');
    });

    it('empty rule should have no spaces inside block', () => {
        expect(formatCSS('.root {   }\n')).to.equal('.root {}\n');
        expect(formatCSS('.root {\n\n\n}\n')).to.equal('.root {}\n');
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

    it('multiple selectors should be sorted by length and grouped until reach max length each group has its own line', () => {
        expect(
            formatCSS(
                'x,xx,xxx,xxxx,xxxxx,xxxxxx,xxxxxxx,xxxxxxxx,xxxxxxxxx,xxxxxxxxxx,xxxxxxxxxxx,xxxxxxxxxxxx,xxxxxxxxxxxxx,xxxxxxxxxxxxxx,xxxxxxxxxxxxxxx,xxxxxxxxxxxxxxxx {   }\n'
            )
        ).to.equal(
            'x, xx, xxx, xxxx, xxxxx, xxxxxx, xxxxxxx, xxxxxxxx, xxxxxxxxx, xxxxxxxxxx,\nxxxxxxxxxxx, xxxxxxxxxxxx, xxxxxxxxxxxxx, xxxxxxxxxxxxxx,\nxxxxxxxxxxxxxxx, xxxxxxxxxxxxxxxx {}\n'
        );
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
        expect(formatCSS('.root {color:red;}\n')).to.equal('.root {\n    color: red;\n}\n');
        expect(formatCSS('.root {color:\n\n\nred;}\n')).to.equal('.root {\n    color: red;\n}\n');
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

    it("don't format css variable values", () => {
        expect(formatCSS('.root {\n    --x:   "a" 1 2 "b"  ;\n}\n')).to.equal(
            '.root {\n    --x:   "a" 1 2 "b"  ;\n}\n'
        );
    });

    it('remove css variable space after decl props and place in new line', () => {
        expect(formatCSS('.root {--x    :   "a" 1 2 "b"  ;\n}\n')).to.equal(
            '.root {\n    --x:   "a" 1 2 "b"  ;\n}\n'
        );
    });

    it('multiple values are separated with one comma and space between each value (short line)', () => {
        expect(formatCSS('.root {\n    font-family: A,B,C;\n}\n')).to.equal(
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
                `.root {\n${declWithIndent}${'1,2,3,'}${'A'.repeat(50)},${'B'.repeat(50)},${'C'.repeat(
                    50
                )};\n}\n`
            )
        ).to.equal(
            `.root {\n    font-family: ${'1, 2, 3, '}${'A'.repeat(50)},\n${' '.repeat(declIndent)}${'B'.repeat(
                50
            )},\n${' '.repeat(declIndent)}${'C'.repeat(50)};\n}\n`
        );
    });

    it.skip('comments before and after colon', () => {
        expect(formatCSS('.root {color/*!*/:/*!*/red;}\n')).to.equal('.root {\n?????\n}\n');
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
