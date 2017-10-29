var glob = require('glob');

const testFiles = glob.sync("./tests/**/*.spec.ts");
const first = testFiles.shift();
const withMochaLoader = [`mocha-loader!${first}`].concat(testFiles);

module.exports = {
    devtool: 'eval',
    entry: {
        tests: withMochaLoader
    },
    output: {
        filename: '[name].bundle.js'
    },
    resolve: {
        // Add `.ts` and `.tsx` as a resolvable extension.
        extensions: ['.ts', '.tsx', '.js'] // note if using webpack 1 you'd also need a '' in the array as well
    },
    node: {
        fs: "empty"
    },
    module: {
        loaders: [ // loaders will work with webpack 1 or 2; but will be renamed "rules" in future
            // all files with a `.ts` or `.tsx` extension will be handled by `ts-loader`
            { test: /\.tsx?$/, loader: 'ts-loader', options: {compilerOptions: {declaration: false}} }
        ]
    }
}

