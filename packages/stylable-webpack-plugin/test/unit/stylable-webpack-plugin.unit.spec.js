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
    const plugin = new Test({ test: true });
    plugin.normalizeOptions();
    plugin.overrideOptionsWithLocalConfig('.');

    expect(plugin.options.fromConfig, 'from local config').to.equal(true);
  });
  it("should have default options for production mode", () => {
    const plugin = new StylableWebpackPlugin();
    plugin.normalizeOptions('production');
    expect(plugin.options).to.deep.include({
      outputCSS: true,
      includeCSSInJS: false,
      optimize: {
        removeComments: true,
        shortNamespaces: true,
        classNameOptimizations: true,
        removeStylableDirectives: true,
        removeUnusedComponents: true
      }
    });
  });
  it("user options are stronger then default production mode", () => {
    const plugin = new StylableWebpackPlugin({
      outputCSS: false,
      optimize: {
        removeComments: false,
      }
    });
    plugin.normalizeOptions('production');
    expect(plugin.options).to.deep.include({
      outputCSS: false,
      includeCSSInJS: false,
      optimize: {
        removeComments: false,
        shortNamespaces: true,
        classNameOptimizations: true,
        removeStylableDirectives: true,
        removeUnusedComponents: true
      }
    });
  });
});
