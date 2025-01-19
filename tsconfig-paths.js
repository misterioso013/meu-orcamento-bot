const tsconfig = require('./tsconfig.json');
const { resolve } = require('path');

const baseUrl = './dist';
const cleanup = path => path.replace(/^src\//, '');

module.exports = {
  baseUrl,
  paths: Object.entries(tsconfig.compilerOptions.paths).reduce(
    (acc, [key, [value]]) => ({
      ...acc,
      [key]: [resolve(baseUrl, cleanup(value))],
    }),
    {}
  ),
};