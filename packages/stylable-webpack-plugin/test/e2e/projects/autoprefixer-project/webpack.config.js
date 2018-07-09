const StylableWebpackPlugin = require("../../../../src");
const HtmlWebpackPlugin = require("html-webpack-plugin");

const autoprefixer = require('autoprefixer');
const postcss = require('postcss');
const autoprefixProcessor = postcss([autoprefixer]);

module.exports = {
  mode: "development",
  context: __dirname,
  devtool: "source-map",
  plugins: [new StylableWebpackPlugin({
    rootScope: false,
    transformHooks: {
      postProcessor: (stylableResult) => {
        autoprefixProcessor.process(stylableResult.meta.outputAst).sync();
        return stylableResult;
      }
    }
  }), new HtmlWebpackPlugin()]
};