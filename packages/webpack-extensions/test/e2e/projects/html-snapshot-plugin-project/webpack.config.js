const React = require('react');
const ReactDOMServer = require('react-dom/server');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { StylableWebpackPlugin } = require('@stylable/webpack-plugin');
const { HTMLSnapshotPlugin } = require('@stylable/webpack-extensions');

/** @type import('webpack').Configuration */
module.exports = {
    mode: 'development',
    context: __dirname,
    devtool: 'source-map',
    plugins: [
        new StylableWebpackPlugin({
            optimize: {
                shortNamespaces: true,
            },
        }),
        new HTMLSnapshotPlugin({
            outDir: 'snapshots',
            render(module) {
                return ReactDOMServer.renderToStaticMarkup(React.createElement(module.Index));
            },
        }),
        new HtmlWebpackPlugin(),
    ],
};
