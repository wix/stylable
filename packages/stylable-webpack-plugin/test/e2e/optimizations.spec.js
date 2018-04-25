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
        css: ".o0--used {\r\n    background: rgb(0, 0, 255)\n}"
      }
    ]);
  });

  it("css is working", async () => {
    const { page } = await projectRunner.openInBrowser();
    const backgroundColor = await page.evaluate(() => {
      return getComputedStyle(document.body).backgroundColor;
    });

    expect(backgroundColor).to.eql("rgb(0, 0, 255)");
  });
});
