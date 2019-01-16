const StylableWebpackPlugin = require("../../../../src");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  mode: "production",
  context: __dirname,
  devtool: "source-map",
  plugins: [new StylableWebpackPlugin({
    useEntryModuleInjection: true,
    useWeakDeps: true,
    includeDynamicModulesInCSS: true
  }), new HtmlWebpackPlugin()]
};
