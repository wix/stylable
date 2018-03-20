const { expect } = require("chai");
const { JSDOM } = require("jsdom");
const { RuntimeRenderer } = require("../src/runtime/css-runtime-renderer");

function test(msg, fn, only = false) {
  const api = new RuntimeRenderer();
  (only ? it.only : it)(msg, () => fn(api));
}

describe("depth ordering in register", () => {
  test("[0, 0] => [a, b]", api => {
    const a = {
      $id: "/a.st.css",
      $depth: 0,
      $css: `.a{}`
    };

    const b = {
      $id: "/b.st.css",
      $depth: 0,
      $css: `.b{}`
    };

    api.register(a);
    api.register(b);

    expect(api.styles).eql([a, b]);
  });

  test("[1, 0] => [b, a]", api => {
    const a = {
      $id: "/a.st.css",
      $depth: 1,
      $css: `.a{}`
    };

    const b = {
      $id: "/b.st.css",
      $depth: 0,
      $css: `.b{}`
    };

    api.register(a);
    api.register(b);

    expect(api.styles).eql([b, a]);
  });

  test("[1, 0, 1] => [b, a, c]", api => {
    const a = {
      $id: "/a.st.css",
      $depth: 1,
      $css: `.a{}`
    };

    const b = {
      $id: "/b.st.css",
      $depth: 0,
      $css: `.b{}`
    };

    const c = {
      $id: "/c.st.css",
      $depth: 1,
      $css: `.c{}`
    };

    api.register(a);
    api.register(b);
    api.register(c);

    expect(api.styles).eql([b, a, c]);
  });

  test("[1, 0, 1, 0] => [b, d, a, c]", api => {
    const a = {
      $id: "/a.st.css",
      $depth: 1,
      $css: `.a{}`
    };

    const b = {
      $id: "/b.st.css",
      $depth: 0,
      $css: `.b{}`
    };

    const c = {
      $id: "/c.st.css",
      $depth: 1,
      $css: `.c{}`
    };

    const d = {
      $id: "/d.st.css",
      $depth: 0,
      $css: `.d{}`
    };

    api.register(a);
    api.register(b);
    api.register(c);
    api.register(d);

    expect(api.styles).eql([b, d, a, c]);
  });

  test("[3, 2, 1, 0] => [d, c, b, a]", api => {
    const a = {
      $id: "/a.st.css",
      $depth: 3,
      $css: `.a{}`
    };

    const b = {
      $id: "/b.st.css",
      $depth: 2,
      $css: `.b{}`
    };

    const c = {
      $id: "/c.st.css",
      $depth: 1,
      $css: `.c{}`
    };

    const d = {
      $id: "/d.st.css",
      $depth: 0,
      $css: `.d{}`
    };

    api.register(a);
    api.register(b);
    api.register(c);
    api.register(d);

    expect(api.styles).eql([d, c, b, a]);
  });

  test("[0, 1, -1] => [c, a, b]", api => {
    const a = {
      $id: "/a.st.css",
      $depth: 0,
      $css: `.a{}`
    };

    const b = {
      $id: "/b.st.css",
      $depth: 1,
      $css: `.b{}`
    };

    const c = {
      $id: "/c.st.css",
      $depth: -1,
      $css: `.c{}`
    };

    api.register(a);
    api.register(b);
    api.register(c);

    expect(api.styles).eql([c, a, b]);
  });

  test("[Infinity, 0, Infinity] => [b, a, c]", api => {
    const a = {
      $id: "/a.st.css",
      $depth: Infinity,
      $css: `.a{}`
    };

    const b = {
      $id: "/b.st.css",
      $depth: 0,
      $css: `.b{}`
    };

    const c = {
      $id: "/c.st.css",
      $depth: Infinity,
      $css: `.c{}`
    };

    api.register(a);
    api.register(b);
    api.register(c);

    expect(api.styles).eql([b, a, c]);
  });
});

describe("re-registration", () => {
  test("should update maps", api => {
    const a0 = {
      $id: "/a.st.css",
      $depth: 0,
      $css: `.a{}`
    };

    const a1 = {
      $id: "/a.st.css",
      $depth: 1,
      $css: `.a{z-index:1}`
    };

    const b = {
      $id: "/b.st.css",
      $depth: 0,
      $css: `.b{}`
    };

    api.register(a0);
    api.register(b);
    api.register(a1);

    expect(api.styles).eql([b, a1]);
    expect(api.stylesMap).includes({
      "/a.st.css": a1
    });
  });
});

describe("Sort Styles", () => {
  test("sort styles by depth", api => {
    const a = {
      $id: "/a.st.css",
      $depth: 0,
      $css: `.a{}`
    };

    const b = {
      $id: "/b.st.css",
      $depth: 2,
      $css: `.b{}`
    };

    const c = {
      $id: "/c.st.css",
      $depth: 0,
      $css: `.c{}`
    };

    const d = {
      $id: "/d.st.css",
      $depth: 1,
      $css: `.d{}`
    };

    expect(api.sortStyles([a, b, c, d])).to.eql([a, c, d, b]);
  });

  test("sort style ids from registered styles", api => {
    const a = {
      $id: "/a.st.css",
      $depth: 0,
      $css: `.a{}`
    };

    const b = {
      $id: "/b.st.css",
      $depth: 2,
      $css: `.b{}`
    };

    const c = {
      $id: "/c.st.css",
      $depth: 0,
      $css: `.c{}`
    };

    const d = {
      $id: "/d.st.css",
      $depth: 1,
      $css: `.d{}`
    };

    api.register(a);
    api.register(b);
    api.register(c);
    api.register(d);

    expect(
      api.getStyles(["/d.st.css", "/c.st.css", "/b.st.css", "/a.st.css"], true)
    ).to.eql([a, c, d, b]);
  });
});

describe("init", () => {
  test("init with window context once", api => {
    const { window } = new JSDOM(`
            <body>
                <div id="container"></div>
            </body>
        `);

    const document = window.document;

    this.renderer = null;
    this.window = null;
    this.id = null;

    expect(api.renderer).to.equal(null);
    expect(api.window).to.equal(null);
    expect(api.renderer).to.equal(null);

    api.init(window);

    expect(typeof api.renderer.render).to.equal("function");
    expect(api.window).to.equal(window);
    expect(api.id).to.equal(0);
  });

  test("init should render once", api => {
    const { window } = new JSDOM(`
            <body>
                <div id="container"></div>
            </body>
        `);

    const document = window.document;

    const a = {
      $id: "/a.st.css",
      $depth: 0,
      $css: `.a{}`
    };

    const b = {
      $id: "/b.st.css",
      $depth: 0,
      $css: `.b{}`
    };

    api.register(a);
    api.register(b);

    api.init(window);
    const head = document.head;
    expect(head.children.length).to.equal(2);
    assertStyle(head.children[0], { key: "/a.st.css", $css: ".a{}" });
    assertStyle(head.children[1], { key: "/b.st.css", $css: ".b{}" });
  });
});

function assertStyle(node, { $css, key }) {
  expect(node.getAttribute("st-id")).to.equal(key);
  expect(node.textContent).to.equal($css);
}
