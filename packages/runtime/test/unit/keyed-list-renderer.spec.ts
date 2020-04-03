import { expect } from 'chai';
import { JSDOM } from 'jsdom';
import { createDOMListRenderer, DOMListRenderer } from '../../src/keyed-list-renderer';
import { NodeRenderer } from '../../src/types';

interface TestNode {
    key: string;
    value: string;
}

describe('createDOMListRenderer', () => {
    let document: Document;
    let container: Element;
    let render: DOMListRenderer<TestNode, Element, Element>['render'];

    const basicNodeRenderer: NodeRenderer<TestNode, Element> = {
        renderKey({ key }) {
            return key;
        },
        hasKey(node) {
            return node.hasAttribute('key');
        },
        create(dataItem, key) {
            const node = document.createElement('div');
            node.setAttribute('key', key + '');
            this.update(dataItem, node);
            return node;
        },
        update({ value }, node) {
            node.textContent = value;
            return node;
        },
    };
    beforeEach(() => {
        const dom = new JSDOM(`
            <body><div id="container"></div></body>
        `);

        const renderer = createDOMListRenderer(basicNodeRenderer);
        document = dom.window.document;
        container = document.getElementById('container')!;
        render = renderer.render;
    });

    it('should render dom nodes', () => {
        const a = { key: 'a', value: 'a' };
        const b = { key: 'b', value: 'b' };

        render(container, [a, b]);

        checkNode(container.children[0], a);
        checkNode(container.children[1], b);
    });

    it('should update dom nodes', () => {
        const a = { key: 'a', value: 'a' };
        const b = { key: 'b', value: 'b' };

        render(container, [a, b]);

        const a1 = { key: 'a', value: 'a1' };
        const b1 = { key: 'b', value: 'b1' };
        render(container, [a1, b1]);

        checkNode(container.children[0], a1);
        checkNode(container.children[1], b1);
    });

    it('should update dom nodes (same object)', () => {
        const a = { key: 'a', value: 'a' };
        const b = { key: 'b', value: 'b' };

        render(container, [a, b]);

        a.value = 'a1';
        b.value = 'b1';

        render(container, [a, b]);

        checkNode(container.children[0], a);
        checkNode(container.children[1], b);
    });

    it('should re-order dom nodes', () => {
        const a = { key: 'a', value: 'a' };
        const b = { key: 'b', value: 'b' };

        render(container, [a, b]);
        expect(container.children.length).to.equal(2);

        render(container, [b, a]);

        expect(container.children.length).to.equal(2);
        checkNode(container.children[0], b);
        checkNode(container.children[1], a);
    });

    it('should re-order dom nodes (2)', () => {
        const a = { key: 'a', value: 'a' };
        const b = { key: 'b', value: 'b' };
        const c = { key: 'c', value: 'c' };
        const d = { key: 'd', value: 'd' };

        render(container, [a, b, c, d]);
        expect(container.children.length).to.equal(4);

        render(container, [d, c, b, a]);
        expect(container.children.length).to.equal(4);

        checkNode(container.children[0], d);
        checkNode(container.children[1], c);
        checkNode(container.children[2], b);
        checkNode(container.children[3], a);
    });

    it('should remove nodes', () => {
        const a = { key: 'a', value: 'a' };
        const b = { key: 'b', value: 'b' };
        const c = { key: 'c', value: 'c' };

        render(container, [a, b, c]);
        expect(container.children.length).to.equal(3);

        render(container, [b]);
        expect(container.children.length).to.equal(1);
        checkNode(container.children[0], b);
    });

    it('should insert nodes', () => {
        const a = { key: 'a', value: 'a' };
        const b = { key: 'b', value: 'b' };
        const c = { key: 'c', value: 'c' };

        render(container, [a]);
        expect(container.children.length).to.equal(1);

        render(container, [a, c]);
        expect(container.children.length).to.equal(2);
        checkNode(container.children[0], a);
        checkNode(container.children[1], c);

        render(container, [a, b, c]);
        expect(container.children.length).to.equal(3);
        checkNode(container.children[0], a);
        checkNode(container.children[1], b);
        checkNode(container.children[2], c);
    });

    it('should empty nodes', () => {
        const a = { key: 'a', value: 'a' };
        const b = { key: 'b', value: 'b' };
        const c = { key: 'c', value: 'c' };

        render(container, [a, b, c]);
        expect(container.children.length).to.equal(3);

        render(container, []);
        expect(container.children.length).to.equal(0);
    });
});

function checkNode(node: Element, { value, key }: TestNode) {
    expect(node.getAttribute('key')).to.equal(key);
    expect(node.textContent).to.equal(value);
}
