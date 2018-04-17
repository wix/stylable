const StylableWebpackPlugin = require("../../src/StylableModulesPlugin");
const runIt = require("../run-it");

runIt(
  "working",
  {
    entry: `${__dirname}/project1/index.js`,
    plugins: [new StylableWebpackPlugin()]
  },
  (compilation, done) => {
    done();
  }
);
