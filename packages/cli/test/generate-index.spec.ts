import { Stylable } from '@stylable/core';
import { createMemoryFileSystemWithFiles as createFS } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import * as path from 'path';
import { build } from '../src/build';
const log = () => {
    /**/
};

describe('build index', () => {
    it('should create index file importing all matched stylesheets in srcDir', async () => {
        const fs = createFS({
            '/compA.st.css': `
               .a{}
            `,
            '/a/b/comp-B.st.css': `
               .b{}
            `
        });

        const stylable = new Stylable('/', fs as any, () => ({}));

        await build({
            extension: '.st.css',
            fs: fs as any,
            stylable,
            outDir: '.',
            srcDir: '.',
            indexFile: 'index.st.css',
            rootDir: path.resolve('/'),
            log
        });

        const res = fs.readFileSync(path.resolve('/index.st.css')).toString();

        expect(res.trim()).to.equal(
            [
                ':import {-st-from: "./compA.st.css";-st-default:CompA;}',
                '.root CompA{}',
                ':import {-st-from: "./a/b/comp-B.st.css";-st-default:CompB;}',
                '.root CompB{}'
            ].join('\n')
        );
    });
    it('should create index file using a the default generator', async () => {
        const fs = createFS({
            '/comp-A.st.css': `
               .a{}
            `,
            '/b/1-some-comp-B-.st.css': `
               .b{}
            `
        });

        const stylable = new Stylable('/', fs as any, () => ({}));

        await build({
            extension: '.st.css',
            fs: fs as any,
            stylable,
            outDir: '.',
            srcDir: '.',
            indexFile: 'index.st.css',
            rootDir: path.resolve('/'),
            log
        });

        const res = fs.readFileSync(path.resolve('/index.st.css')).toString();

        expect(res.trim()).to.equal(
            [
                ':import {-st-from: "./comp-A.st.css";-st-default:CompA;}',
                '.root CompA{}',
                ':import {-st-from: "./b/1-some-comp-B-.st.css";-st-default:SomeCompB;}',
                '.root SomeCompB{}'
            ].join('\n')
        );
    });
    it('should create index file using a custom generator', async () => {
        const fs = createFS({
            '/comp-A.st.css': `
               .a{}
            `,
            '/b/1-some-comp-B-.st.css': `
               .b{}
            `
        });

        const stylable = new Stylable('/', fs as any, () => ({}));

        await build({
            extension: '.st.css',
            fs: fs as any,
            stylable,
            outDir: '.',
            srcDir: '.',
            indexFile: 'index.st.css',
            rootDir: path.resolve('/'),
            log,
            generatorPath: require.resolve('./fixtures/test-generator')
        });

        const res = fs.readFileSync(path.resolve('/index.st.css')).toString();

        expect(res.trim()).to.equal(
            [
                ':import {-st-from: "./comp-A.st.css";-st-default:Style0;}',
                '.root Style0{}',
                ':import {-st-from: "./b/1-some-comp-B-.st.css";-st-default:Style1;}',
                '.root Style1{}'
            ].join('\n')
        );
    });
    it('should create non-existing folders in path to the generated indexFile', async () => {
        const fs = createFS({
            '/comp.st.css': `
               .a{}
            `
        });

        const stylable = new Stylable('/', fs as any, () => ({}));
        await build({
            extension: '.st.css',
            fs: fs as any,
            stylable,
            outDir: './some-dir/other-dir/',
            srcDir: '.',
            indexFile: 'index.st.css',
            rootDir: path.resolve('/'),
            log
        });

        const res = fs.readFileSync(path.resolve('/some-dir/other-dir/index.st.css')).toString();

        expect(res.trim()).to.equal(
            [
                ':import {-st-from: "../../comp.st.css";-st-default:Comp;}',
                '.root Comp{}'
            ].join('\n')
        );
    });
    it('should handle name collisions by failing', async () => {
        const fs = createFS({
            '/comp.st.css': `
               .a{}
            `,
            '/a/comp.st.css': `
               .b{}
            `
        });

        const stylable = new Stylable('/', fs as any, () => ({}));
        try {
            await build({
                extension: '.st.css',
                fs: fs as any,
                stylable,
                outDir: '.',
                srcDir: '.',
                indexFile: 'index.st.css',
                rootDir: path.resolve('/'),
                log
            });
        } catch (error) {
            expect(error.message).to.equal(
                `Name Collision Error: ${path.resolve('/comp.st.css')} and ${path.resolve(
                    '/a/comp.st.css'
                )} has the same filename`
            );
        }
    });
});
