// @ts-check

import { stylableRollupPlugin } from '@stylable/rollup-plugin';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import html from '@rollup/plugin-html';
import image from '@rollup/plugin-image';
import replace from '@rollup/plugin-replace';
import rollupTypescript from '@rollup/plugin-typescript';
import copy from 'rollup-plugin-copy';
import serve from 'rollup-plugin-serve';

const isProductionMode = process.env.NODE_ENV === 'production';

/** @type {import('rollup').RollupOptions} */
export default {
    input: 'src/index.tsx',
    output: {
        file: 'dist/bundle.js',
        format: 'umd',
        sourcemap: !isProductionMode,
    },
    plugins: [
        replace({
            'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
            preventAssignment: true,
        }),
        image(),
        nodeResolve(),
        commonjs(),
        html({}),
        rollupTypescript({ compilerOptions: { sourceMap: !isProductionMode } }),
        stylableRollupPlugin({ stcConfig: true, optimization: { minify: isProductionMode } }),
        copy({
            targets: [{ src: 'favicon.ico', dest: 'dist' }],
        }),
        !isProductionMode &&
            serve({
                open: true,
                contentBase: ['dist'],
                port: 3000,
            }),
    ],
};
