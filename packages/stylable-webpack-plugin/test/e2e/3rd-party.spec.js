const { expect } = require("chai");
const { join } = require("path");
const { ProjectRunner } = require("./helpers/project-runner");
const {
  browserFunctions,
  filterAssetResponses
} = require("./helpers/matchers");

const projectFixtures = join(__dirname, "projects");

describe("(3rd-party)", () => {
  const projectRunner = ProjectRunner.mochaSetup(
    {
      projectDir: join(projectFixtures, "3rd-party"),
      port: 3002,
      puppeteerOptions: {
        headless: false
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
      { id: "./node_modules/test-components/button.st.css", depth: "1" },
      { id: "./node_modules/test-components/index.st.css", depth: "2", theme: true },
      { id: "./src/index.st.css", depth: "3" }
    ]);
  });

});
