import { expect } from 'chai';
import { parse } from 'postcss';
import { Diagnostics, ensureStylableImports } from '@stylable/core';
import { ensureImportsMessages } from '@stylable/core/dist/helpers/import';

describe('ensureStylableImports', () => {
    describe('all modes', () => {
        it('should not modify when no importPatches provided', () => {
            const root = parse(`
                :import {-st-from: 'x'; -st-default: A }
            `);

            const diag = new Diagnostics();

            ensureStylableImports(root, [], { newImport: 'none' }, diag);
            ensureStylableImports(root, [], { newImport: ':import' }, diag);
            ensureStylableImports(root, [], { newImport: 'st-import' }, diag);

            const importNode = root.nodes[0];
            expect(diag.reports, 'No diagnostics').to.have.lengthOf(0);
            expect(importNode.toString()).to.equal(`:import {-st-from: 'x'; -st-default: A }`);
        });
    });

    describe('none mode', () => {
        it('should not add missing imports in none mode', () => {
            const root = parse(``);

            const diag = new Diagnostics();

            ensureStylableImports(
                root,
                [{ request: 'missing', defaultExport: 'Missing' }],
                { newImport: 'none' },
                diag
            );

            expect(diag.reports, 'diagnostics').to.have.lengthOf(1);
            expect(diag.reports[0].message).to.equal(
                ensureImportsMessages.PATCH_CONTAINS_NEW_IMPORT_IN_NEW_IMPORT_NONE_MODE()
            );
            expect(root.nodes, 'no imports added').to.have.lengthOf(0);
        });

        it('should add default', () => {
            const root = parse(`
                :import {-st-from: 'x'; }
            `);

            const diag = new Diagnostics();

            ensureStylableImports(
                root,
                [{ request: 'x', defaultExport: 'Test' }],
                { newImport: 'none' },
                diag
            );

            const importNode = root.nodes[0];
            expect(diag.reports, 'No diagnostics').to.have.lengthOf(0);
            expect(importNode.toString()).to.equal(`:import {-st-from: 'x';-st-default: Test; }`);
        });

        it('should add named import', () => {
            const root = parse(`
                :import {-st-from: 'x'; }
            `);

            const diag = new Diagnostics();

            ensureStylableImports(
                root,
                [{ request: 'x', named: { test: 'test' } }],
                { newImport: 'none' },
                diag
            );

            const importNode = root.nodes[0];
            expect(diag.reports, 'No diagnostics').to.have.lengthOf(0);
            expect(importNode.toString()).to.equal(`:import {-st-from: 'x';-st-named: test; }`);
        });

        it('should add keyframes import', () => {
            const root = parse(`
                :import {-st-from: 'x'; }
            `);

            const diag = new Diagnostics();

            ensureStylableImports(
                root,
                [{ request: 'x', keyframes: { test: 'test' } }],
                { newImport: 'none' },
                diag
            );

            const importNode = root.nodes[0];
            expect(diag.reports, 'No diagnostics').to.have.lengthOf(0);
            expect(importNode.toString()).to.equal(
                `:import {-st-from: 'x';-st-named: keyframes(test); }`
            );
        });

        it('should add named "as" import', () => {
            const root = parse(`
                :import {-st-from: 'x'; }
            `);

            const diag = new Diagnostics();

            ensureStylableImports(
                root,
                [{ request: 'x', named: { asTest: 'test' } }],
                { newImport: 'none' },
                diag
            );

            const importNode = root.nodes[0];
            expect(diag.reports, 'No diagnostics').to.have.lengthOf(0);
            expect(importNode.toString()).to.equal(
                `:import {-st-from: 'x';-st-named: test as asTest; }`
            );
        });

        it('should add keyframes "as" import', () => {
            const root = parse(`
                :import {-st-from: 'x'; }
            `);

            const diag = new Diagnostics();

            ensureStylableImports(
                root,
                [{ request: 'x', keyframes: { asTest: 'test' } }],
                { newImport: 'none' },
                diag
            );

            const importNode = root.nodes[0];
            expect(diag.reports, 'No diagnostics').to.have.lengthOf(0);
            expect(importNode.toString()).to.equal(
                `:import {-st-from: 'x';-st-named: keyframes(test as asTest); }`
            );
        });

        it('should add multiple named import', () => {
            const root = parse(`
                :import {-st-from: 'x'; }
            `);

            const diag = new Diagnostics();

            ensureStylableImports(
                root,
                [{ request: 'x', named: { test: 'test', test2: 'test2' } }],
                { newImport: 'none' },
                diag
            );

            const importNode = root.nodes[0];
            expect(diag.reports, 'No diagnostics').to.have.lengthOf(0);
            expect(importNode.toString()).to.equal(
                `:import {-st-from: 'x';-st-named: test, test2; }`
            );
        });

        it('should add named and default', () => {
            const root = parse(`
                :import {-st-from: 'x'; }
            `);

            const diag = new Diagnostics();

            ensureStylableImports(
                root,
                [{ request: 'x', named: { asTest: 'test' }, defaultExport: 'Test' }],
                { newImport: 'none' },
                diag
            );

            const importNode = root.nodes[0];
            expect(diag.reports, 'No diagnostics').to.have.lengthOf(0);
            expect(importNode.toString()).to.equal(
                `:import {-st-from: 'x';-st-default: Test;-st-named: test as asTest; }`
            );
        });

        it('should add to existing named', () => {
            const root = parse(`
                :import {-st-from: 'x';-st-named: a, b, c; }
            `);

            const diag = new Diagnostics();

            ensureStylableImports(
                root,
                [{ request: 'x', named: { d: 'd', e: 'e' } }],
                { newImport: 'none' },
                diag
            );

            const importNode = root.nodes[0];
            expect(diag.reports, 'No diagnostics').to.have.lengthOf(0);
            expect(importNode.toString()).to.equal(
                `:import {-st-from: 'x';-st-named: a, b, c, d, e; }`
            );
        });

        it('should keep existing matching imports', () => {
            const root = parse(`
                :import {-st-from: 'x';-st-default: A;-st-named: a,b; }
            `);

            const diag = new Diagnostics();

            ensureStylableImports(
                root,
                [{ request: 'x', named: { a: 'a', b: 'b' }, defaultExport: 'A' }],
                { newImport: 'none' },
                diag
            );

            const importNode = root.nodes[0];
            expect(diag.reports, 'No diagnostics').to.have.lengthOf(0);
            expect(importNode.toString()).to.equal(
                `:import {-st-from: 'x';-st-default: A;-st-named: a, b; }`
            );
        });

        it('should patch all on @st-import', () => {
            const root = parse(`
                @st-import "x";
            `);

            const diag = new Diagnostics();

            ensureStylableImports(
                root,
                [
                    {
                        request: 'x',
                        named: { asTest: 'test' },
                        keyframes: { asKf: 'kf' },
                        defaultExport: 'Test',
                    },
                ],
                { newImport: 'none' },
                diag
            );

            const importNode = root.nodes[0];
            expect(diag.reports, 'No diagnostics').to.have.lengthOf(0);
            expect(importNode.toString()).to.equal(
                `@st-import Test, [test as asTest, keyframes(kf as asKf)] from "x"`
            );
        });
    });

    describe(':import mode', () => {
        it('should generate imports with default', () => {
            const root = parse(``);

            const diag = new Diagnostics();

            ensureStylableImports(
                root,
                [{ request: 'test', defaultExport: 'Test' }],
                { newImport: ':import' },
                diag
            );

            const importNode = root.nodes[0];

            expect(diag.reports, 'No diagnostics').to.have.lengthOf(0);
            expect(oneSpace(importNode.toString())).to.equal(
                `:import { -st-from: "test"; -st-default: Test }`
            );
        });
        it('should generate imports with named', () => {
            const root = parse(``);

            const diag = new Diagnostics();

            ensureStylableImports(
                root,
                [{ request: 'test', named: { a: 'a', c: 'b' } }],
                { newImport: ':import' },
                diag
            );

            const importNode = root.nodes[0];

            expect(diag.reports, 'No diagnostics').to.have.lengthOf(0);
            expect(oneSpace(importNode.toString())).to.equal(
                `:import { -st-from: "test"; -st-named: a, b as c }`
            );
        });
        it('should generate imports with keyframes', () => {
            const root = parse(``);

            const diag = new Diagnostics();

            ensureStylableImports(
                root,
                [{ request: 'test', keyframes: { a: 'a', c: 'b' } }],
                { newImport: ':import' },
                diag
            );

            const importNode = root.nodes[0];

            expect(diag.reports, 'No diagnostics').to.have.lengthOf(0);
            expect(oneSpace(importNode.toString())).to.equal(
                `:import { -st-from: "test"; -st-named: keyframes(a, b as c) }`
            );
        });
        it('should generate imports with named and default and keyframes', () => {
            const root = parse(``);

            const diag = new Diagnostics();

            ensureStylableImports(
                root,
                [
                    {
                        request: 'test',
                        defaultExport: 'Test',
                        named: { a: 'a', c: 'b' },
                        keyframes: { a: 'a', c: 'b' },
                    },
                ],
                { newImport: ':import' },
                diag
            );

            const importNode = root.nodes[0];

            expect(diag.reports, 'No diagnostics').to.have.lengthOf(0);
            expect(oneSpace(importNode.toString())).to.equal(
                `:import { -st-from: "test"; -st-default: Test; -st-named: a, b as c, keyframes(a, b as c) }`
            );
        });
    });

    describe('st-import mode', () => {
        it('should generate imports with default', () => {
            const root = parse(``);

            const diag = new Diagnostics();

            ensureStylableImports(
                root,
                [{ request: 'test', defaultExport: 'Test' }],
                { newImport: 'st-import' },
                diag
            );

            const importNode = root.nodes[0];

            expect(diag.reports, 'No diagnostics').to.have.lengthOf(0);
            expect(oneSpace(importNode.toString())).to.equal(`@st-import Test from "test"`);
        });
        it('should generate imports with named', () => {
            const root = parse(``);

            const diag = new Diagnostics();

            ensureStylableImports(
                root,
                [{ request: 'test', named: { a: 'a', c: 'b' } }],
                { newImport: 'st-import' },
                diag
            );

            const importNode = root.nodes[0];

            expect(diag.reports, 'No diagnostics').to.have.lengthOf(0);
            expect(oneSpace(importNode.toString())).to.equal(`@st-import [a, b as c] from "test"`);
        });
        it('should generate imports with keyframes', () => {
            const root = parse(``);

            const diag = new Diagnostics();

            ensureStylableImports(
                root,
                [{ request: 'test', keyframes: { a: 'a', c: 'b' } }],
                { newImport: 'st-import' },
                diag
            );

            const importNode = root.nodes[0];

            expect(diag.reports, 'No diagnostics').to.have.lengthOf(0);
            expect(oneSpace(importNode.toString())).to.equal(
                `@st-import [keyframes(a, b as c)] from "test"`
            );
        });
        it('should generate imports with named and default and keyframes', () => {
            const root = parse(``);

            const diag = new Diagnostics();

            ensureStylableImports(
                root,
                [
                    {
                        request: 'test',
                        defaultExport: 'Test',
                        named: { a: 'a', c: 'b' },
                        keyframes: { a: 'a', c: 'b' },
                    },
                ],
                { newImport: 'st-import' },
                diag
            );

            const importNode = root.nodes[0];

            expect(diag.reports, 'No diagnostics').to.have.lengthOf(0);
            expect(oneSpace(importNode.toString())).to.equal(
                `@st-import Test, [a, b as c, keyframes(a, b as c)] from "test"`
            );
        });
    });

    describe('edges', () => {
        it('should only process patch on first matched import', () => {
            const root = parse(`
                :import {-st-from: 'x'; }
                :import {-st-from: 'x'; }
            `);

            const diag = new Diagnostics();

            ensureStylableImports(
                root,
                [{ request: 'x', named: { test: 'test' } }],
                { newImport: 'none' },
                diag
            );

            expect(root.nodes[0].toString()).to.equal(`:import {-st-from: 'x';-st-named: test; }`);
            expect(root.nodes[1].toString()).to.equal(`:import {-st-from: 'x'; }`);
            expect(diag.reports, 'No diagnostics').to.have.lengthOf(0);
        });
        it('should report collision diagnostics for defaultExport and not patch', () => {
            const root = parse(`@st-import Test from "x";`);

            const { diagnostics } = ensureStylableImports(
                root,
                [{ request: 'x', defaultExport: 'Y' }],
                { newImport: 'none' }
            );
            const importNode = root.nodes[0];

            expect(importNode.toString(), 'no change').to.equal(`@st-import Test from "x"`);
            expect(diagnostics.reports, 'diagnostics').to.have.lengthOf(1);
            expect(diagnostics.reports[0].message).to.equal(
                ensureImportsMessages.ATTEMPT_OVERRIDE_SYMBOL('default', 'Test', 'Y')
            );
        });
        it('should report collision diagnostics for named and not patch', () => {
            const root = parse(`@st-import [Y] from "x";`);

            const { diagnostics } = ensureStylableImports(
                root,
                [{ request: 'x', named: { Y: 'X' } }],
                { newImport: 'none' }
            );
            const importNode = root.nodes[0];

            expect(importNode.toString(), 'no change').to.equal(`@st-import [Y] from "x"`);
            expect(diagnostics.reports, 'diagnostics').to.have.lengthOf(1);
            expect(diagnostics.reports[0].message).to.equal(
                ensureImportsMessages.ATTEMPT_OVERRIDE_SYMBOL('named', 'Y', 'X as Y')
            );
        });
        it('should report collision diagnostics for named "as" with "as" (no patch)', () => {
            const root = parse(`@st-import [A as Y] from "x";`);

            const { diagnostics } = ensureStylableImports(
                root,
                [{ request: 'x', named: { Y: 'X' } }],
                { newImport: 'none' }
            );
            const importNode = root.nodes[0];

            expect(importNode.toString(), 'no change').to.equal(`@st-import [A as Y] from "x"`);
            expect(diagnostics.reports, 'diagnostics').to.have.lengthOf(1);
            expect(diagnostics.reports[0].message).to.equal(
                ensureImportsMessages.ATTEMPT_OVERRIDE_SYMBOL('named', 'A as Y', 'X as Y')
            );
        });
        it('should report collision diagnostics for named "as" (no patch)', () => {
            const root = parse(`@st-import [A as Y] from "x";`);

            const { diagnostics } = ensureStylableImports(
                root,
                [{ request: 'x', named: { Y: 'Y' } }],
                { newImport: 'none' }
            );
            const importNode = root.nodes[0];

            expect(importNode.toString(), 'no change').to.equal(`@st-import [A as Y] from "x"`);
            expect(diagnostics.reports, 'diagnostics').to.have.lengthOf(1);
            expect(diagnostics.reports[0].message).to.equal(
                ensureImportsMessages.ATTEMPT_OVERRIDE_SYMBOL('named', 'A as Y', 'Y')
            );
        });
    });
});

function oneSpace(str: string) {
    return str.replace(/\s+/gm, ' ');
}
