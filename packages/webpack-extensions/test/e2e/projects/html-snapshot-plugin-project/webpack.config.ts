const HtmlWebpackPlugin = require('html-webpack-plugin');
const StylableWebpackPlugin = require('@stylable/webpack-plugin');
import { createElement as el } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { HTMLSnapshotPlugin } from '../../../../src/stylable-html-snapshot';

module.exports = {
    mode: 'development',
    context: __dirname,
    devtool: 'source-map',
    plugins: [
        new StylableWebpackPlugin(),
        new HTMLSnapshotPlugin({
            outDir: 'snapshots',
            render(module) {
                return renderToStaticMarkup(el(module.Index));
            }
        }),
        new HtmlWebpackPlugin()
    ]
};
