const { baseConfig } = require('../../webpack-config-browser/webpack.config.base');
const [first, ...tests] = require('glob').sync('./test/**/*.spec.ts');

const config = baseConfig();
config.entry = { tests: [`mocha-loader!${first}`, ...tests] };
module.exports = config;
