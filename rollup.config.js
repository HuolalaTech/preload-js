import typescript from 'rollup-plugin-typescript2';
import external from 'rollup-plugin-peer-deps-external';
import babel from '@rollup/plugin-babel';
import { builtinModules } from 'module';
import { DEFAULT_EXTENSIONS } from '@babel/core';

import pkg from './package.json';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: pkg.main,
      format: 'cjs',
      sourcemap: true,
    },
    {
      file: pkg.module,
      format: 'esm',
      sourcemap: true,
    },
  ],
  plugins: [
    external(),
    typescript(),
    babel({
      exclude: 'node_modules/**',
      babelHelpers: 'runtime',
      extensions: [...DEFAULT_EXTENSIONS, '.ts', '.tsx'],
    }),
    // babel({
    //   exclude: 'node_modules/**',
    //   babelHelpers: 'runtime',
    //   extensions: [...DEFAULT_EXTENSIONS, '.ts', '.tsx'],
    // })
  ],
  external: [
    ...builtinModules,
    ...(pkg.dependencies == null ? [] : Object.keys(pkg.dependencies)),
    ...(pkg.devDependencies == null ? [] : Object.keys(pkg.devDependencies)),
    ...(pkg.peerDependencies == null ? [] : Object.keys(pkg.peerDependencies)),
    // 对于 @babel/runtime 使用正则来排除
    /@babel\/runtime/,
  ],
};
