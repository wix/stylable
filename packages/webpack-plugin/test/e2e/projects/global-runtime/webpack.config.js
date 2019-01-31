const StylableWebpackPlugin = require("../../../../src");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  mode: "development",
  context: __dirname,
  devtool: "source-map",
  entry: {
    main: './src/index.js',
    main2: './src/index2.js'
  },
  plugins: [new StylableWebpackPlugin({
    runtimeMode: 'shared'
  }), new HtmlWebpackPlugin()]
};
