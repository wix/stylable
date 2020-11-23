const { baseConfig } = require('../../webpack-config-browser/webpack.config.base');
const [first, ...tests] = require('glob').sync('./test/**/*.spec.ts');

module.exports = { ...baseConfig(), entry: { tests: [`mocha-loader!${first}`, ...tests] } };
