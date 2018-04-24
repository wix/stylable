const path = require("path");
const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const StylablePlugin = require("../..");

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
    new StylablePlugin({
      createRuntimeChunk: true,
      outputCSS: true,
      includeCSSInJS: false
    }),
    new HtmlWebpackPlugin()
  ]
};
