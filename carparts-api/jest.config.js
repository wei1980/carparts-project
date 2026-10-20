/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  // The api suites are node:test files (tests/*.node.cjs) and are executed by
  // `npm test` → scripts/run-node-tests.cjs. This Jest config only applies to
  // any future `*.test.js` suite; it must not abort on the missing setup file
  // (that aborted `npm test` with a Validation Error and made every CI push
  // red) and it must not fail when there is nothing for Jest to run.
  testMatch: ['**/*.test.js'],
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  moduleFileExtensions: ['js', 'json'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/app.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  },
  passWithNoTests: true,
  testTimeout: 30000,
  verbose: true,
  forceExit: true,
  detectOpenHandles: true
};