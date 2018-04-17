const path = require("path");
const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const StylableModulesPlugin = require("../..");

module.exports = {
  mode: "development",//"production",
  devServer: {
    inline: false,
    hot: false
  },
  devtool: false,
  context: __dirname,
  output: {
    path: path.join(__dirname, 'dist'),
    publicPath: "/"
  },
  module: {
    rules: [
      {
        test: /\.(png|jpg|gif)$/,
        use: [
          {
            loader: "url-loader",
            options: {
              limit: 300
            }
          }
        ]
      }
    ]
  },
  plugins: [
    new StylableModulesPlugin({
      createRuntimeChunk: true,
      outputCSS: true,
      includeCSSInJS: false
    }),
    new HtmlWebpackPlugin()
  ]
};
