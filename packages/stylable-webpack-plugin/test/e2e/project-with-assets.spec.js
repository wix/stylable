const { expect } = require("chai");
const { join } = require("path");
const { ProjectRunner } = require("./helpers/project-runner");
const {
  browserFunctions,
  filterAssetResponses
} = require("./helpers/matchers");

const projectFixtures = join(__dirname, "projects");

describe("(project-with-assets)", () => {
  const projectRunner = ProjectRunner.mochaSetup(
    {
      projectDir: join(projectFixtures, "project-with-assets"),
      port: 3001,
      puppeteerOptions: {
        headless: true
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
      { id: "./src/assets/assets.st.css", depth: "1" },
      { id: "./src/index.st.css", depth: "2" }
    ]);
  });

  it("load assets from url() declaration value", async () => {
    const expectedAssets = ["main.js", "asset.jpg", "asset-in-root.png"];
    const { page, responses } = await projectRunner.openInBrowser();
    const assetResponses = filterAssetResponses(responses, expectedAssets);

    expect(
      assetResponses.length,
      "all expected assets has matching responses"
    ).to.equal(expectedAssets.length);

    for (const response of assetResponses) {
      expect(response.ok(), `${response.url()} to be loaded`).to.equal(true);
    }
  });
});
