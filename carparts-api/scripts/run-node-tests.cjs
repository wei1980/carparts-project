#!/usr/bin/env node
// Runs the carparts-api DB-free test suites with node:test.
//
// The api suites are `tests/*.node.cjs` files written against node:test — NOT
// Jest. `jest.config.js`'s testMatch ('**/*.test.js') never matched them, and
// its setupFilesAfterEnv pointed at a file that did not exist, so `npm test`
// aborted with a Validation Error before running anything (and CI ran
// `npm test` for the api job → every push was red).
//
// This runner discovers the suites itself and execs `node --test <files>`,
// which works on Node 18/20 (the CI matrix) where `node --test <glob>` is
// not supported. Exit code mirrors the test run.
const { readdirSync } = require('node:fs');
const { join } = require('node:path');
const { spawnSync } = require('node:child_process');

const TESTS_DIR = join(__dirname, '..', 'tests');
const files = readdirSync(TESTS_DIR)
  .filter((f) => f.endsWith('.node.cjs'))
  .sort()
  .map((f) => join(TESTS_DIR, f));

if (!files.length) {
  console.error(`no *.node.cjs test files found in ${TESTS_DIR}`);
  process.exit(1);
}

const extraArgs = process.argv.slice(2);
console.log(`[run-node-tests] ${files.length} suite(s): ${files.map((f) => f.split(/[\\/]/).pop()).join(', ')}`);
const res = spawnSync(process.execPath, ['--test', ...extraArgs, ...files], { stdio: 'inherit' });
process.exit(res.status === null ? 1 : res.status);
