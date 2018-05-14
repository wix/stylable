const StylableWebpackPlugin = require("../../../../src");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  mode: "development",
  context: __dirname,
  devtool: "source-map",
  output: {
    library: "Library",
    libraryTarget: "umd"
  },
  plugins: [
    new StylableWebpackPlugin({
      bootstrap: {
        autoInit: false
      }
    }),
    new HtmlWebpackPlugin()
  ]
};
