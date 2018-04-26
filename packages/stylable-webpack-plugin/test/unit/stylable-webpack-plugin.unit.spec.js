const { expect } = require("chai");
const StylableWebpackPlugin = require("../../src/StylableWebpackPlugin");

describe("StylableWebpackPlugin Unit", () => {
  it("should try load local stylable.config and run options hook", () => {
    class Test extends StylableWebpackPlugin {
      loadLocalStylableConfig(context) {
        expect(context, 'lookup context').to.equal('.');
        return {
          options(options) {
            expect(options.test, 'top level option').to.equal(true);
            return { ...options, fromConfig: true };
          }
        };
      }
    }
    const plugin  = new Test({ test: true });
    
    plugin.overrideOptionsWithLocalConfig('.');

    expect(plugin.options.fromConfig, 'from local config').to.equal(true);
  });
});
