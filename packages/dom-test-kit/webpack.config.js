const { baseConfig } = require('../../webpack-config-browser/webpack.config.base');
const [first, ...tests] = require('glob').sync('./dist/test/**/*.spec.js');

module.exports = { ...baseConfig(), entry: { tests: [`mocha-loader!${first}`, ...tests] } };
