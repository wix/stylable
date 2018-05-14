const { expect } = require("chai");
const { join } = require("path");
const { ProjectRunner } = require("./helpers/project-runner");
const {
  browserFunctions,
  filterAssetResponses
} = require("./helpers/puppeteer-helpers");

const projectFixtures = join(__dirname, "projects");

describe("(library-project)", () => {
  const projectRunner = ProjectRunner.mochaSetup(
    {
      projectDir: join(projectFixtures, "library-project"),
      port: 3001,
      puppeteerOptions: {
        // headless: false
      }
    },
    before,
    afterEach,
    after
  );

  it("eval bundle exports", async () => {
    const global = {};

    new Function(
      ["window"],
      projectRunner.stats.compilation.assets["main.js"].source()
    )(global);

    expect(Object.keys(global.Library)).to.eql(["Label", "Button"]);
  });
});
