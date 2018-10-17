const { expect } = require('chai');
const { JSDOM } = require('jsdom');
import { RuntimeRenderer } from '../src/css-runtime-renderer';

function assertStyle(node: Element, { $css, key }: { $css: string; key: string }) {
    expect(node.getAttribute('st-id')).to.equal(key);
    expect(node.textContent).to.equal($css);
}

describe('css-runtime-renderer', () => {
    let api: RuntimeRenderer;

    beforeEach(() => {
        api = new RuntimeRenderer();
    });

    describe('depth ordering in register', () => {
        it('[0, 0] => [a, b]', () => {
            const a = {
                $id: '/a.st.css',
                $depth: 0,
                $css: `.a{}`
            };

            const b = {
                $id: '/b.st.css',
                $depth: 0,
                $css: `.b{}`
            };

            api.register(a);
            api.register(b);

            expect(api.styles).eql([a, b]);
        });

        it('[1, 0] => [b, a]', () => {
            const a = {
                $id: '/a.st.css',
                $depth: 1,
                $css: `.a{}`
            };

            const b = {
                $id: '/b.st.css',
                $depth: 0,
                $css: `.b{}`
            };

            api.register(a);
            api.register(b);

            expect(api.styles).eql([b, a]);
        });

        it('[1, 0, 1] => [b, a, c]', () => {
            const a = {
                $id: '/a.st.css',
                $depth: 1,
                $css: `.a{}`
            };

            const b = {
                $id: '/b.st.css',
                $depth: 0,
                $css: `.b{}`
            };

            const c = {
                $id: '/c.st.css',
                $depth: 1,
                $css: `.c{}`
            };

            api.register(a);
            api.register(b);
            api.register(c);

            expect(api.styles).eql([b, a, c]);
        });

        it('[1, 0, 1, 0] => [b, d, a, c]', () => {
            const a = {
                $id: '/a.st.css',
                $depth: 1,
                $css: `.a{}`
            };

            const b = {
                $id: '/b.st.css',
                $depth: 0,
                $css: `.b{}`
            };

            const c = {
                $id: '/c.st.css',
                $depth: 1,
                $css: `.c{}`
            };

            const d = {
                $id: '/d.st.css',
                $depth: 0,
                $css: `.d{}`
            };

            api.register(a);
            api.register(b);
            api.register(c);
            api.register(d);

            expect(api.styles).eql([b, d, a, c]);
        });

        it('[3, 2, 1, 0] => [d, c, b, a]', () => {
            const a = {
                $id: '/a.st.css',
                $depth: 3,
                $css: `.a{}`
            };

            const b = {
                $id: '/b.st.css',
                $depth: 2,
                $css: `.b{}`
            };

            const c = {
                $id: '/c.st.css',
                $depth: 1,
                $css: `.c{}`
            };

            const d = {
                $id: '/d.st.css',
                $depth: 0,
                $css: `.d{}`
            };

            api.register(a);
            api.register(b);
            api.register(c);
            api.register(d);

            expect(api.styles).eql([d, c, b, a]);
        });

        it('[0, 1, -1] => [c, a, b]', () => {
            const a = {
                $id: '/a.st.css',
                $depth: 0,
                $css: `.a{}`
            };

            const b = {
                $id: '/b.st.css',
                $depth: 1,
                $css: `.b{}`
            };

            const c = {
                $id: '/c.st.css',
                $depth: -1,
                $css: `.c{}`
            };

            api.register(a);
            api.register(b);
            api.register(c);

            expect(api.styles).eql([c, a, b]);
        });

        it('[Infinity, 0, Infinity] => [b, a, c]', () => {
            const a = {
                $id: '/a.st.css',
                $depth: Infinity,
                $css: `.a{}`
            };

            const b = {
                $id: '/b.st.css',
                $depth: 0,
                $css: `.b{}`
            };

            const c = {
                $id: '/c.st.css',
                $depth: Infinity,
                $css: `.c{}`
            };

            api.register(a);
            api.register(b);
            api.register(c);

            expect(api.styles).eql([b, a, c]);
        });
    });

    describe('re-registration', () => {
        it('should update maps', () => {
            const a0 = {
                $id: '/a.st.css',
                $depth: 0,
                $css: `.a{}`
            };

            const a1 = {
                $id: '/a.st.css',
                $depth: 1,
                $css: `.a{z-index:1}`
            };

            const b = {
                $id: '/b.st.css',
                $depth: 0,
                $css: `.b{}`
            };

            api.register(a0);
            api.register(b);
            api.register(a1);

            expect(api.styles).eql([b, a1]);
            expect(api.stylesMap).includes({
                '/a.st.css': a1
            });
        });
    });

    describe('Sort Styles', () => {
        it('sort styles by depth', () => {
            const a = {
                $id: '/a.st.css',
                $depth: 0,
                $css: `.a{}`
            };

            const b = {
                $id: '/b.st.css',
                $depth: 2,
                $css: `.b{}`
            };

            const c = {
                $id: '/c.st.css',
                $depth: 0,
                $css: `.c{}`
            };

            const d = {
                $id: '/d.st.css',
                $depth: 1,
                $css: `.d{}`
            };

            expect(api.sortStyles([a, b, c, d])).to.eql([a, c, d, b]);
        });

        it('sort style ids from registered styles', () => {
            const a = {
                $id: '/a.st.css',
                $depth: 0,
                $css: `.a{}`
            };

            const b = {
                $id: '/b.st.css',
                $depth: 2,
                $css: `.b{}`
            };

            const c = {
                $id: '/c.st.css',
                $depth: 0,
                $css: `.c{}`
            };

            const d = {
                $id: '/d.st.css',
                $depth: 1,
                $css: `.d{}`
            };

            api.register(a);
            api.register(b);
            api.register(c);
            api.register(d);

            expect(
                api.getStyles(['/d.st.css', '/c.st.css', '/b.st.css', '/a.st.css'], true)
            ).to.eql([a, c, d, b]);
        });
    });

    describe('init', () => {
        it('init with window context once', () => {
            const { window } = new JSDOM(`
              <body>
                  <div id="container"></div>
              </body>
          `);

            // const document = window.document;

            // this.renderer = null;
            // this.window = null;
            // this.id = null;

            expect(api.renderer).to.equal(null);
            expect(api.window).to.equal(null);
            expect(api.renderer).to.equal(null);

            api.init(window);

            expect(typeof api.renderer!.render).to.equal('function');
            expect(api.window).to.equal(window);
            expect(api.id).to.equal(0);
        }).timeout(5000);

        it('init should render once', () => {
            const { window } = new JSDOM(`
              <body>
                  <div id="container"></div>
              </body>
          `);

            const document = window.document;

            const a = {
                $id: '/a.st.css',
                $depth: 0,
                $css: `.a{}`
            };

            const b = {
                $id: '/b.st.css',
                $depth: 0,
                $css: `.b{}`
            };

            api.register(a);
            api.register(b);

            api.init(window);
            const head = document.head;
            expect(head.children.length).to.equal(2);
            assertStyle(head.children[0], { key: '/a.st.css', $css: '.a{}' });
            assertStyle(head.children[1], { key: '/b.st.css', $css: '.b{}' });
        });

        it('init should render theme', () => {
            const { window } = new JSDOM(`
              <body>
                  <div id="container"></div>
              </body>
          `);

            const document = window.document;

            const a = {
                $id: '/a.st.css',
                $depth: 0,
                $css: `.a{}`,
                $theme: true
            };

            api.register(a);

            api.init(window);
            const head = document.head;
            expect(head.children.length).to.equal(1);
        });
    });
});
