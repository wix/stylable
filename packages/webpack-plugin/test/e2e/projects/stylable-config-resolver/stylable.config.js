//@ts-check
const { join } = require('path');
const { createWebpackResolver } = require('@stylable/webpack-plugin');
const { TsconfigPathsPlugin } = require('tsconfig-paths-webpack-plugin');

module.exports = {
    defaultConfig(fs) {
        return {
            resolveModule: createWebpackResolver(fs, {
                alias: {
                    'wp-alias': join(__dirname, 'src/webpack-alias'),
                },
                plugins: [
                    new TsconfigPathsPlugin({
                        configFile: require.resolve('./tsconfig.json'),
                        extensions: ['.st.css'],
                    }),
                ],
            }),
        };
    },
};
