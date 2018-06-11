const { expect } = require("chai");
const { join } = require("path");
const { 
  StylableProjectRunner: ProjectRunner,
  browserFunctions
} = require("stylable-build-test-kit");

const projectFixtures = join(__dirname, "projects");

describe("(4th-party-project)", () => {
  const projectRunner = ProjectRunner.mochaSetup(
    {
      projectDir: join(projectFixtures, "4th-party-project"),
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
    // TODO: add expect
  });


});
