import { expect } from 'chai';
import { resolve } from 'path';
import { Stylable, functionWarnings, processorWarnings, resolverWarnings } from '@stylable/core';
import { createMemoryFileSystemWithFiles as createFS } from '@stylable/e2e-test-kit';
import { build } from '@stylable/cli';

const log = () => {
    /**/
};

describe('build stand alone', () => {
    it('should create modules and copy source css files', () => {
        const fs = createFS({
            '/main.st.css': `
                :import{
                    -st-from: "./components/comp.st.css";
                    -st-default:Comp;
                }
                .gaga{
                    -st-extends:Comp;
                    color:blue;
                }
            `,
            '/components/comp.st.css': `
                .baga{
                    color:red;
                }
            `,
        });

        const stylable = new Stylable('/', fs, () => ({}));

        build({
            extension: '.st.css',
            fs,
            stylable,
            outDir: 'lib',
            srcDir: '.',
            rootDir: resolve('/'),
            log,
            moduleFormats: ['cjs'],
            outputSources: true,
        });

        [
            '/lib/main.st.css',
            '/lib/main.st.css.js',
            '/lib/components/comp.st.css',
            '/lib/components/comp.st.css.js',
        ].forEach((p) => {
            expect(fs.existsSync(resolve(p)), p).to.equal(true);
        });

        // assure no index file was generated by default
        expect(fs.existsSync(resolve('/lib/index.st.css')), '/lib/index.st.css').to.equal(false);
    });

    it('should use "useNamespaceReference" to maintain a single namespace for all builds using it', () => {
        const fs = createFS({
            '/src/main.st.css': `
                :import{
                    -st-from: "./components/comp.st.css";
                    -st-default:Comp;
                }
                .gaga{
                    -st-extends:Comp;
                    color:blue;
                }
            `,
            '/src/components/comp.st.css': `
                .baga{
                    color:red;
                }
            `,
        });

        const stylable = new Stylable('/', fs, () => ({}));

        build({
            extension: '.st.css',
            fs,
            stylable,
            rootDir: resolve('/'),
            srcDir: 'src',
            outDir: 'cjs',
            log,
            moduleFormats: ['cjs'],
            outputSources: true,
            useSourceNamespace: true,
        });

        [
            '/cjs/main.st.css',
            '/cjs/main.st.css.js',
            '/cjs/components/comp.st.css',
            '/cjs/components/comp.st.css.js',
        ].forEach((p) => {
            expect(fs.existsSync(resolve(p)), p).to.equal(true);
        });

        expect(fs.readFileSync(resolve('/cjs/main.st.css'), 'utf-8')).to.include(
            'st-namespace-reference="../src/main.st.css"'
        );

        build({
            extension: '.st.css',
            fs,
            stylable,
            rootDir: resolve('/'),
            srcDir: 'cjs',
            outDir: 'cjs2',
            log,
            moduleFormats: ['cjs'],
        });

        // check two builds using sourceNamespace are identical
        // compare two serializable js modules including their namespace
        expect(fs.readFileSync(resolve('/cjs/main.st.css.js'), 'utf-8')).to.equal(
            fs.readFileSync(resolve('/cjs2/main.st.css.js'), 'utf-8')
        );

        // assure no index file was generated by default
        expect(fs.existsSync(resolve('/lib/index.st.css')), '/lib/index.st.css').to.equal(false);
    });

    it('should report errors originating from stylable (process + transform)', () => {
        const fs = createFS({
            '/comp.st.css': `
                :import {
                    -st-from: "./missing-file.st.css";
                    -st-default: OtherMissingComp;
                }

                .a {
                    -st-extends: MissingComp;
                    color: value(missingVar);
                }
            `,
        });

        const stylable = new Stylable('/', fs, () => ({}));

        const { diagnosticsMessages } = build({
            extension: '.st.css',
            fs,
            stylable,
            outDir: '.',
            srcDir: '.',
            rootDir: resolve('/'),
            log,
            moduleFormats: ['cjs'],
        });
        const reportedError = diagnosticsMessages.join('\n\n');

        expect(reportedError).to.contain(processorWarnings.CANNOT_RESOLVE_EXTEND('MissingComp'));
        expect(reportedError).to.contain(functionWarnings.UNKNOWN_VAR('missingVar'));
        expect(reportedError).to.contain(
            resolverWarnings.UNKNOWN_IMPORTED_FILE('./missing-file.st.css')
        );
    });

    it('should optimize css (remove empty nodes, remove stylable-directives, remove comments)', () => {
        const fs = createFS({
            '/comp.st.css': `
                .root {
                    color: red;
                }
                /* comment */
                .x {
                    
                }
            `,
        });

        const stylable = new Stylable('/', fs, () => ({}));

        build({
            extension: '.st.css',
            fs,
            stylable,
            outDir: './dist',
            srcDir: '.',
            rootDir: resolve('/'),
            log,
            moduleFormats: ['cjs'],
            outputCSS: true,
            outputCSSNameTemplate: '[filename].global.css',
        });

        const builtFile = fs.readFileSync(resolve('/dist/comp.global.css'), 'utf8');

        expect(builtFile).to.contain(`root {`);
        expect(builtFile).to.contain(`color: red;`);
        expect(builtFile).to.not.contain(`.x`);
    });

    it('should minify', () => {
        const fs = createFS({
            '/comp.st.css': `
                .root {
                    color: rgb(255,0,0);
                }
            `,
        });

        const stylable = Stylable.create({
            projectRoot: '/',
            fileSystem: fs,
            resolveNamespace() {
                return 'test';
            },
        });

        build({
            extension: '.st.css',
            fs,
            stylable,
            outDir: './dist',
            srcDir: '.',
            minify: true,
            rootDir: resolve('/'),
            log,
            moduleFormats: ['cjs'],
            outputCSS: true,
            outputCSSNameTemplate: '[filename].global.css',
        });

        const builtFile = fs.readFileSync(resolve('/dist/comp.global.css'), 'utf8');

        expect(builtFile).to.contain(`.test__root{color:red}`);
    });

    it('should inject request to output module', () => {
        const fs = createFS({
            '/comp.st.css': `
                .root {
                    color: red;
                }
            `,
        });

        const stylable = new Stylable('/', fs, () => ({}));

        build({
            extension: '.st.css',
            fs,
            stylable,
            outDir: './dist',
            srcDir: '.',
            rootDir: resolve('/'),
            log,
            moduleFormats: ['cjs'],
            outputCSS: true,
            injectCSSRequest: true,
            outputCSSNameTemplate: '[filename].global.css',
        });

        expect(fs.readFileSync(resolve('/dist/comp.st.css.js'), 'utf8')).contains(
            `require("./comp.global.css")`
        );
        expect(fs.existsSync(resolve('/dist/comp.global.css'))).to.equal(true);
    });

    it('DTS only parts', () => {
        const fs = createFS({
            '/main.st.css': `
                .root   {}
                .string {}`,
        });

        const stylable = new Stylable('/', fs, () => ({}));

        build({
            extension: '.st.css',
            fs,
            stylable,
            outDir: '.',
            srcDir: '.',
            rootDir: resolve('/'),
            moduleFormats: [],
            log,
            dts: true,
        });

        ['/main.st.css', '/main.st.css.d.ts'].forEach((p) => {
            expect(fs.existsSync(resolve(p)), p).to.equal(true);
        });
    });

    it('DTS with states', () => {
        const fs = createFS({
            '/main.st.css': `
                .root   { -st-states: x; }
                .string { -st-states: y(string); }
                .number { -st-states: z(number); }
                .enum   { -st-states: z(enum(on, off, default)); }`,
        });

        const stylable = new Stylable('/', fs, () => ({}));

        build({
            extension: '.st.css',
            fs,
            stylable,
            outDir: '.',
            srcDir: '.',
            rootDir: resolve('/'),
            moduleFormats: [],
            log,
            dts: true,
        });

        ['/main.st.css', '/main.st.css.d.ts'].forEach((p) => {
            expect(fs.existsSync(resolve(p)), p).to.equal(true);
        });
    });

    it.only('DTS with mapping', () => {
        const fs = createFS({
            '/main.st.css': `
                @keyframes blah {
                    0% {}
                    100% {}
                }
                :vars {
                    v1: red;
                    v2: green;
                }
                .root   { 
                    -st-states: a, b, w;
                    --c1: red;
                    --c2: green;
                 }
                .string { -st-states: x(string); }
                .number { -st-states: y(number); }
                .enum   { -st-states: z(enum(on, off, default)); }`,
        });

        const stylable = new Stylable('/', fs, () => ({}));

        build({
            extension: '.st.css',
            fs,
            stylable,
            outDir: '.',
            srcDir: '.',
            rootDir: resolve('/'),
            moduleFormats: [],
            log,
            dts: true,
            dtsSourceMap: true,
        });

        ['/main.st.css', '/main.st.css.d.ts'].forEach((p) => {
            expect(fs.existsSync(resolve(p)), p).to.equal(true);
        });
    });
});
