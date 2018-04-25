const { expect } = require("chai");
const { join } = require("path");
const { ProjectRunner } = require("./helpers/project-runner");
const {
  browserFunctions,
  filterAssetResponses
} = require("./helpers/puppeteer-helpers");

const projectFixtures = join(__dirname, "projects");

describe("(bad-project)", () => {
  const projectRunner = ProjectRunner.mochaSetup(
    {
      projectDir: join(projectFixtures, "bad-project"),
      port: 3001,
      throwOnBuildError: false,
      puppeteerOptions: {
        // headless: false
      }
    },
    before,
    afterEach,
    after
  );

  it("reports warnings", async () => {
    const warnings = projectRunner.getBuildWarningMessages();
    const expected = [/Could not resolve 'unknown'/, /unknown var "xxx"/];
    expect(warnings.length).to.equal(2);
    warnings.forEach((warning, i) => {
      expect(warning).to.match(expected[i]);
    });
  });
});
