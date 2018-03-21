const StylableWebpackPlugin = require("../../src/StylableModulesPlugin");
exports.config = {
  entry: `${__dirname}/project1/index.js`,
  plugins: [new StylableWebpackPlugin()]
};
exports.expect = (compilation, done) => {
  done();
};
