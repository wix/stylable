const StylableWebpackPlugin = require('@stylable/webpack-plugin/src');
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  mode: "production",
  context: __dirname,
  devtool: "source-map",
  plugins: [new StylableWebpackPlugin(), new HtmlWebpackPlugin()]
};
