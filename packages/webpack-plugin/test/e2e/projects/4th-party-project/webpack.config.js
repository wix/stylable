const StylableWebpackPlugin = require("../../../../src");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  mode: "development",
  context: __dirname,
  devtool: "source-map",
  plugins: [new StylableWebpackPlugin({
    optimize: {
      removeUnusedComponents: false,
      shortNamespaces: false
    }
  }), new HtmlWebpackPlugin()]
};
