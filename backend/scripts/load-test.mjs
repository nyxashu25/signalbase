#!/usr/bin/env node
// Load test for the search and reveal endpoints against a running local
// (or staging) SignalBase backend. Two parts:
//   1. Throughput/latency for the two search endpoints (autocannon).
//   2. A concurrency stress test of the credit-reservation Lua script:
//      many parallel reveal requests racing for the SAME never-before-
//      revealed contact must yield exactly one paid winner and N-1 free
//      "already revealed" responses — never a double charge.
//
// Usage: node scripts/load-test.mjs [baseUrl]
// Requires: backend running with a live Postgres+Redis+Elasticsearch.

import autocannon from 'autocannon';
import { randomUUID } from 'node:crypto';

const BASE_URL = process.argv[2] || 'http://localhost:4000';
const DURATION_SECONDS = 10;
const CONNECTIONS = 10;
const RACE_CONCURRENCY = 20;

async function registerThrowawayAccount() {
  const email = `loadtest-${randomUUID()}@signalbase.local`;
  const res = await fetch(`${BASE_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password: 'correct-horse-battery',
      name: 'Load Test',
      orgName: `Load Test ${Date.now()}`,
    }),
  });
  if (!res.ok) throw new Error(`register failed: ${res.status} ${await res.text()}`);
  const body = await res.json();
  return { accessToken: body.accessToken, workspaceId: body.workspace.id };
}

async function runThroughput(name, path, accessToken) {
  console.log(`\n=== ${name} (${DURATION_SECONDS}s, ${CONNECTIONS} connections) ===`);
  const result = await autocannon({
    url: `${BASE_URL}${path}`,
    connections: CONNECTIONS,
    duration: DURATION_SECONDS,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  console.log(
    `  requests/sec: ${result.requests.average.toFixed(1)}  ` +
      `latency p50/p99: ${result.latency.p50}ms / ${result.latency.p99}ms  ` +
      `errors: ${result.errors}  non-2xx: ${result.non2xx}`,
  );
  return result;
}

async function findAnyContactId(accessToken) {
  const res = await fetch(`${BASE_URL}/api/v1/search/people?pageSize=1`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const body = await res.json();
  if (!body.results?.length) throw new Error('No contacts found — is the database seeded?');
  return body.results[0].id;
}

async function runRevealRaceTest(accessToken) {
  console.log(`\n=== Reveal race: ${RACE_CONCURRENCY} concurrent requests for ONE contact ===`);
  // A fresh throwaway workspace has never revealed anything, so any
  // contact from search results is a valid, never-before-revealed target
  // for *this* workspace — reveals are workspace-scoped, not global.
  const contactId = await findAnyContactId(accessToken);

  const requests = Array.from({ length: RACE_CONCURRENCY }, () =>
    fetch(`${BASE_URL}/api/v1/contacts/${contactId}/reveal`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Idempotency-Key': randomUUID(), // distinct clients, not a retry — this is the actual race
      },
    }).then((r) => r.json()),
  );

  const results = await Promise.all(requests);
  const paid = results.filter((r) => r.alreadyRevealed === false).length;
  const free = results.filter((r) => r.alreadyRevealed === true).length;
  const emails = new Set(results.map((r) => r.email));

  console.log(
    `  paid (charged): ${paid}   free (already revealed): ${free}   unique emails returned: ${emails.size}`,
  );

  if (paid !== 1) {
    throw new Error(
      `Expected exactly 1 paid reveal, got ${paid} — credit reservation is not race-safe`,
    );
  }
  if (emails.size !== 1) {
    throw new Error(
      `Expected all responses to agree on the same email, got ${emails.size} distinct values`,
    );
  }
  console.log('  PASS — exactly one charge under concurrent load, all responses consistent.');
}

async function main() {
  console.log(`Load testing ${BASE_URL}`);
  const { accessToken } = await registerThrowawayAccount();

  await runThroughput('GET /search/companies', '/api/v1/search/companies', accessToken);
  await runThroughput('GET /search/people', '/api/v1/search/people', accessToken);
  await runRevealRaceTest(accessToken);
}

main().catch((err) => {
  console.error('Load test failed:', err.message);
  process.exitCode = 1;
});
