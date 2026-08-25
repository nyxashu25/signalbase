/* eslint-disable no-console */
// Production end-to-end smoke test. Run FROM the deploy box, from backend/:
//
//   node scripts/prod-e2e.mjs
//
// Exercises the real API on 127.0.0.1:4000 (prod env, prod DB) using
// disposable accounts/rows that are all deleted at the end:
//   register -> verify -> login -> me -> search -> reveal (own seeded
//   contact, so no shared data is mutated) -> lists + masking -> saved
//   searches -> onboarding -> billing -> ticket -> invite -> accept ->
//   members -> forgot/reset password -> privacy opt-out -> cleanup.
//
// Tokens that would normally arrive by email (verify/reset) are minted
// in-process with the app's own tokenService — same code path, no inbox
// needed. Sends to *@dp-e2e.test will show as Resend 403s in the API log;
// that's expected (sandbox sender) and non-fatal by design.
import { createHash } from 'node:crypto';

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4000/api/v1';
const STAMP = Date.now();
const OWNER_EMAIL = `e2e-owner-${STAMP}@dp-e2e.test`;
const INVITEE_EMAIL = `e2e-invitee-${STAMP}@dp-e2e.test`;
const OPTOUT_EMAIL = `e2e-optout-${STAMP}@dp-e2e.test`;
const PASSWORD_1 = 'e2e-password-one-1';
const PASSWORD_2 = 'e2e-password-two-2';
const TEST_DOMAIN = `dp-e2e-${STAMP}.example`;

const { prisma } = await import('../src/config/db.js');
const { redis } = await import('../src/config/redis.js');
const { es } = await import('../src/config/elasticsearch.js');
const { CONTACTS_INDEX, COMPANIES_INDEX } = await import('../src/config/esIndices.js');
const tokenService = await import('../src/services/tokenService.js');

let passed = 0;
let failed = 0;
const failures = [];

function check(name, ok, detail = '') {
  if (ok) {
    passed += 1;
    console.log(`  ok   ${name}`);
  } else {
    failed += 1;
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
    console.log(`  FAIL ${name} ${detail}`);
  }
}

async function api(method, path, { token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      // A unique TEST-NET source per run: register/accept-invite/forgot-password
      // share a 5/hour/IP limiter, so back-to-back runs from 127.0.0.1 would
      // rate-limit each other. app.js trusts one proxy hop, so this header is
      // honoured for a direct localhost connection exactly like nginx's.
      'X-Forwarded-For': `203.0.113.${STAMP % 250}`,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(method === 'POST' && path.includes('/reveal')
        ? { 'Idempotency-Key': `e2e-${STAMP}-${path}` }
        : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* 204 etc. */
  }
  return { status: res.status, body: json };
}

function fingerprint(passwordHash) {
  return createHash('sha256').update(passwordHash ?? 'none').digest('hex').slice(0, 16);
}

async function cleanup() {
  console.log('\ncleanup:');
  const users = await prisma.user.findMany({
    where: { email: { in: [OWNER_EMAIL, INVITEE_EMAIL] } },
    include: { memberships: { include: { workspace: true } } },
  });
  const workspaceIds = [...new Set(users.flatMap((u) => u.memberships.map((m) => m.workspaceId)))];
  const orgIds = [...new Set(users.flatMap((u) => u.memberships.map((m) => m.workspace.orgId)))];

  // Org delete cascades workspace -> memberships/lists/ledger/reveals/
  // tickets/invites/onboarding; users go after (List.createdBy is RESTRICT).
  for (const orgId of orgIds) await prisma.org.delete({ where: { id: orgId } }).catch(() => {});
  for (const u of users) await prisma.user.delete({ where: { id: u.id } }).catch(() => {});
  await prisma.dataSubjectOptOut.deleteMany({ where: { email: OPTOUT_EMAIL } });
  // Extension leg: the MissingPerson row is global and not covered by any
  // cascade (LostChild + ApiKey go with the contact/user deletes above).
  await prisma.missingPerson.deleteMany({ where: { linkedinSlug: { startsWith: `e2e-missing-${STAMP}` } } });

  const testContacts = await prisma.contact.findMany({
    where: { company: { domain: TEST_DOMAIN } },
    select: { id: true },
  });
  for (const c of testContacts) {
    await es.delete({ index: CONTACTS_INDEX, id: c.id }, { ignore: [404] }).catch(() => {});
  }
  const testCompany = await prisma.company.findUnique({ where: { domain: TEST_DOMAIN } });
  if (testCompany) {
    await es.delete({ index: COMPANIES_INDEX, id: testCompany.id }, { ignore: [404] }).catch(() => {});
    await prisma.company.delete({ where: { id: testCompany.id } }).catch(() => {});
  }
  for (const wsId of workspaceIds) await redis.del(`credits:balance:${wsId}`).catch(() => {});
  console.log(
    `  removed: ${users.length} users, ${orgIds.length} orgs/workspaces, ` +
      `${testContacts.length + (testCompany ? 1 : 0)} test records, opt-out row`,
  );
}

try {
  console.log(`prod-e2e against ${BASE} as ${OWNER_EMAIL}\n`);

  // --- signup + verification gate ---
  const reg = await api('POST', '/auth/register', {
    body: { email: OWNER_EMAIL, password: PASSWORD_1, name: 'E2E Owner', orgName: 'E2E Probe Org' },
  });
  check('register returns 202 pendingVerification', reg.status === 202 && reg.body.pendingVerification === true, JSON.stringify(reg.body));

  const early = await api('POST', '/auth/login', { body: { email: OWNER_EMAIL, password: PASSWORD_1 } });
  check('login blocked before verification (403)', early.status === 403);

  const ownerRow = await prisma.user.findUnique({ where: { email: OWNER_EMAIL } });
  const verify = await api('POST', '/auth/verify-email', {
    body: { token: tokenService.signEmailVerificationToken(ownerRow.id) },
  });
  check('verify-email issues a session', verify.status === 200 && Boolean(verify.body.accessToken));
  let owner = verify.body.accessToken;
  const workspaceId = verify.body.workspace.id;

  const me = await api('GET', '/auth/me', { token: owner });
  check('me: verified FREE workspace', me.status === 200 && me.body.user.emailVerified === true && me.body.workspace.plan === 'FREE');

  // --- billing baseline ---
  const summary = await api('GET', '/billing/summary', { token: owner });
  check('billing summary: 100 starting credits', summary.status === 200 && summary.body.balance === 100, JSON.stringify(summary.body));

  // --- search (read-only against the real index) ---
  const search = await api('GET', '/search/people?page=1&pageSize=3&sort=relevance', { token: owner });
  check('people search responds', search.status === 200 && Array.isArray(search.body.results));
  const anyMasked = search.body.results.find((c) => c.email && !c.revealed);
  if (anyMasked) check('unrevealed emails are masked', anyMasked.email.includes('*'), anyMasked.email);

  // --- own seeded contact: reveal + phone + list masking ---
  const company = await prisma.company.create({
    data: { name: 'E2E Probe Co', domain: TEST_DOMAIN, industry: 'Testing' },
  });
  const contact = await prisma.contact.create({
    data: {
      companyId: company.id,
      firstName: 'Probe',
      lastName: 'Person',
      title: 'QA Lead',
      phone: '+1 415 555 0000',
    },
  });

  const list = await api('POST', '/lists', { token: owner, body: { name: 'E2E list', type: 'CONTACTS' } });
  check('create list', list.status === 201);
  const addItem = await api('POST', `/lists/${list.body.list.id}/items`, { token: owner, body: { contactId: contact.id } });
  check('add contact to list', addItem.status === 201);
  const listBefore = await api('GET', `/lists/${list.body.list.id}`, { token: owner });
  const itemBefore = listBefore.body.list.items[0].contact;
  check('list detail masks phone before reveal', itemBefore.phone === '+1 415 *** **00' && itemBefore.revealed === false, itemBefore.phone);

  const reveal = await api('POST', `/contacts/${contact.id}/reveal`, { token: owner });
  check('reveal returns email + phone', reveal.status === 200 && reveal.body.email === `probe.person@${TEST_DOMAIN}` && reveal.body.phone === '+1 415 555 0000', JSON.stringify(reveal.body));
  const afterBalance = await api('GET', '/billing/summary', { token: owner });
  check('reveal charged 2 credits', afterBalance.body.balance === 98, String(afterBalance.body.balance));
  const listAfter = await api('GET', `/lists/${list.body.list.id}`, { token: owner });
  check('list detail shows clear phone after reveal', listAfter.body.list.items[0].contact.phone === '+1 415 555 0000');

  // --- saved searches ---
  const saved = await api('POST', '/search/saved', { token: owner, body: { type: 'PEOPLE', name: 'E2E saved', filters: { title: 'qa' } } });
  check('create saved search', saved.status === 201);
  const savedList = await api('GET', '/search/saved?type=PEOPLE', { token: owner });
  check('list saved searches', savedList.status === 200 && savedList.body.savedSearches.some((s) => s.name === 'E2E saved'));

  // --- onboarding hub ---
  const onboarding = await api('GET', '/dashboard/onboarding', { token: owner });
  const doneKeys = onboarding.body.groups.flatMap((g) => g.tasks).filter((t) => t.completed).map((t) => t.key);
  check('onboarding detects reveal/list/saved-search/verify', ['REVEAL_EMAIL', 'ADD_TO_LIST', 'SAVE_SEARCH', 'VERIFY_EMAIL'].every((k) => doneKeys.includes(k)), doneKeys.join(','));
  check('onboarding paid rewards', onboarding.body.creditsEarned >= 15, String(onboarding.body.creditsEarned));
  const stats = await api('GET', '/dashboard/stats', { token: owner });
  check('dashboard stats', stats.status === 200 && stats.body.revealsThisMonth === 1 && stats.body.lists === 1);

  // --- sequences plan gate (FREE) ---
  const seqGate = await api('POST', '/sequences', { token: owner, body: { name: 'E2E seq', steps: [{ type: 'EMAIL', subject: 'x', body: 'y' }] } });
  check('sequence create plan-gated on FREE (403)', seqGate.status === 403, String(seqGate.status));

  // --- tickets ---
  const ticket = await api('POST', '/tickets', { token: owner, body: { type: 'SUPPORT', subject: 'Bug report', body: 'E2E probe ticket — safe to close.' } });
  check('create ticket', ticket.status === 201 && ticket.body.status === 'UNANSWERED');
  const tickets = await api('GET', '/tickets?status=ACTIVE', { token: owner });
  check('ticket list + counts', tickets.status === 200 && tickets.body.counts.ACTIVE === 1);

  // --- invites (seat gate first: FREE = 1 seat) ---
  const blocked = await api('POST', '/workspace/invites', { token: owner, body: { email: INVITEE_EMAIL, role: 'MEMBER' } });
  check('invite blocked on FREE single seat (422)', blocked.status === 422, String(blocked.status));
  await prisma.workspace.update({ where: { id: workspaceId }, data: { seats: 3 } });
  const invite = await api('POST', '/workspace/invites', { token: owner, body: { email: INVITEE_EMAIL, role: 'MEMBER' } });
  check('create invite once seats allow', invite.status === 201 && invite.body.invite.inviteUrl.includes('token='));
  const inviteToken = new URL(invite.body.invite.inviteUrl).searchParams.get('token');
  const info = await api('GET', `/auth/invite?token=${encodeURIComponent(inviteToken)}`);
  check('invite info (public)', info.status === 200 && info.body.accountExists === false && info.body.workspaceName.includes('E2E'));
  const accept = await api('POST', '/auth/accept-invite', { body: { token: inviteToken, name: 'E2E Invitee', password: PASSWORD_1 } });
  check('accept invite -> session in inviting workspace', accept.status === 200 && accept.body.workspace.id === workspaceId && accept.body.role === 'MEMBER');
  const members = await api('GET', '/workspace/members', { token: owner });
  check('members list has both seats', members.body.members.length === 2);
  const replay = await api('POST', '/auth/accept-invite', { body: { token: inviteToken, name: 'X', password: 'xxxxxxxxxx' } });
  check('invite link is single-use (400)', replay.status === 400);

  // --- Chrome extension surface: API key -> observe -> 4-credit reveal ---
  const keyRes = await api('POST', '/api-keys', { token: owner, body: { name: 'E2E extension probe' } });
  check('create API key (dpk_…, shown once)', keyRes.status === 201 && /^dpk_[0-9a-f]{40}$/.test(keyRes.body.key ?? ''));
  const dpk = keyRes.body.key;

  const extMe = await api('GET', '/extension/me', { token: dpk });
  check('extension /me: key auth + reveal price 4', extMe.status === 200 && extMe.body.revealCost === 4, JSON.stringify(extMe.body));
  const jwtOnExt = await api('GET', '/extension/me', { token: owner });
  check('session JWT rejected on /extension (401)', jwtOnExt.status === 401);

  const extSlug = `e2e-ext-probe-${STAMP}`;
  const extContact = await prisma.contact.create({
    data: {
      companyId: company.id,
      firstName: 'Ext',
      lastName: 'Probe',
      title: 'QA Engineer',
      phone: '+1 415 555 0001',
      linkedinUrl: `https://www.linkedin.com/in/${extSlug}`,
      linkedinSlug: extSlug,
    },
  });

  const obs = await api('POST', '/extension/observe', {
    token: dpk,
    // A realistic LinkedIn headline (title + company + fluff). The backend
    // must distil it to the clean title "Head of QA" for the comparison and
    // for storage — proving title extraction against the live API.
    body: { linkedinUrl: `https://www.linkedin.com/in/${extSlug}?utm_source=e2e`, jobTitle: 'Head of QA at BigCorp | ex-Google | speaker', companyName: 'BigCorp' },
  });
  check('observe known -> found, masked, cost 4', obs.status === 200 && obs.body.status === 'found' && obs.body.cost === 4 && obs.body.contact.revealed === false, JSON.stringify({ status: obs.body?.status, cost: obs.body?.cost }));
  check('observe reported the title change', obs.body.titleChangeReported === true);
  const lostChildRow = await prisma.lostChild.findFirst({ where: { contactId: extContact.id, status: 'PENDING' } });
  check('LostChild stores the CLEAN extracted title (not the headline)', Boolean(lostChildRow) && lostChildRow.newTitle === 'Head of QA', lostChildRow?.newTitle);

  // Same title dressed up as a headline must NOT re-flag (false-positive guard).
  const sameTitle = await api('POST', '/extension/observe', {
    token: dpk,
    body: { linkedinUrl: `https://www.linkedin.com/in/${extSlug}`, jobTitle: 'QA Engineer at BigCorp | mentor' },
  });
  check('headline of the SAME stored title reports no change', sameTitle.body.titleChangeReported === false, String(sameTitle.body?.titleChangeReported));

  const missSlug = `e2e-missing-${STAMP}`;
  const miss = await api('POST', '/extension/observe', {
    token: dpk,
    // location/companyName deliberately null: the content script reports
    // unparsed fields as null, and this exact shape once 400'd in prod
    // (validator used .optional() instead of .nullish()).
    body: { linkedinUrl: `https://www.linkedin.com/in/${missSlug}`, name: 'E2E Missing', jobTitle: 'Ghost', location: null, companyName: null },
  });
  check('observe unknown (with null parsed fields) -> queued (Pending peoples)', miss.status === 200 && miss.body.status === 'not_found' && miss.body.queued === true, JSON.stringify(miss.body));

  const balBeforeExt = (await api('GET', '/billing/summary', { token: owner })).body.balance;
  const extReveal = await api('POST', `/extension/contacts/${extContact.id}/reveal`, { token: dpk });
  const balAfterExt = (await api('GET', '/billing/summary', { token: owner })).body.balance;
  check('extension reveal returns email + phone', extReveal.status === 200 && Boolean(extReveal.body.email) && extReveal.body.phone === '+1 415 555 0001', JSON.stringify(extReveal.body));
  check('extension reveal charged 4 credits', balBeforeExt - balAfterExt === 4, `${balBeforeExt} -> ${balAfterExt}`);
  const extLedger = await prisma.creditLedgerEntry.findFirst({ where: { workspaceId, reason: 'EXTENSION_REVEAL' } });
  check('ledger reason EXTENSION_REVEAL', Boolean(extLedger) && extLedger.delta === -4);

  const keyGone = await api('DELETE', `/api-keys/${keyRes.body.id}`, { token: owner });
  const afterRevoke = await api('GET', '/extension/me', { token: dpk });
  check('revoked key stops working (401)', keyGone.status === 200 && afterRevoke.status === 401);

  // --- forgot / reset password ---
  const forgot = await api('POST', '/auth/forgot-password', { body: { email: OWNER_EMAIL } });
  check('forgot-password enumeration-safe 200', forgot.status === 200 && forgot.body.sent === true);
  const ownerNow = await prisma.user.findUnique({ where: { email: OWNER_EMAIL } });
  const resetToken = tokenService.signPasswordResetToken(ownerNow.id, fingerprint(ownerNow.passwordHash));
  const reset = await api('POST', '/auth/reset-password', { body: { token: resetToken, newPassword: PASSWORD_2 } });
  check('reset-password succeeds', reset.status === 200 && reset.body.reset === true);
  const oldLogin = await api('POST', '/auth/login', { body: { email: OWNER_EMAIL, password: PASSWORD_1 } });
  check('old password rejected', oldLogin.status === 401);
  const newLogin = await api('POST', '/auth/login', { body: { email: OWNER_EMAIL, password: PASSWORD_2 } });
  check('new password logs in', newLogin.status === 200);
  owner = newLogin.body.accessToken;
  const replayReset = await api('POST', '/auth/reset-password', { body: { token: resetToken, newPassword: 'attacker-pw-123' } });
  check('reset link single-use (400)', replayReset.status === 400);

  // --- privacy opt-out ---
  const optout = await api('POST', '/privacy/opt-out', { body: { email: OPTOUT_EMAIL, reason: 'e2e probe' } });
  check('privacy opt-out accepted (202)', optout.status === 202, String(optout.status));
  const optRow = await prisma.dataSubjectOptOut.findUnique({ where: { email: OPTOUT_EMAIL } });
  check('opt-out registered', Boolean(optRow));
} catch (err) {
  failed += 1;
  failures.push(`unhandled: ${err.message}`);
  console.error('UNHANDLED', err);
} finally {
  await cleanup().catch((err) => console.error('cleanup failed:', err.message));
  console.log(`\nresult: ${passed} passed, ${failed} failed`);
  for (const f of failures) console.log(`  - ${f}`);
  await prisma.$disconnect().catch(() => {});
  redis.disconnect();
  process.exit(failed === 0 ? 0 : 1);
}
