//@ts-check
const { join } = require('path');
const { createDefaultResolver } = require('@stylable/core');
const { TsconfigPathsPlugin } = require('tsconfig-paths-webpack-plugin');

module.exports = {
    defaultConfig(fs) {
        return {
            resolveModule: createDefaultResolver(fs, {
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
