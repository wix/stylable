/* eslint-disable @typescript-eslint/no-implied-eval */
import { expect } from 'chai';
import { injectCSS } from '@stylable/runtime';
import { MicroDocument } from './micro-document';

const testInjectCSS = new Function(
    'document',
    'namespace',
    'css',
    'depth',
    'runtimeId',
    `(${injectCSS})(namespace, css, depth, runtimeId);`,
) as (
    document: MicroDocument,
    namespace: string,
    css: string,
    depth: number,
    runtimeId: string,
) => void;

describe('css-runtime-renderer', () => {
    it('inset', () => {
        const document = new MicroDocument();

        testInjectCSS(document, 'test', '* { --pos: 1; }', 0, 'test');

        expect(document.head.stylableIds()).to.equal('test');
    });
    it('insert two in same depth', () => {
        const document = new MicroDocument();

        testInjectCSS(document, 'test-1', '* { --pos: 1; }', 0, 'test');
        testInjectCSS(document, 'test-2', '* { --pos: 2; }', 0, 'test');

        expect(document.head.stylableIds()).to.equal('test-1, test-2');
    });

    it('insert different depths', () => {
        const document = new MicroDocument();

        testInjectCSS(document, 'test-1', '* { --pos: 3; }', 3, 'test');
        testInjectCSS(document, 'test-2', '* { --pos: 2; }', 2, 'test');
        testInjectCSS(document, 'test-3', '* { --pos: 1; }', 1, 'test');

        expect(document.head.stylableIds()).to.equal('test-3, test-2, test-1');
    });

    it('keep last with same id (in depth order)', () => {
        const document = new MicroDocument();

        testInjectCSS(document, 'test-1', '* { --pos: 1; }', 1, 'test');
        testInjectCSS(document, 'test-1', '* { --pos: 2; }', 2, 'test');
        testInjectCSS(document, 'test-1', '* { --pos: 3; }', 3, 'test');

        expect(document.head.stylableIds()).to.equal('test-1');
        // make sure it's the right one
        expect(document.head.children[0].textContent).to.equal('* { --pos: 3; }');
        expect(document.head.children[0].getAttribute('st_depth')).to.equal('3');
    });
    it('keep last with same id (reverse depth order)', () => {
        const document = new MicroDocument();

        testInjectCSS(document, 'test-1', '* { --pos: 2; }', 2, 'test');
        testInjectCSS(document, 'test-1', '* { --pos: 1; }', 1, 'test');

        expect(document.head.stylableIds()).to.equal('test-1');
        // make sure it's the right one
        expect(document.head.children[0].textContent).to.equal('* { --pos: 1; }');
        expect(document.head.children[0].getAttribute('st_depth')).to.equal('1');
    });
});
