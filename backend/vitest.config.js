import { defineConfig } from 'vitest/config';

// NODE_ENV=test is set via cross-env in package.json's test script, not
// here — vitest's own `test.env` option does not reliably set process.env
// early enough to beat config/env.js's module-level dotenv.config() call,
// which picks .env vs .env.test based on NODE_ENV. Getting this wrong
// silently points tests at the dev database instead of the test one.
export default defineConfig({
  test: {
    // Integration tests share one real Postgres database and truncate it
    // in beforeEach (see test/dbHelpers.js) — there's no per-file schema
    // or transaction isolation. Running test files in parallel (vitest's
    // default) lets one file's resetDb() truncate rows another file just
    // inserted, mid-test, producing flaky "foreign key violation" /
    // "record not found" failures that have nothing to do with the code
    // under test. Force sequential file execution instead.
    fileParallelism: false,
  },
});
