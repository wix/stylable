const { StylableWebpackPlugin } = require('@stylable/webpack-plugin/src');
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  mode: "production",
  context: __dirname,
  devtool: "source-map",
  target: "node",
  output: {
    library: 'testPackage',
    libraryTarget: 'commonjs'
  },
  plugins: [
    new StylableWebpackPlugin({
      outputCSS: true, 
      includeCSSInJS: false,
      optimize: {
        removeUnusedComponents: false,
        classNameOptimizations: false,
        shortNamespaces: false,
        minify: false
      }
    }),
    new HtmlWebpackPlugin()
  ]
};
