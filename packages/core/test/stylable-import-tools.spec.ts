import { expect } from 'chai';
import { parse } from 'postcss';
import { Diagnostics, ensureStylableImports } from '@stylable/core';

describe('ensureStylableImports', () => {
    describe('all modes', () => {
        it('should not modify when no importPatches provided', () => {
            const root = parse(`
                :import {-st-from: 'x'; -st-default: A }
            `);

            const diag = new Diagnostics();

            ensureStylableImports(root, [], { mode: 'patch-only' }, diag);
            ensureStylableImports(root, [], { mode: ':import' }, diag);
            ensureStylableImports(root, [], { mode: 'st-import' }, diag);

            const importNode = root.nodes[0];
            expect(diag.reports, 'No diagnostics').to.have.lengthOf(0);
            expect(importNode.toString()).to.equal(`:import {-st-from: 'x'; -st-default: A }`);
        });
    });

    describe('patch-only mode', () => {
        it('should not add missing imports in patch-only mode', () => {
            const root = parse(``);

            const diag = new Diagnostics();

            ensureStylableImports(
                root,
                [{ request: 'missing', defaultExport: 'Missing' }],
                { mode: 'patch-only' },
                diag
            );

            expect(diag.reports, 'No diagnostics').to.have.lengthOf(0);
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
                { mode: 'patch-only' },
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
                { mode: 'patch-only' },
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
                { mode: 'patch-only' },
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
                { mode: 'patch-only' },
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
                { mode: 'patch-only' },
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
                { mode: 'patch-only' },
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
                { mode: 'patch-only' },
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
                { mode: 'patch-only' },
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
                { mode: 'patch-only' },
                diag
            );

            const importNode = root.nodes[0];
            expect(diag.reports, 'No diagnostics').to.have.lengthOf(0);
            expect(importNode.toString()).to.equal(
                `:import {-st-from: 'x';-st-default: A;-st-named: a, b; }`
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
                { mode: ':import' },
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
                { mode: ':import' },
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
                { mode: ':import' },
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
                { mode: ':import' },
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
                { mode: 'st-import' },
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
                { mode: 'st-import' },
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
                { mode: 'st-import' },
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
                { mode: 'st-import' },
                diag
            );

            const importNode = root.nodes[0];

            expect(diag.reports, 'No diagnostics').to.have.lengthOf(0);
            expect(oneSpace(importNode.toString())).to.equal(
                `@st-import Test, [a, b as c, keyframes(a, b as c)] from "test"`
            );
        });
    });
});

function oneSpace(str: string) {
    return str.replace(/\s+/gm, ' ');
}
