const { StylableWebpackPlugin } = require('@stylable/webpack-plugin/src');
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  mode: "development",
  context: __dirname,
  devtool: "source-map",
  resolve: {
    extensions: ['.ts', '.js', '.json']
  },
  plugins: [new StylableWebpackPlugin(), new HtmlWebpackPlugin()]
};
