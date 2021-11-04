import { expect } from 'chai';
import { Stylable } from '@stylable/core';
import { build } from '@stylable/cli';
import { createMemoryFs } from '@file-services/memory';

const log = () => {
    /**/
};

describe('build index', () => {
    it('should create index file importing all matched stylesheets in srcDir', async () => {
        const fs = createMemoryFs({
            '/compA.st.css': `
               .a{}
            `,
            '/a/b/comp-B.st.css': `
               .b{}
            `,
        });

        const stylable = new Stylable('/', fs, () => ({}));

        await build({
            extension: '.st.css',
            fs,
            stylable,
            outDir: '.',
            srcDir: '.',
            indexFile: 'index.st.css',
            rootDir: '/',
            log,
        });

        const res = fs.readFileSync('/index.st.css').toString();

        expect(res.trim()).to.equal(
            [
                ':import {-st-from: "./compA.st.css";-st-default:CompA;}',
                '.root CompA{}',
                ':import {-st-from: "./a/b/comp-B.st.css";-st-default:CompB;}',
                '.root CompB{}',
            ].join('\n')
        );
    });
    it('should create index file using a the default generator', async () => {
        const fs = createMemoryFs({
            '/comp-A.st.css': `
               .a{}
            `,
            '/b/1-some-comp-B-.st.css': `
               .b{}
            `,
        });

        const stylable = new Stylable('/', fs, () => ({}));

        await build({
            extension: '.st.css',
            fs,
            stylable,
            outDir: '.',
            srcDir: '.',
            indexFile: 'index.st.css',
            rootDir: '/',
            log,
        });

        const res = fs.readFileSync('/index.st.css').toString();

        expect(res.trim()).to.equal(
            [
                ':import {-st-from: "./comp-A.st.css";-st-default:CompA;}',
                '.root CompA{}',
                ':import {-st-from: "./b/1-some-comp-B-.st.css";-st-default:SomeCompB;}',
                '.root SomeCompB{}',
            ].join('\n')
        );
    });
    it('should create index file using a custom generator', async () => {
        const fs = createMemoryFs({
            '/comp-A.st.css': `
               .a{}
            `,
            '/b/1-some-comp-B-.st.css': `
               .b{}
            `,
        });

        const stylable = new Stylable('/', fs, () => ({}));

        await build({
            extension: '.st.css',
            fs,
            stylable,
            outDir: '.',
            srcDir: '.',
            indexFile: 'index.st.css',
            rootDir: '/',
            log,
            Generator: require('./fixtures/test-generator').Generator,
        });

        const res = fs.readFileSync('/index.st.css').toString();

        expect(res.trim()).to.equal(
            [
                ':import {-st-from: "./comp-A.st.css";-st-default:Style0;}',
                '.root Style0{}',
                ':import {-st-from: "./b/1-some-comp-B-.st.css";-st-default:Style1;}',
                '.root Style1{}',
            ].join('\n')
        );
    });

    it('custom generator is able to filter files from the index', async () => {
        const fs = createMemoryFs({
            '/comp-A.st.css': `
               .a{}
            `,
            '/b/FILTER-ME.st.css': `
               .b{}
            `,
        });

        const stylable = new Stylable('/', fs, () => ({}));

        await build({
            extension: '.st.css',
            fs,
            stylable,
            outDir: '.',
            srcDir: '.',
            indexFile: 'index.st.css',
            rootDir: '/',
            log,
            Generator: require('./fixtures/test-generator').Generator,
        });

        const res = fs.readFileSync('/index.st.css').toString();

        expect(res.trim()).to.equal(
            ':import {-st-from: "./comp-A.st.css";-st-default:Style0;}\n.root Style0{}'
        );
    });

    it('should create index file using a custom generator with named exports generation and @namespace', async () => {
        const fs = createMemoryFs({
            '/comp-A.st.css': `
                :vars {
                    color1: red;
                }
                .a{
                    --color2: red;
                }
                @keyframes X {}
            `,
            '/b/1-some-comp-B-.st.css': `
               .b{}
            `,
        });

        const stylable = new Stylable('/', fs, () => ({}));

        await build({
            extension: '.st.css',
            fs,
            stylable,
            outDir: '.',
            srcDir: '.',
            indexFile: 'index.st.css',
            rootDir: '/',
            log,
            Generator: require('./fixtures/named-exports-generator').Generator,
        });

        const res = fs.readFileSync('/index.st.css').toString();

        expect(res.trim()).to.equal(
            [
                '@namespace "INDEX";',
                ':import {-st-from: "./comp-A.st.css";-st-default:CompA;-st-named: a as CompA__a, color1 as CompA__color1, --color2 as --CompA__color2, keyframes(X as CompA__X);}',
                '.root CompA{}',
                '.root .CompA__a{}',
                ':import {-st-from: "./b/1-some-comp-B-.st.css";-st-default:SomeCompB;-st-named: b as SomeCompB__b;}',
                '.root SomeCompB{}',
                '.root .SomeCompB__b{}',
            ].join('\n')
        );
    });

    it('should create non-existing folders in path to the generated indexFile', async () => {
        const fs = createMemoryFs({
            '/comp.st.css': `
               .a{}
            `,
        });

        const stylable = new Stylable('/', fs, () => ({}));
        await build({
            extension: '.st.css',
            fs,
            stylable,
            outDir: './some-dir/other-dir/',
            srcDir: '.',
            indexFile: 'index.st.css',
            rootDir: '/',
            log,
        });

        const res = fs.readFileSync('/some-dir/other-dir/index.st.css').toString();

        expect(res.trim()).to.equal(
            [':import {-st-from: "../../comp.st.css";-st-default:Comp;}', '.root Comp{}'].join('\n')
        );
    });
    it('should handle name collisions by failing', async () => {
        const fs = createMemoryFs({
            '/comp.st.css': `
               .a{}
            `,
            '/a/comp.st.css': `
               .b{}
            `,
        });
        let cliError: unknown;
        const stylable = new Stylable('/', fs, () => ({}));
        try {
            await build({
                extension: '.st.css',
                fs,
                stylable,
                outDir: '.',
                srcDir: '.',
                indexFile: 'index.st.css',
                rootDir: '/',
                log,
            });
        } catch (error) {
            cliError = error;
        }
        expect((cliError as Error)?.message).to.equal(
            `Name Collision Error:\nexport symbol Comp from ${'/a/comp.st.css'} is already used by ${'/comp.st.css'}`
        );
    });
});
