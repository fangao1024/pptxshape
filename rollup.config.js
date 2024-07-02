import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { babel } from '@rollup/plugin-babel';
import eslint from '@rollup/plugin-eslint';
import json from '@rollup/plugin-json';
import ts from '@rollup/plugin-typescript';

const onwarn = (warning) => {
    if (warning.code === 'CIRCULAR_DEPENDENCY') return;
    console.warn(`(!) ${warning.message}`); // eslint-disable-line
};

export default {
    input: 'src/index.ts',
    onwarn,
    output: [
        {
            file: 'dist/index.umd.js',
            format: 'umd',
            name: 'pptxShapes',
            sourcemap: true,
        },
        {
            file: 'dist/index.js',
            format: 'es',
            sourcemap: true,
        },
    ],
    plugins: [
        ts({
            tsconfig: 'tsconfig.json',
            declaration: true,
            declarationDir: 'dist/types',
        }),
        nodeResolve({
            preferBuiltins: false,
        }),
        commonjs(),
        eslint(),
        json(),
        babel({
            babelHelpers: 'runtime',
            exclude: ['node_modules/**'],
        }),
    ],
};
