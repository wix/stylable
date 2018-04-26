const { expect } = require("chai");
const { join } = require("path");
const { ProjectRunner } = require("./helpers/project-runner");
const {
  browserFunctions,
  filterAssetResponses
} = require("./helpers/puppeteer-helpers");

const projectFixtures = join(__dirname, "projects");

describe("(mixins-project)", () => {
  const projectRunner = ProjectRunner.mochaSetup(
    {
      projectDir: join(projectFixtures, "mixins-project"),
      port: 3001,
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

    expect(styleElements[0]).to.include({
      id: "./src/index.st.css",
      depth: "1"
    });
    expect(styleElements[0].css.replace(/\s\s*/gm, ' ')).to.equal(`.o0--root { arguments: ["1","2"]; border: 1px solid rgb(255, 0, 0); z-index: 9 }`)
  });

  it("css is working", async () => {
    const { page } = await projectRunner.openInBrowser();
    const backgroundColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).border;
    });

    expect(backgroundColor).to.eql("1px solid rgb(255, 0, 0)");
  });
});
