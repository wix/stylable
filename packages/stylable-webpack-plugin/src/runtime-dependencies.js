const { StylableImportDependency } = require("./StylableDependencies");
const RENDERER_SYMBOL = "$renderer";
const STYLESHEET_SYMBOL = "$stylesheet";

const rendererDependency = () =>
  new StylableImportDependency(
    require.resolve("./runtime/css-runtime-renderer"),
    {
      defaultImport: "$renderer",
      names: []
    }
  );

const stylesheetDependency = () =>
  new StylableImportDependency(
    require.resolve("./runtime/css-runtime-stylesheet"),
    {
      defaultImport: "$stylesheet",
      names: []
    }
  );

const cssRuntimeRendererRequest = {
  identifier() {
    return require.resolve("./runtime/css-runtime-renderer");
  }
};

module.exports.cssRuntimeRendererRequest = cssRuntimeRendererRequest;
module.exports.stylesheetDependency = stylesheetDependency;
module.exports.rendererDependency = rendererDependency;
module.exports.RENDERER_SYMBOL = RENDERER_SYMBOL;
module.exports.STYLESHEET_SYMBOL = STYLESHEET_SYMBOL;
