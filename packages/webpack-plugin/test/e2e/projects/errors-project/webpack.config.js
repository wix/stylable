const { StylableWebpackPlugin } = require('@stylable/webpack-plugin');

module.exports = {
    mode: 'development',
    context: __dirname,
    devtool: 'source-map',
    plugins: [
        new StylableWebpackPlugin({ diagnosticsMode: 'auto' }),
    ],
};
