import { Stylable } from '@stylable/core';
import { functionWarnings, processorWarnings, resolverWarnings } from '@stylable/core';
import { createMemoryFileSystemWithFiles as createFS } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { resolve } from 'path';
import { build } from '../src';

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
            `
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
            outputSources: true
        });

        [
            '/lib/main.st.css',
            '/lib/main.st.css.js',
            '/lib/components/comp.st.css',
            '/lib/components/comp.st.css.js'
        ].forEach(p => {
            expect(fs.existsSync(resolve(p)), p).to.equal(true);
        });

        // assure no index file was generated by default
        expect(fs.existsSync(resolve('/lib/index.st.css')), '/lib/index.st.css').to.equal(false);
    });

    it('should report errors originating from stylable (process + transform)', async () => {
        const fs = createFS({
            '/comp.st.css': `
                :import {
                    -st-from: "./missing-file.st.css"
                    -st-default: OtherMissingComp;
                }

                .a {
                    -st-extends: MissingComp;
                    color: value(missingVar);
                }
            `
        });

        const stylable = new Stylable('/', fs, () => ({}));
        let reportedError = '';

        await build({
            extension: '.st.css',
            fs,
            stylable,
            outDir: '.',
            srcDir: '.',
            rootDir: resolve('/'),
            log,
            diagnostics: (...args: string[]) => ([reportedError] = args),
            moduleFormats: ['cjs']
        });

        expect(reportedError).to.contain(processorWarnings.CANNOT_RESOLVE_EXTEND('MissingComp'));
        expect(reportedError).to.contain(functionWarnings.UNKNOWN_VAR('missingVar'));
        expect(reportedError).to.contain(
            resolverWarnings.UNKNOWN_IMPORTED_FILE('./missing-file.st.css')
        );
    });

    it('should optimize css (remove empty nodes, remove stylable-directives, remove comments)', async () => {
        const fs = createFS({
            '/comp.st.css': `
                .root {
                    color: red;
                }
                /* comment */
                .x {
                    
                }
            `
        });

        const stylable = new Stylable('/', fs, () => ({}));

        await build({
            extension: '.st.css',
            fs,
            stylable,
            outDir: './dist',
            srcDir: '.',
            rootDir: resolve('/'),
            log,
            moduleFormats: ['cjs'],
            outputCSS: true,
            outputCSSNameTemplate: '[filename].global.css'
        });

        const builtFile = fs.readFileSync(resolve('/dist/comp.global.css'), 'utf8');

        expect(builtFile).to.contain(`root {`);
        expect(builtFile).to.contain(`color: red;`);
        expect(builtFile).to.not.contain(`.x`);
    });

    it('should minify', async () => {
        const fs = createFS({
            '/comp.st.css': `
                .root {
                    color: rgb(255,0,0);
                }
            `
        });

        const stylable = Stylable.create({
            projectRoot: '/',
            fileSystem: fs,
            resolveNamespace() {
                return 'test';
            }
        });

        await build({
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
            outputCSSNameTemplate: '[filename].global.css'
        });

        const builtFile = fs.readFileSync(resolve('/dist/comp.global.css'), 'utf8');

        expect(builtFile).to.contain(`.test__root{color:red}`);
    });

    it('should inject request to output module', async () => {
        const fs = createFS({
            '/comp.st.css': `
                .root {
                    color: red;
                }
            `
        });

        const stylable = new Stylable('/', fs, () => ({}));

        await build({
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
            outputCSSNameTemplate: '[filename].global.css'
        });

        expect(fs.readFileSync(resolve('/dist/comp.st.css.js'), 'utf8')).contains(
            `require("./comp.global.css")`
        );
        expect(fs.existsSync(resolve('/dist/comp.global.css'))).to.equal(true);
    });
});
