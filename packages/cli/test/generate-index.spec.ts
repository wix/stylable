import { expect } from 'chai';
import { Stylable } from '@stylable/core';
import { build } from '@stylable/cli';
import { createMemoryFs } from '@file-services/memory';
import { DiagnosticsManager } from '@stylable/cli/dist/diagnostics-manager';

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

        const stylable = new Stylable({
            projectRoot: '/',
            fileSystem: fs,
            requireModule: () => ({}),
        });

        await build(
            {
                outDir: '.',
                srcDir: '.',
                indexFile: 'index.st.css',
            },
            {
                fs,
                stylable,
                rootDir: '/',
                projectRoot: '/',
                log,
            }
        );

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
    it('should create index file importing all matched stylesheets in outDir (outputSources)', async () => {
        const fs = createMemoryFs({
            src: {
                '/compA.st.css': `
               .a{}
            `,
                '/a/b/comp-B.st.css': `
               .b{}
            `,
            },
        });

        const stylable = new Stylable({
            projectRoot: '/',
            fileSystem: fs,
            requireModule: () => ({}),
        });

        await build(
            {
                outDir: './dist',
                srcDir: './src',
                indexFile: 'index.st.css',
                outputSources: true,
            },
            {
                fs,
                stylable,
                rootDir: '/',
                projectRoot: '/',
                log,
            }
        );

        const res = fs.readFileSync('./dist/index.st.css').toString();

        expect(res.trim()).to.equal(
            [
                ':import {-st-from: "./compA.st.css";-st-default:CompA;}',
                '.root CompA{}',
                ':import {-st-from: "./a/b/comp-B.st.css";-st-default:CompB;}',
                '.root CompB{}',
            ].join('\n')
        );
    });

    it('should create index file importing all matched stylesheets in srcDir when has output cjs files', async () => {
        const fs = createMemoryFs({
            src: {
                '/compA.st.css': `
                .a{}
                `,
                '/a/b/comp-B.st.css': `
                .b{}
                `,
            },
        });

        const stylable = new Stylable({
            projectRoot: '/',
            fileSystem: fs,
            requireModule: () => ({}),
        });

        await build(
            {
                outDir: '.',
                srcDir: '.',
                indexFile: './dist/index.st.css',
                cjs: true,
            },
            {
                fs,
                stylable,
                rootDir: '/',
                projectRoot: '/',
                log,
            }
        );

        const res = fs.readFileSync('/dist/index.st.css').toString();

        expect(res.trim()).to.equal(
            [
                ':import {-st-from: "../src/compA.st.css";-st-default:CompA;}',
                '.root CompA{}',
                ':import {-st-from: "../src/a/b/comp-B.st.css";-st-default:CompB;}',
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

        const stylable = new Stylable({
            projectRoot: '/',
            fileSystem: fs,
            requireModule: () => ({}),
        });

        await build(
            {
                outDir: '.',
                srcDir: '.',
                indexFile: 'index.st.css',
            },
            {
                fs,
                stylable,
                rootDir: '/',
                projectRoot: '/',
                log,
            }
        );

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

        const stylable = new Stylable({
            projectRoot: '/',
            fileSystem: fs,
            requireModule: () => ({}),
        });

        await build(
            {
                outDir: '.',
                srcDir: '.',
                indexFile: 'index.st.css',
                IndexGenerator: require('./fixtures/test-generator').Generator,
            },
            {
                fs,
                stylable,
                rootDir: '/',
                projectRoot: '/',
                log,
            }
        );

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
    it('should create index file when srcDir is parent directory of outDir', async () => {
        const fs = createMemoryFs({
            dist: {
                'c/compA.st.css': `
               .a{}
            `,
                '/a/b/comp-B.st.css': `
               .b{}
            `,
            },
        });

        const stylable = new Stylable({
            projectRoot: '/',
            fileSystem: fs,
            requireModule: () => ({}),
        });

        await build(
            {
                outDir: '.',
                srcDir: './dist',
                indexFile: 'index.st.css',
            },
            {
                fs,
                stylable,
                rootDir: '/',
                projectRoot: '/',
                log,
            }
        );

        expect(fs.existsSync('/index.st.css'), 'index is not generated').to.eql(true);

        const res = fs.readFileSync('/index.st.css').toString();

        expect(res.trim()).to.equal(
            [
                ':import {-st-from: "./dist/c/compA.st.css";-st-default:CompA;}',
                '.root CompA{}',
                ':import {-st-from: "./dist/a/b/comp-B.st.css";-st-default:CompB;}',
                '.root CompB{}',
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

        const stylable = new Stylable({
            projectRoot: '/',
            fileSystem: fs,
            requireModule: () => ({}),
        });

        await build(
            {
                outDir: '.',
                srcDir: '.',
                indexFile: 'index.st.css',
                IndexGenerator: require('./fixtures/test-generator').Generator,
            },
            {
                fs,
                stylable,
                rootDir: '/',
                projectRoot: '/',
                log,
            }
        );

        const res = fs.readFileSync('/index.st.css').toString();

        expect(res.trim()).to.equal(
            ':import {-st-from: "./comp-A.st.css";-st-default:Style0;}\n.root Style0{}'
        );
    });
    it('should create index file using a custom generator with named exports generation and @st-namespace', async () => {
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

        const stylable = new Stylable({
            projectRoot: '/',
            fileSystem: fs,
            requireModule: () => ({}),
        });

        await build(
            {
                outDir: '.',
                srcDir: '.',
                indexFile: 'index.st.css',
                IndexGenerator: require('./fixtures/named-exports-generator').Generator,
            },
            {
                fs,
                stylable,
                rootDir: '/',
                projectRoot: '/',
                log,
            }
        );

        const res = fs.readFileSync('/index.st.css').toString();

        expect(res.trim()).to.equal(
            [
                '@st-namespace "INDEX";',
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

        const stylable = new Stylable({
            projectRoot: '/',
            fileSystem: fs,
            requireModule: () => ({}),
        });
        await build(
            {
                outDir: './some-dir/other-dir/',
                srcDir: '.',
                indexFile: 'index.st.css',
            },
            {
                fs,
                stylable,
                rootDir: '/',
                projectRoot: '/',
                log,
            }
        );

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

        const stylable = new Stylable({
            projectRoot: '/',
            fileSystem: fs,
            requireModule: () => ({}),
        });
        const diagnosticsManager = new DiagnosticsManager();

        await build(
            {
                outDir: '.',
                srcDir: '.',
                indexFile: 'index.st.css',
                diagnostics: true,
            },
            {
                fs,
                stylable,
                rootDir: '/',
                projectRoot: '/',
                log,
                diagnosticsManager,
            }
        );

        expect(diagnosticsManager.get('/', '/a/comp.st.css')?.diagnostics[0].message).to.equal(
            `Name Collision Error:\nexport symbol Comp from ${'/a/comp.st.css'} is already used by ${'/comp.st.css'}`
        );
    });
});
