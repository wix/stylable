const { expect } = require("chai");
const { join } = require("path");
const { ProjectRunner } = require("./helpers/project-runner");
const {
  browserFunctions,
  filterAssetResponses
} = require("./helpers/puppeteer-helpers");

const projectFixtures = join(__dirname, "projects");

describe.only("(raw-project)", () => {
  const projectRunner = ProjectRunner.mochaSetup(
    {
      projectDir: join(projectFixtures, "raw-project"),
      port: 3001,
      puppeteerOptions: {
        // headless: false
      }
    },
    before,
    afterEach,
    after
  );

  it("loading is working for raw-loader", async () => {
    const { page } = await projectRunner.openInBrowser();
    const text = await page.evaluate(() => {
      return document.body.textContent
    });
    expect(text).to.match(/\/\* CONTENT \*\//);
    expect(projectRunner.getBuildWarningMessages()[0]).to.match(/Loading a Stylable stylesheet via webpack loaders is not supported and may cause runtime errors\.\n".*?" in ".*?"/);
  });
});
