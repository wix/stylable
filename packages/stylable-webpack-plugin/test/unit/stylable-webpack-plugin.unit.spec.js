const { expect } = require("chai");
const StylableWebpackPlugin = require("../../src/StylableWebpackPlugin");

describe("StylableWebpackPlugin Unit", () => {
  it("should try load local stylable.config and run options hook", () => {
    class Test extends StylableWebpackPlugin {
      loadLocalStylableConfig() {
        return {
          options(options) {
            expect(options.test, 'top level option').to.equal(true);
            return { ...options, fromConfig: true };
          }
        };
      }
    }

    expect(new Test({ test: true }).options.fromConfig, 'from local config').to.equal(true);
  });
});
