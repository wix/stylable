const webpack = require("webpack");
const fs = require("fs");

describe("stylable-webpack-plugin", () => {
  fs
    .readdirSync(__dirname + "/webpack-tests")
    .filter(_ => _.endsWith("test.config.js"))
    .forEach(test => {
      it(test, done => {
        const {
          config,
          expect
        } = require(`${__dirname}/webpack-tests/${test}`);
        compiler = webpack(config);
        compiler.run((err, { compilation }) => {
          if (err) {
            done(err);
          }
          expect(compilation, done);
        });
      });
    });
});
