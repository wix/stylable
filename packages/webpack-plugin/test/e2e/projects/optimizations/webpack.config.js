const StylableWebpackPlugin = require("../../../../src");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  mode: "development",
  context: __dirname,
  devtool: "source-map",
  plugins: [
    new StylableWebpackPlugin({ 
      optimize: {
        removeUnusedComponents: true,
        removeComments: true,
        removeStylableDirectives: true,
        classNameOptimizations: true,
        shortNamespaces: true,
        removeEmptyNodes: true,
        minify: true        
      }
    }),
    new HtmlWebpackPlugin()
  ]
};
