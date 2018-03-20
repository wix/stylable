const { expect } = require('chai');
const { JSDOM } = require('jsdom');
const { Api } = require('../src/runtime/css-runtime');

function test(msg, fn) {
    const api = new Api();
    it(msg, () => fn(api))
}

describe('depth ordering in register', () => {

    test('[0, 0] => [a, b]', (api) => {

        const a = {
            id: '/a.st.css',
            depth: 0,
            css: `.a{}`
        }

        const b = {
            id: '/b.st.css',
            depth: 0,
            css: `.b{}`
        }

        api.register(a);
        api.register(b);

        expect(api.styles).eql([a, b])

    })

    test('[1, 0] => [b, a]', (api) => {

        const a = {
            id: '/a.st.css',
            depth: 1,
            css: `.a{}`
        }

        const b = {
            id: '/b.st.css',
            depth: 0,
            css: `.b{}`
        }

        api.register(a);
        api.register(b);

        expect(api.styles).eql([b, a])

    })

    test('[1, 0, 1] => [b, a, c]', (api) => {

        const a = {
            id: '/a.st.css',
            depth: 1,
            css: `.a{}`
        }

        const b = {
            id: '/b.st.css',
            depth: 0,
            css: `.b{}`
        }

        const c = {
            id: '/c.st.css',
            depth: 1,
            css: `.c{}`
        }

        api.register(a);
        api.register(b);
        api.register(c);

        expect(api.styles).eql([b, a, c])

    })

    test('[1, 0, 1, 0] => [b, d, a, c]', (api) => {

        const a = {
            id: '/a.st.css',
            depth: 1,
            css: `.a{}`
        }

        const b = {
            id: '/b.st.css',
            depth: 0,
            css: `.b{}`
        }

        const c = {
            id: '/c.st.css',
            depth: 1,
            css: `.c{}`
        }

        const d = {
            id: '/d.st.css',
            depth: 0,
            css: `.d{}`
        }

        api.register(a);
        api.register(b);
        api.register(c);
        api.register(d);

        expect(api.styles).eql([b, d, a, c])

    })

    test('[3, 2, 1, 0] => [d, c, b, a]', (api) => {

        const a = {
            id: '/a.st.css',
            depth: 3,
            css: `.a{}`
        }

        const b = {
            id: '/b.st.css',
            depth: 2,
            css: `.b{}`
        }

        const c = {
            id: '/c.st.css',
            depth: 1,
            css: `.c{}`
        }

        const d = {
            id: '/d.st.css',
            depth: 0,
            css: `.d{}`
        }

        api.register(a);
        api.register(b);
        api.register(c);
        api.register(d);

        expect(api.styles).eql([d, c, b, a])

    })
    
    test('[0, 1, -1] => [c, a, b]', (api) => {

        const a = {
            id: '/a.st.css',
            depth: 0,
            css: `.a{}`
        }

        const b = {
            id: '/b.st.css',
            depth: 1,
            css: `.b{}`
        }

        const c = {
            id: '/c.st.css',
            depth: -1,
            css: `.c{}`
        }

        api.register(a);
        api.register(b);
        api.register(c);
        
        expect(api.styles).eql([c, a, b])

    })
    
    test('[Infinity, 0, Infinity] => [b, a, c]', (api) => {

        const a = {
            id: '/a.st.css',
            depth: Infinity,
            css: `.a{}`
        }

        const b = {
            id: '/b.st.css',
            depth: 0,
            css: `.b{}`
        }

        const c = {
            id: '/c.st.css',
            depth: Infinity,
            css: `.c{}`
        }

        api.register(a);
        api.register(b);
        api.register(c);
        
        expect(api.styles).eql([b, a, c])

    })

})

describe('re-registration', () => {

    test('should update maps', (api) => {

        const a0 = {
            id: '/a.st.css',
            depth: 0,
            css: `.a{}`
        }

        const a1 = {
            id: '/a.st.css',
            depth: 1,
            css: `.a{z-index:1}`
        }

        const b = {
            id: '/b.st.css',
            depth: 0,
            css: `.b{}`
        }

        api.register(a0);
        api.register(b);
        api.register(a1);

        expect(api.styles).eql([b, a1])
        expect(api.stylesMap).includes({
            '/a.st.css': a1
        })

    })

})

describe('Sort Styles', () => {

    test('sort styles by depth', (api) => {

        const a = {
            id: '/a.st.css',
            depth: 0,
            css: `.a{}`
        }

        const b = {
            id: '/b.st.css',
            depth: 2,
            css: `.b{}`
        }

        const c = {
            id: '/c.st.css',
            depth: 0,
            css: `.c{}`
        }

        const d = {
            id: '/d.st.css',
            depth: 1,
            css: `.d{}`
        }


        expect(api.sortStyles([a, b, c, d])).to.eql([a, c, d, b]);

    })

    test('sort style ids from registered styles', (api) => {

        const a = {
            id: '/a.st.css',
            depth: 0,
            css: `.a{}`
        }

        const b = {
            id: '/b.st.css',
            depth: 2,
            css: `.b{}`
        }

        const c = {
            id: '/c.st.css',
            depth: 0,
            css: `.c{}`
        }

        const d = {
            id: '/d.st.css',
            depth: 1,
            css: `.d{}`
        }

        api.register(a);
        api.register(b);
        api.register(c);
        api.register(d);

        expect(api.getStyles([
            '/d.st.css',
            '/c.st.css',
            '/b.st.css',
            '/a.st.css'
        ], true)).to.eql([a, c, d, b]);

    })

})

describe('createRenderer', () => {

    test('render to dom', (api) => {

        const { window: { document } } = new JSDOM(`
            <body>
                <div id="container"></div>
            </body>
        `)

        const a = {
            id: '/a.st.css',
            depth: 0,
            css: `.a{}`
        }

        const b = {
            id: '/b.st.css',
            depth: 0,
            css: `.b{}`
        }

        api.register(a);
        api.register(b);

        const { render: renderStyles } = api.createRenderer({
            createElement: document.createElement.bind(document)
        });

        const container = document.getElementById('container');

        renderStyles(container, api.styles);

        expect(container.children.length).to.equal(2);
        assertStyle(container.children[0], { key: '/a.st.css', css: '.a{}' });
        assertStyle(container.children[1], { key: '/b.st.css', css: '.b{}' });
    })

    test('update dom', (api) => {

        const { window: { document } } = new JSDOM(`
            <body>
                <div id="container"></div>
            </body>
        `)

        const a = {
            id: '/a.st.css',
            depth: 0,
            css: `.a{}`
        }

        const b = {
            id: '/b.st.css',
            depth: 0,
            css: `.b{}`
        }

        api.register(a);
        api.register(b);

        const { render: renderStyles } = api.createRenderer({
            createElement: document.createElement.bind(document)
        });

        const container = document.getElementById('container');

        renderStyles(container, api.styles);


        expect(container.children.length).to.equal(2);
        assertStyle(container.children[0], { key: '/a.st.css', css: '.a{}' });
        assertStyle(container.children[1], { key: '/b.st.css', css: '.b{}' });

        renderStyles(container, api.getStyles(['/a.st.css']));
        expect(container.children.length).to.equal(1);
        assertStyle(container.children[0], { key: '/a.st.css', css: '.a{}' });

    })

    test('update empty', (api) => {

        const { window: { document } } = new JSDOM(`
            <body>
                <div id="container"></div>
            </body>
        `)

        const a = {
            id: '/a.st.css',
            depth: 0,
            css: `.a{}`
        }

        const b = {
            id: '/b.st.css',
            depth: 0,
            css: `.b{}`
        }

        api.register(a);
        api.register(b);

        const { render: renderStyles } = api.createRenderer({
            createElement: document.createElement.bind(document)
        });

        const container = document.getElementById('container');

        renderStyles(container, api.styles);


        expect(container.children.length).to.equal(2);
        assertStyle(container.children[0], { key: '/a.st.css', css: '.a{}' });
        assertStyle(container.children[1], { key: '/b.st.css', css: '.b{}' });

        renderStyles(container, []);
        expect(container.children.length).to.equal(0);

    })

})


function assertStyle(node, { css, key }) {
    expect(node.getAttribute('stylable-key')).to.equal(key)
    expect(node.textContent).to.equal(css)
}