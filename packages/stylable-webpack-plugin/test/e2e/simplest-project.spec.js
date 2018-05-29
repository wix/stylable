const { expect } = require("chai");
const { join } = require("path");
const { 
  StylableProjectRunner: ProjectRunner,
  browserFunctions
} = require("stylable-build-test-kit");

const projectFixtures = join(__dirname, "projects");

describe("(simplest-project)", () => {
  const projectRunner = ProjectRunner.mochaSetup(
    {
      projectDir: join(projectFixtures, "simplest-project"),
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
      browserFunctions.getStyleElementsMetadata
    );

    expect(styleElements).to.eql([{ id: "./src/index.st.css", depth: "1" }]);
  });

  it("css is injected before entry running", async () => {
    const { page } = await projectRunner.openInBrowser();
    const backgroundColor = await page.evaluate(() => {
      return window.backgroundColorAtLoadTime;
    });

    expect(backgroundColor).to.eql("rgb(255, 0, 0)");
  });

  it("css is working", async () => {
    const { page } = await projectRunner.openInBrowser();
    const backgroundColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).backgroundColor;
    });

    expect(backgroundColor).to.eql("rgb(255, 0, 0)");
  });
});
