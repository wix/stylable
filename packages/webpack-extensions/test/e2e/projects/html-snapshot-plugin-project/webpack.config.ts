import HtmlWebpackPlugin from 'html-webpack-plugin';
import { StylableWebpackPlugin } from '@stylable/webpack-plugin';
import { createElement as el } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { HTMLSnapshotPlugin } from '../../../../src/stylable-html-snapshot';

export default {
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
            render(module: any) {
                return renderToStaticMarkup(el(module.Index));
            },
        }),
        new HtmlWebpackPlugin(),
    ],
};
