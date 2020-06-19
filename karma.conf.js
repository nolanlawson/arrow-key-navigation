const resolve = require('@rollup/plugin-node-resolve').default
const cjs = require('@rollup/plugin-commonjs')
const json = require('@rollup/plugin-json')
const polyfills = require('rollup-plugin-node-polyfills')
const istanbul = require('rollup-plugin-istanbul')

module.exports = function (config) {
  config.set({
    plugins: [
      require('karma-rollup-preprocessor'),
      require('karma-mocha'),
      require('karma-chrome-launcher'),
      ...(process.env.COVERAGE ? [require('karma-coverage')] : [])
    ],

    files: [
      'test/test.js'
    ],

    preprocessors: {
      'test/test.js': ['rollup']
    },

    rollupPreprocessor: {
      plugins: [
        resolve({
          mainFields: ['browser', 'module', 'main'],
          preferBuiltins: false
        }),
        cjs(),
        json(),
        polyfills(),
        ...(process.env.COVERAGE ? [
          istanbul ({
            exclude: [
              'test/*.js',
              'node_modules/**/*.js'
            ]
          })
        ] : [])
      ],
      output: {
        format: 'iife', // Helps prevent naming collisions.
        name: 'Test', // Required for 'iife' format.
        sourcemap: 'inline' // Sensible for testing.
      }
    },

    frameworks: ['mocha'],

    browsers: [
      'ChromeHeadless'
    ],
    ...(process.env.COVERAGE ? {
      reporters: ['coverage']
    } : null)
  })
}
