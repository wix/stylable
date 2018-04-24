const { expect } = require("chai");
const { join } = require("path");
const { ProjectRunner } = require("./helpers/project-runner");
const {
  browserFunctions,
  filterAssetResponses
} = require("./helpers/matchers");

const projectFixtures = join(__dirname, "projects");

describe("(simplest-project)", () => {
  const projectRunner = ProjectRunner.mochaSetup(
    {
      projectDir: join(projectFixtures, "simplest-project"),
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

    expect(styleElements).to.eql([{ id: "./src/index.st.css", depth: "1" }]);
  });

  it("renders css", async () => {
    const { page } = await projectRunner.openInBrowser();
    const background = await page.evaluate(
      browserFunctions.getElementBackgroundColor,
      "html"
    );

    expect(background).to.eql("rgb(255, 0, 0)");
  });
});
