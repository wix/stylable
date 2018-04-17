const webpack = require("webpack");
const fs = require("fs");
const runIt = require("./run-it");

const tests = fs
  .readdirSync(__dirname + "/webpack-tests")
  .filter(_ => _.endsWith("test.config.js"));

describe("stylable-webpack-plugin", () => {
  tests.forEach(test => {
    require(`${__dirname}/webpack-tests/${test}`);
  });
});
