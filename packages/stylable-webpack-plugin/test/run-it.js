const webpack = require("webpack");

module.exports = function runIt(test, config, expect) {
  it(test, done => {
    compiler = webpack(config);
    compiler.run((err, { compilation }) => {
      if (err) {
        done(err);
      }
      expect(compilation, done);
    });
  });
};
