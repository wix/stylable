const { expect } = require("chai");
const { join } = require("path");
const { ProjectRunner } = require("./helpers/project-runner");
const {
  browserFunctions,
  filterAssetResponses
} = require("./helpers/puppeteer-helpers");

const projectFixtures = join(__dirname, "projects");

describe("(optimizations)", () => {
  const projectRunner = ProjectRunner.mochaSetup(
    {
      projectDir: join(projectFixtures, "optimizations"),
      port: 3002,
      puppeteerOptions: {
        // headless: false
      }
    },
    before,
    afterEach,
    after
  );

  it("renders css", async () => {
    const { page } = await projectRunner.openInBrowser();
    const styleElements = await page.evaluate(
      browserFunctions.getStyleElementsMetadata,
      true
    );

    expect(styleElements).to.eql([
      {
        id: "./node_modules/test-components/button.st.css",
        depth: "1",
        theme: true,
        css: ""
      },
      {
        id: "./node_modules/test-components/index.st.css",
        depth: "2",
        theme: true,
        css: ""
      },
      {
        id: "./src/index.st.css",
        depth: "3",
        css: ".s3[data-o0-x] {\r\n    font-family: MyFont\n}\n.s4 {\r\n    background: rgb(0, 0, 255)\n}"
      }
    ]);
  });

  it("css is working", async () => {
    const { page } = await projectRunner.openInBrowser();
    const {fontFamily, backgroundColor, exports} = await page.evaluate(() => {
      return {
        backgroundColor: getComputedStyle(document.body).backgroundColor,
        fontFamily: getComputedStyle(document.documentElement).fontFamily,
        exports: Object.getPrototypeOf(window.stylableIndex)
      };
    });


    expect(exports.$namespace).to.eql("o0");
    expect(exports.myValue).to.eql("red");
    expect(exports.root).to.eql("s3");
    expect(exports.empty).to.eql("s5");
    expect(exports.used).to.eql("s4");

    expect(backgroundColor).to.eql("rgb(0, 0, 255)");
    expect(fontFamily).to.eql("MyFont");
  });
});
