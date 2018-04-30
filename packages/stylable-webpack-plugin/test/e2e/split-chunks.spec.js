const { expect } = require("chai");
const { join } = require("path");
const { ProjectRunner } = require("./helpers/project-runner");
const {
  browserFunctions,
  filterAssetResponses
} = require("./helpers/puppeteer-helpers");

const projectFixtures = join(__dirname, "projects");

describe("(split-chunks)", () => {
  const projectRunner = ProjectRunner.mochaSetup(
    {
      projectDir: join(projectFixtures, "split-chunks"),
      port: 3001,
      puppeteerOptions: {
        // headless: false,
        // devtools: true
      }
    },
    before,
    afterEach,
    after
  );

  it("renders css", async () => {
    const { page } = await projectRunner.openInBrowser();
    const styleElements = await page.evaluate(
      browserFunctions.getStyleElementsMetadata
    );

    expect(styleElements).to.eql([
      {
        depth: "1",
        id: "./node_modules/lib/test.st.css"
      },
      {
        depth: "2",
        id: "./node_modules/lib/index.st.css"
      },
      {
        depth: "3",
        id: "./src/index.st.css"
      }
    ]);
  });

  it("css is working", async () => {
    const { page } = await projectRunner.openInBrowser();
    const backgroundColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).backgroundColor;
    });

    expect(backgroundColor).to.eql("rgb(255, 0, 0)");
  });
});
