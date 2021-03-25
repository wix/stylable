const { stylableRollupPlugin } = require('@stylable/rollup-plugin');
const { nodeResolve } = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const html = require('@rollup/plugin-html');
const image = require('@rollup/plugin-image');
const replace = require('@rollup/plugin-replace');
const rollupTypescript = require('@rollup/plugin-typescript');
const copy = require('rollup-plugin-copy');
const serve = require('rollup-plugin-serve');

const productionMode = process.env.MODE === 'production';

/** @type {import('rollup').RollupOptions} */
module.exports = {
  input: 'src/index.tsx',
  output: {
    file: 'dist/bundle.js',
    format: 'umd',
    sourcemap: !productionMode,
  },

  plugins: [
    replace({
      'process.env.NODE_ENV': JSON.stringify('production'),
      preventAssignment: true,
    }),
    image(),
    nodeResolve(),
    commonjs(),
    html({}),
    rollupTypescript(),
    stylableRollupPlugin({ optimization: { minify: productionMode } }),
    copy({
      targets: [{ src: 'favicon.ico', dest: 'dist' }],
    }),
    !productionMode &&
      serve({
        open: true,
        contentBase: ['dist'],
        port: 3000,
      }),
  ],
};
