const testFiles = require('glob').sync("./tests/**/*.spec.ts");
const first = testFiles.shift();
const withMochaLoader = [`mocha-loader!${first}`].concat(testFiles);

module.exports = {
    mode: 'development',
    entry: {
        tests: withMochaLoader
    },
    output: {
        filename: '[name].bundle.js'
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js']
    },
    node: {
        fs: 'empty'
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: 'ts-loader',
                options: {
                    compilerOptions: {
                        declaration: false
                    }
                }
            }
        ]
    }
}

