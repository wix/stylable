const StylableWebpackPlugin = require("../../../../src");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  mode: "production",
  context: __dirname,
  devtool: "source-map",
  plugins: [new StylableWebpackPlugin({
    splitCSSByDepth: true,
    includeCSSInJS: false,
  }), new HtmlWebpackPlugin()]
};
