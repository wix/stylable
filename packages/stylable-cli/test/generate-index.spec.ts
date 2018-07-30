import { createMemoryFileSystemWithFiles as createFS } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import * as path from 'path';
import { Stylable } from 'stylable';
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
            '/a/b/compB.st.css': `
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
                ':import {-st-from: "./a/b/compB.st.css";-st-default:CompB;}',
                '.root CompB{}'
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
