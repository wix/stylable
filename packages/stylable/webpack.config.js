var glob = require('glob');

module.exports = {
    entry: {
        test: glob.sync("./tests/**/*.spec.ts")
    },
    output: {
        filename: '[name]-bundle.js'
    },
    resolve: {
        // Add `.ts` and `.tsx` as a resolvable extension.
        extensions: ['.ts', '.tsx', '.js'] // note if using webpack 1 you'd also need a '' in the array as well
    },
    module: {
        loaders: [ // loaders will work with webpack 1 or 2; but will be renamed "rules" in future
            // all files with a `.ts` or `.tsx` extension will be handled by `ts-loader`
            {
                test: /spec.tsx?$/,
                use: 'mocha-loader',
                exclude: /node_modules/,
            },
            { test: /\.tsx?$/, loader: 'ts-loader' }
        ]
    }
}

