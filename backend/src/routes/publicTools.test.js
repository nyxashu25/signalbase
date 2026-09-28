import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { resetDb, resetRedis } from '../test/dbHelpers.js';
import { prisma } from '../config/db.js';
import { redis } from '../config/redis.js';
import { checkEmail } from '../services/emailCheckService.js';

// DNS is mocked for the whole file (vi.mock is hoisted above the imports)
// — the verifier must never reach the network in tests. Every test sets
// the answers it needs via setDns().
const dns = vi.hoisted(() => ({ resolveMx: vi.fn(), resolve4: vi.fn(), resolve6: vi.fn() }));
vi.mock('node:dns/promises', () => ({
  Resolver: class {
    resolveMx(domain) {
      return dns.resolveMx(domain);
    }
    resolve4(domain) {
      return dns.resolve4(domain);
    }
    resolve6(domain) {
      return dns.resolve6(domain);
    }
  },
}));

const app = createApp();

const dnsError = (code) => Object.assign(new Error(`query ${code}`), { code });

function setDns({ mx = dnsError('ENODATA'), a = dnsError('ENODATA'), aaaa = dnsError('ENODATA') }) {
  const answer = (value) => async () => {
    if (value instanceof Error) throw value;
    return value;
  };
  dns.resolveMx.mockImplementation(answer(mx));
  dns.resolve4.mockImplementation(answer(a));
  dns.resolve6.mockImplementation(answer(aaaa));
}

const HAS_MX = { mx: [{ exchange: 'mx1.example-mail.net', priority: 10 }] };

const verify = (email, ip = '203.0.113.10') =>
  request(app).post('/api/v1/public/tools/verify-email').set('X-Forwarded-For', ip).send({ email });

const find = (body, ip = '203.0.113.20') =>
  request(app).post('/api/v1/public/tools/find-email').set('X-Forwarded-For', ip).send(body);

/** A company plus contacts given as [firstName, lastName, email, extraFields?]. */
async function makeCompany(domain, contacts, fields = {}) {
  const company = await prisma.company.create({
    data: { name: fields.name ?? domain, domain, ...fields },
  });
  if (contacts.length) {
    await prisma.contact.createMany({
      data: contacts.map(([firstName, lastName, email, extra]) => ({
        companyId: company.id,
        firstName,
        lastName,
        email,
        ...extra,
      })),
    });
  }
  return company;
}

// Five first.last addresses — the minimum for a company to qualify.
const FIVE_FIRST_LAST = [
  ['Alex', 'Smith', 'alex.smith@acme.com'],
  ['Blake', 'Jones', 'blake.jones@acme.com'],
  ['Casey', 'Brown', 'casey.brown@acme.com'],
  ['Drew', 'Wilson', 'drew.wilson@acme.com'],
  ['Evan', 'Taylor', 'evan.taylor@acme.com'],
];

beforeEach(async () => {
  await resetDb();
  await resetRedis();
  vi.resetAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('POST /public/tools/verify-email', () => {
  it('needs no auth and returns valid/ok for a well-formed address whose domain has MX records', async () => {
    setDns({
      mx: [
        { exchange: 'alt2.mx.acme.com', priority: 30 },
        { exchange: 'MX1.acme.com.', priority: 10 },
        { exchange: 'alt1.mx.acme.com', priority: 20 },
      ],
      a: ['192.0.2.1'],
    });

    const res = await verify('  Jane.Doe@ACME.com ');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      email: 'Jane.Doe@acme.com',
      verdict: 'valid',
      reason: 'ok',
      checks: {
        syntax: true,
        domainExists: true,
        mxRecords: true,
        disposable: false,
        roleAccount: false,
        freeProvider: false,
      },
      mxHosts: ['mx1.acme.com', 'alt1.mx.acme.com', 'alt2.mx.acme.com'],
      note: expect.any(String),
    });
    expect(dns.resolveMx).toHaveBeenCalledWith('acme.com');
  });

  it('returns at most five MX hosts, lowest priority value first', async () => {
    setDns({
      mx: [7, 3, 5, 1, 6, 2, 4].map((n) => ({ exchange: `mx${n}.acme.com`, priority: n * 10 })),
    });

    const res = await verify('jane@acme.com');

    expect(res.body.mxHosts).toEqual([
      'mx1.acme.com',
      'mx2.acme.com',
      'mx3.acme.com',
      'mx4.acme.com',
      'mx5.acme.com',
    ]);
  });

  it.each([
    'not-an-email',
    'jane@acme',
    'jane@@acme.com',
    'jane doe@acme.com',
    '.jane@acme.com',
    'jane@-acme.com',
  ])('returns invalid/invalid_syntax for %j without a DNS lookup', async (email) => {
    const res = await verify(email);

    expect(res.status).toBe(200);
    expect(res.body.verdict).toBe('invalid');
    expect(res.body.reason).toBe('invalid_syntax');
    expect(res.body.checks.syntax).toBe(false);
    expect(res.body.mxHosts).toEqual([]);
    expect(res.body.note).toEqual(expect.any(String));
    expect(dns.resolveMx).not.toHaveBeenCalled();
  });

  it('returns invalid/no_domain when the domain has no MX and no A/AAAA records', async () => {
    setDns({ mx: dnsError('ENOTFOUND'), a: dnsError('ENOTFOUND'), aaaa: dnsError('ENOTFOUND') });

    const res = await verify('jane@no-such-domain-xyz.com');

    expect(res.body).toMatchObject({
      verdict: 'invalid',
      reason: 'no_domain',
      checks: { syntax: true, domainExists: false, mxRecords: false },
      mxHosts: [],
    });
  });

  it('treats a domain with no MX, A or AAAA answers (NODATA) as no_domain too', async () => {
    setDns({});

    const res = await verify('jane@parked-nothing.com');

    expect(res.body).toMatchObject({ verdict: 'invalid', reason: 'no_domain' });
  });

  it('returns risky/no_mail_server when there is no MX but an A/AAAA record exists', async () => {
    setDns({ mx: dnsError('ENODATA'), a: dnsError('ENODATA'), aaaa: ['2001:db8::1'] });

    const res = await verify('jane@website-only.com');

    expect(res.body).toMatchObject({
      verdict: 'risky',
      reason: 'no_mail_server',
      checks: { domainExists: true, mxRecords: false },
      mxHosts: [],
    });
  });

  it.each(['ETIMEOUT', 'ESERVFAIL', 'ECONNREFUSED'])(
    'treats a DNS %s as "couldn\'t check" (risky/no_mail_server), not as a missing domain',
    async (code) => {
      setDns({ mx: dnsError(code), a: dnsError(code), aaaa: dnsError(code) });

      const res = await verify('jane@slow-dns.com');

      expect(res.body).toMatchObject({ verdict: 'risky', reason: 'no_mail_server' });
      expect(res.body.note).toMatch(/couldn.t check/i);
    },
  );

  it('does not call a domain missing when the MX lookup is NODATA but the address lookups time out', async () => {
    setDns({ mx: dnsError('ENODATA'), a: dnsError('ETIMEOUT'), aaaa: dnsError('ETIMEOUT') });

    const res = await verify('jane@flaky.com');

    expect(res.body).toMatchObject({ verdict: 'risky', reason: 'no_mail_server' });
    expect(res.body.note).toMatch(/couldn.t check/i);
  });

  it('returns invalid/no_mail_server for a domain that publishes a null MX', async () => {
    setDns({ mx: [{ exchange: '', priority: 0 }], a: ['192.0.2.1'] });

    const res = await verify('jane@nomail.example.com');

    expect(res.body).toMatchObject({
      verdict: 'invalid',
      reason: 'no_mail_server',
      checks: { domainExists: true, mxRecords: false },
      mxHosts: [],
    });
  });

  it('caps a lookup that never answers at the deadline and reports it as unchecked', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const never = () => new Promise(() => {});
    dns.resolveMx.mockImplementation(never);
    dns.resolve4.mockImplementation(never);
    dns.resolve6.mockImplementation(never);

    const pending = checkEmail('jane@hangs.com');
    await vi.advanceTimersByTimeAsync(4000);
    const res = await pending;

    expect(res).toMatchObject({ verdict: 'risky', reason: 'no_mail_server' });
    expect(res.note).toMatch(/couldn.t check/i);
  });

  it.each(['jane@intranet.local', 'jane@db.internal', 'jane@printer.lan', 'jane@acme.test'])(
    'answers invalid/no_domain for a reserved, never-public name (%s) without a DNS lookup',
    async (email) => {
      setDns(HAS_MX);

      const res = await verify(email);

      expect(res.body).toMatchObject({
        verdict: 'invalid',
        reason: 'no_domain',
        checks: { domainExists: false, mxRecords: false },
        mxHosts: [],
      });
      expect(dns.resolveMx).not.toHaveBeenCalled();
      expect(dns.resolve4).not.toHaveBeenCalled();
    },
  );

  it.each(['someone@mailinator.com', 'someone@inbox.guerrillamail.com', 'someone@YOPMAIL.com'])(
    'returns risky/disposable for %s',
    async (email) => {
      setDns(HAS_MX);

      const res = await verify(email);

      expect(res.body).toMatchObject({
        verdict: 'risky',
        reason: 'disposable',
        checks: { disposable: true, mxRecords: true },
      });
    },
  );

  it.each([
    'info@acme.com',
    'Sales@acme.com',
    'no-reply@acme.com',
    'No.Reply+alerts@acme.com',
    'careers@acme.com',
  ])('returns risky/role_account for %s', async (email) => {
    setDns(HAS_MX);

    const res = await verify(email);

    expect(res.body).toMatchObject({
      verdict: 'risky',
      reason: 'role_account',
      checks: { roleAccount: true, disposable: false },
    });
  });

  it('ranks the DNS verdict above disposable and role checks', async () => {
    setDns({ mx: dnsError('ENOTFOUND'), a: dnsError('ENOTFOUND'), aaaa: dnsError('ENOTFOUND') });

    const res = await verify('info@mailinator.com');

    expect(res.body).toMatchObject({
      verdict: 'invalid',
      reason: 'no_domain',
      checks: { disposable: true, roleAccount: true },
    });
  });

  it('flags free providers as information only — the verdict stays valid', async () => {
    setDns(HAS_MX);

    for (const email of ['jane@gmail.com', 'jane@gmx.de', 'jane@yahoo.co.uk', 'jane@proton.me']) {
      const res = await verify(email);
      expect(res.body.verdict).toBe('valid');
      expect(res.body.checks.freeProvider).toBe(true);
    }

    const company = await verify('jane@outlook.acme.com');
    expect(company.body.checks.freeProvider).toBe(false);
  });

  it('rejects a missing or over-long email with 400', async () => {
    const missing = await request(app).post('/api/v1/public/tools/verify-email').send({});
    expect(missing.status).toBe(400);
    expect(missing.body.error.message).toBe('Validation failed');

    const long = await verify(`${'a'.repeat(250)}@acme.com`);
    expect(long.status).toBe(400);
  });

  it('allows 20 checks per hour per client IP, then 429 with Retry-After', async () => {
    setDns(HAS_MX);

    for (let i = 0; i < 20; i++) {
      const res = await verify(`person${i}@acme.com`, '198.51.100.7');
      expect(res.status).toBe(200);
    }

    const blocked = await verify('person21@acme.com', '198.51.100.7');
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
    expect(blocked.body.error.message).toEqual(expect.any(String));

    // A client can't dodge the limit by prepending its own
    // X-Forwarded-For entry: only the hop nginx appended counts.
    const spoofed = await verify('person22@acme.com', '10.9.9.9, 198.51.100.7');
    expect(spoofed.status).toBe(429);

    // A different client has its own bucket.
    const other = await verify('person23@acme.com', '198.51.100.8');
    expect(other.status).toBe(200);
  });

  it('only believes X-Forwarded-For from a local or private proxy, never a public address', () => {
    const trusted = app.get('trust proxy fn');
    expect(trusted('127.0.0.1', 0)).toBe(true);
    expect(trusted('::1', 0)).toBe(true);
    expect(trusted('172.17.0.1', 0)).toBe(true);
    // Someone reaching :4000 directly from the internet picks no req.ip.
    expect(trusted('203.0.113.9', 0)).toBe(false);
    expect(trusted('2001:db8::9', 0)).toBe(false);
  });
});

describe('POST /public/tools/find-email', () => {
  async function seedAcme() {
    return makeCompany('acme.com', [
      ...FIVE_FIRST_LAST,
      ['Maria', 'Garcia', 'mgarcia@acme.com'],
      ['Noemail', 'Person', null],
    ]);
  }

  it('returns a masked address and the top pattern, but no guess — never the real address', async () => {
    await seedAcme();

    const res = await find({ firstName: 'Maria', lastName: 'Garcia', domain: 'acme.com' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      domain: 'acme.com',
      company: { name: 'acme.com' },
      found: true,
      maskedEmail: 'm******@acme.com',
      pattern: { pattern: 'first.last', share: 0.83, sampleSize: 6 },
      suggestion: null,
      signupUrl: '/login?mode=register',
    });
    expect(JSON.stringify(res.body)).not.toContain('mgarcia@');
  });

  it('never pairs a masked match with a guess that would confirm it', async () => {
    // The guess (first.last) is exactly the real address: mask + guess
    // together would reveal it without a signed-in, charged reveal.
    const company = await seedAcme();
    await prisma.contact.create({
      data: {
        companyId: company.id,
        firstName: 'Nora',
        lastName: 'Quinn',
        email: 'nora.quinn@acme.com',
      },
    });

    const res = await find({ firstName: 'Nora', lastName: 'Quinn', domain: 'acme.com' });

    expect(res.body.maskedEmail).toBe('n***.q****@acme.com');
    expect(res.body.pattern).toMatchObject({ pattern: 'first.last' });
    expect(res.body.suggestion).toBeNull();
    expect(JSON.stringify(res.body)).not.toContain('nora.quinn@');
  });

  it('masks every segment of a separated local part', async () => {
    await makeCompany('acme.com', [
      ['Jane', 'Doe', 'jane.doe@acme.com'],
      ['Jo', 'X', 'j@acme.com'],
    ]);

    const jane = await find({ firstName: 'Jane', lastName: 'Doe', domain: 'acme.com' });
    expect(jane.body.maskedEmail).toBe('j***.d**@acme.com');

    const short = await find({ firstName: 'Jo', lastName: 'X', domain: 'acme.com' });
    expect(short.body.maskedEmail).toBe('j**@acme.com');
    expect(short.body.maskedEmail).not.toBe('j@acme.com');
  });

  it('matches names case-insensitively and normalizes a URL or email as the domain', async () => {
    await seedAcme();

    for (const domain of ['https://www.ACME.com/about-us', 'someone@Acme.com', 'www.acme.com.']) {
      const res = await find({ firstName: 'maria', lastName: 'GARCIA', domain });
      expect(res.status).toBe(200);
      expect(res.body.domain).toBe('acme.com');
      expect(res.body.found).toBe(true);
    }
  });

  it('treats % and _ in a name as plain characters, not wildcards', async () => {
    await seedAcme();

    for (const [firstName, lastName] of [
      ['%', '%'],
      ['M%', 'G%'],
      ['M_ria', 'Garcia'],
      ['_____', '______'],
    ]) {
      const res = await find({ firstName, lastName, domain: 'acme.com' });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ found: false, maskedEmail: null });
    }

    const real = await find({ firstName: 'Maria', lastName: 'Garcia', domain: 'acme.com' });
    expect(real.body.found).toBe(true);
  });

  it('reports found with no masked email when the contact has no address on file', async () => {
    await seedAcme();

    const res = await find({ firstName: 'Noemail', lastName: 'Person', domain: 'acme.com' });

    expect(res.body.found).toBe(true);
    expect(res.body.maskedEmail).toBeNull();
    expect(res.body.suggestion).toBe('noemail.person@acme.com');
  });

  it('still suggests the pattern for someone not in DataPit', async () => {
    await seedAcme();

    const res = await find({ firstName: 'Zoë', lastName: "O'Neil", domain: 'acme.com' });

    expect(res.body).toMatchObject({
      found: false,
      maskedEmail: null,
      pattern: { pattern: 'first.last' },
      suggestion: 'zoe.oneil@acme.com',
    });
  });

  it('excludes redacted contacts', async () => {
    await makeCompany('acme.com', [
      ...FIVE_FIRST_LAST,
      ['Maria', 'Garcia', 'maria.garcia@acme.com', { redactedAt: new Date() }],
    ]);

    const res = await find({ firstName: 'Maria', lastName: 'Garcia', domain: 'acme.com' });

    expect(res.body.found).toBe(false);
    expect(res.body.maskedEmail).toBeNull();
  });

  it('excludes a contact whose address is on the opt-out registry, and never suggests an opted-out address', async () => {
    // Imported after the person opted out, so the row was never redacted.
    await prisma.dataSubjectOptOut.create({ data: { email: 'maria.garcia@acme.com' } });
    await makeCompany('acme.com', [
      ...FIVE_FIRST_LAST,
      ['Maria', 'Garcia', 'Maria.Garcia@acme.com'],
    ]);

    const res = await find({ firstName: 'Maria', lastName: 'Garcia', domain: 'acme.com' });

    expect(res.body.found).toBe(false);
    expect(res.body.maskedEmail).toBeNull();
    expect(res.body.pattern).toMatchObject({ pattern: 'first.last', sampleSize: 5 });
    expect(res.body.suggestion).toBeNull();
  });

  it('returns no pattern or suggestion when the company has fewer than 5 addresses', async () => {
    await makeCompany('small.io', [
      ['Alex', 'Smith', 'alex.smith@small.io'],
      ['Blake', 'Jones', 'blake.jones@small.io'],
    ]);

    const res = await find({ firstName: 'Alex', lastName: 'Smith', domain: 'small.io' });

    expect(res.body).toMatchObject({
      company: { name: 'small.io' },
      found: true,
      maskedEmail: 'a***.s****@small.io',
      pattern: null,
      suggestion: null,
    });
  });

  it('returns company null for a domain DataPit has no company for', async () => {
    const res = await find({ firstName: 'Jane', lastName: 'Doe', domain: 'nowhere.example' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      domain: 'nowhere.example',
      company: null,
      found: false,
      maskedEmail: null,
      pattern: null,
      suggestion: null,
      signupUrl: '/login?mode=register',
    });
  });

  it('rejects a missing name or an unusable domain with 400', async () => {
    const noName = await find({ firstName: '', lastName: 'Doe', domain: 'acme.com' });
    expect(noName.status).toBe(400);

    const badDomain = await find({ firstName: 'Jane', lastName: 'Doe', domain: 'not a domain' });
    expect(badDomain.status).toBe(400);
  });

  it('allows 10 lookups per 24 hours per client IP, then 429 with Retry-After', async () => {
    const body = { firstName: 'Jane', lastName: 'Doe', domain: 'nowhere.example' };
    for (let i = 0; i < 10; i++) {
      const res = await find(body, '198.51.100.30');
      expect(res.status).toBe(200);
    }

    const blocked = await find(body, '198.51.100.30');
    expect(blocked.status).toBe(429);
    const retryAfter = Number(blocked.headers['retry-after']);
    expect(retryAfter).toBeGreaterThan(60 * 60);
    expect(retryAfter).toBeLessThanOrEqual(24 * 60 * 60);
  });
});

describe('GET /public/email-formats', () => {
  it('aggregates companies with at least 5 qualifying addresses, sorted by sample size', async () => {
    await makeCompany(
      'acme.com',
      [
        ...FIVE_FIRST_LAST,
        ['Frank', 'Moore', 'fmoore@acme.com'],
        ['Gina', 'Hall', 'gina@acme.com'],
        ['Hugo', 'Lane', 'hugo.lane.2@acme.com'],
        // Not counted: another domain, no address, erased.
        ['Ivy', 'King', 'ivy.king@gmail.com'],
        ['Jack', 'Long', null],
        ['Kim', 'Park', 'kim.park@acme.com', { redactedAt: new Date() }],
      ],
      {
        name: 'Acme',
        industry: 'Software',
        headcountMin: 51,
        headcountMax: 200,
        location: 'Austin, TX',
      },
    );
    await makeCompany('five.io', [
      ['Alex', 'Smith', 'asmith@five.io'],
      ['Blake', 'Jones', 'bjones@five.io'],
      ['Casey', 'Brown', 'cbrown@five.io'],
      ['Drew', 'Wilson', 'dwilson@five.io'],
      ['Evan', 'Taylor', 'evan.taylor@five.io'],
    ]);
    // Only four addresses at its own domain — doesn't qualify.
    await makeCompany('four.io', [
      ['Alex', 'Smith', 'alex.smith@four.io'],
      ['Blake', 'Jones', 'blake.jones@four.io'],
      ['Casey', 'Brown', 'casey.brown@four.io'],
      ['Drew', 'Wilson', 'drew.wilson@four.io'],
      ['Evan', 'Taylor', 'evan.taylor@gmail.com'],
      ['Finn', 'Reed', 'finn.reed@four.io', { redactedAt: new Date() }],
    ]);

    const res = await request(app).get('/api/v1/public/email-formats');

    expect(res.status).toBe(200);
    expect(res.body.minContacts).toBe(5);
    expect(new Date(res.body.generatedAt).toISOString()).toBe(res.body.generatedAt);
    expect(res.body.companies.map((c) => c.domain)).toEqual(['acme.com', 'five.io']);

    const [acme, five] = res.body.companies;
    expect(acme).toEqual({
      domain: 'acme.com',
      name: 'Acme',
      industry: 'Software',
      size: '51–200',
      location: 'Austin, TX',
      sampleSize: 8,
      // 5, 1, 1, 1 of 8: rounded one by one that would be 0.63 + 3 x 0.13
      // = 1.02; the leftover hundredths go to the higher-ranked patterns.
      patterns: [
        { pattern: 'first.last', share: 0.63, count: 5, example: 'jane.doe@acme.com' },
        { pattern: 'flast', share: 0.13, count: 1, example: 'jdoe@acme.com' },
        { pattern: 'first', share: 0.12, count: 1, example: 'jane@acme.com' },
        { pattern: 'other', share: 0.12, count: 1, example: '' },
      ],
      updated: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    });
    expect(five).toMatchObject({
      domain: 'five.io',
      industry: null,
      size: null,
      location: null,
      sampleSize: 5,
      patterns: [
        { pattern: 'flast', share: 0.8, count: 4, example: 'jdoe@five.io' },
        { pattern: 'first.last', share: 0.2, count: 1, example: 'jane.doe@five.io' },
      ],
    });

    // Only aggregates leave the server.
    const raw = JSON.stringify(res.body);
    for (const leaked of [
      'alex.smith',
      'fmoore',
      'gina@',
      'hugo.lane',
      'asmith',
      'Smith',
      'Garcia',
    ]) {
      expect(raw).not.toContain(leaked);
    }
  });

  it('uses the latest updatedAt among the counted contacts as `updated`', async () => {
    await makeCompany('acme.com', [
      ...FIVE_FIRST_LAST.map(([f, l, e], i) => [
        f,
        l,
        e,
        { updatedAt: new Date(`2026-03-0${i + 1}T12:00:00Z`) },
      ]),
      // Newer, but not counted (other domain).
      ['Ivy', 'King', 'ivy.king@gmail.com', { updatedAt: new Date('2026-08-01T12:00:00Z') }],
    ]);

    const res = await request(app).get('/api/v1/public/email-formats/acme.com');

    expect(res.body.updated).toBe('2026-03-05');
  });

  it('leaves opted-out addresses out of the counts', async () => {
    await prisma.dataSubjectOptOut.create({ data: { email: 'evan.taylor@acme.com' } });
    await makeCompany('acme.com', [...FIVE_FIRST_LAST, ['Frank', 'Moore', 'frank.moore@acme.com']]);

    const res = await request(app).get('/api/v1/public/email-formats/acme.com');

    expect(res.body.sampleSize).toBe(5);
  });

  it('matches the opt-out registry even when a stored address has stray whitespace or capitals', async () => {
    await prisma.dataSubjectOptOut.create({ data: { email: 'frank.moore@acme.com' } });
    await makeCompany('acme.com', [
      ...FIVE_FIRST_LAST,
      ['Frank', 'Moore', ' Frank.Moore@acme.com '],
    ]);

    const res = await request(app).get('/api/v1/public/email-formats/acme.com');

    expect(res.body.sampleSize).toBe(5);
  });

  it('classifies every pattern in the taxonomy, with a Jane Doe example for each', async () => {
    await makeCompany('acme.com', [
      ['Alice', 'Smith', 'alice.smith@acme.com'],
      ['Brian', 'Jones', 'brianjones@acme.com'],
      ['Carla', 'Brown', 'carla_brown@acme.com'],
      ['David', 'Wilson', 'david-wilson@acme.com'],
      ['Emma', 'Taylor', 'etaylor@acme.com'],
      ['Felix', 'Moore', 'f.moore@acme.com'],
      ['Grace', 'Hall', 'graceh@acme.com'],
      ['Henry', 'Lane', 'henry.l@acme.com'],
      ['Irene', 'King', 'irene@acme.com'],
      ['James', 'Long', 'long@acme.com'],
      ['Karen', 'Park', 'park.karen@acme.com'],
      ['Louis', 'Reed', 'reedlouis@acme.com'],
      ['Maria', 'Cole', 'colem@acme.com'],
      ['Nina', 'Ford', 'nf1987@acme.com'],
    ]);

    const res = await request(app).get('/api/v1/public/email-formats/acme.com');

    expect(res.status).toBe(200);
    expect(res.body.sampleSize).toBe(14);
    const byPattern = Object.fromEntries(res.body.patterns.map((p) => [p.pattern, p]));
    const expected = {
      'first.last': 'jane.doe',
      firstlast: 'janedoe',
      first_last: 'jane_doe',
      'first-last': 'jane-doe',
      flast: 'jdoe',
      'f.last': 'j.doe',
      firstl: 'janed',
      'first.l': 'jane.d',
      first: 'jane',
      last: 'doe',
      'last.first': 'doe.jane',
      lastfirst: 'doejane',
      lastf: 'doej',
    };
    for (const [pattern, local] of Object.entries(expected)) {
      expect(byPattern[pattern]).toEqual({
        pattern,
        share: expect.any(Number),
        count: 1,
        example: `${local}@acme.com`,
      });
    }
    expect(byPattern.other).toEqual({ pattern: 'other', share: 0.07, count: 1, example: '' });
    expect(res.body.patterns).toHaveLength(14);
    // 14 x 1/14: twelve at 0.07 and the two leftover hundredths to the
    // first two in rank order, so the shares add up to exactly 1.
    expect(res.body.patterns.map((p) => p.share)).toEqual([0.08, 0.08, ...Array(12).fill(0.07)]);
  });

  it('always has shares that add up to exactly 1', async () => {
    // 3, 2, 2 of 7 would round one by one to 0.43 + 0.29 + 0.29 = 1.01.
    await makeCompany('acme.com', [
      ['Alex', 'Smith', 'alex.smith@acme.com'],
      ['Blake', 'Jones', 'blake.jones@acme.com'],
      ['Casey', 'Brown', 'casey.brown@acme.com'],
      ['Drew', 'Wilson', 'dwilson@acme.com'],
      ['Evan', 'Taylor', 'etaylor@acme.com'],
      ['Finn', 'Reed', 'finn@acme.com'],
      ['Gale', 'Ross', 'gale@acme.com'],
    ]);

    const res = await request(app).get('/api/v1/public/email-formats/acme.com');

    const shares = res.body.patterns.map((p) => p.share);
    expect(shares).toEqual([0.43, 0.29, 0.28]);
    expect(Math.round(shares.reduce((a, b) => a + b, 0) * 100)).toBe(100);
  });

  it('counts plus-addressed, hyphenated, multi-word and non-ASCII names under their real pattern', async () => {
    await makeCompany('acme.com', [
      ['Alex', 'Smith', 'alex.smith+crm@acme.com'],
      ['Blake', 'Smith-Jones', 'blake.smith-jones@acme.com'],
      ['Casey', 'Smith-Jones', 'casey.smithjones@acme.com'],
      ['Jean Luc', 'Picard', 'jean.luc.picard@acme.com'],
      ['Søren', 'Łukasz', 'soren.lukasz@acme.com'],
      ['Björn', 'Straße', 'bjorn.strasse@acme.com'],
    ]);

    const res = await request(app).get('/api/v1/public/email-formats/acme.com');

    expect(res.body.sampleSize).toBe(6);
    expect(res.body.patterns).toEqual([
      { pattern: 'first.last', share: 1, count: 6, example: 'jane.doe@acme.com' },
    ]);
  });

  it('builds examples from the Jane Doe placeholder, even when a real Jane Doe is in the data', async () => {
    await makeCompany('acme.com', [['Jane', 'Doe', 'jdoe.sales@acme.com'], ...FIVE_FIRST_LAST]);

    const res = await request(app).get('/api/v1/public/email-formats/acme.com');

    expect(res.body.patterns.map((p) => p.example)).toEqual(['jane.doe@acme.com', '']);
    expect(JSON.stringify(res.body)).not.toContain('jdoe.sales');
  });

  it('GET /:domain returns the same CompanyFormat as the list, normalizing the domain', async () => {
    await makeCompany('acme.com', FIVE_FIRST_LAST, { name: 'Acme' });

    const list = await request(app).get('/api/v1/public/email-formats');
    const one = await request(app).get('/api/v1/public/email-formats/WWW.Acme.com');

    expect(one.status).toBe(200);
    expect(one.body).toEqual(list.body.companies[0]);
  });

  it('GET /:domain returns 404 for a company that does not qualify, or no company at all', async () => {
    await makeCompany('four.io', FIVE_FIRST_LAST.slice(0, 4));

    const small = await request(app).get('/api/v1/public/email-formats/four.io');
    expect(small.status).toBe(404);
    expect(small.body.error.message).toEqual(expect.any(String));

    const unknown = await request(app).get('/api/v1/public/email-formats/nowhere.example');
    expect(unknown.status).toBe(404);

    const garbage = await request(app).get('/api/v1/public/email-formats/not_a_domain');
    expect(garbage.status).toBe(404);
  });

  it('caches the whole list in Redis for an hour under public:email-formats', async () => {
    await makeCompany('acme.com', FIVE_FIRST_LAST);

    const first = await request(app).get('/api/v1/public/email-formats');
    expect(first.body.companies).toHaveLength(1);

    const ttl = await redis.ttl('public:email-formats');
    expect(ttl).toBeGreaterThan(3500);
    expect(ttl).toBeLessThanOrEqual(3600);

    // New data doesn't show up until the cached copy expires.
    await makeCompany('five.io', [
      ['Alex', 'Smith', 'asmith@five.io'],
      ['Blake', 'Jones', 'bjones@five.io'],
      ['Casey', 'Brown', 'cbrown@five.io'],
      ['Drew', 'Wilson', 'dwilson@five.io'],
      ['Evan', 'Taylor', 'etaylor@five.io'],
    ]);
    const second = await request(app).get('/api/v1/public/email-formats');
    expect(second.body).toEqual(first.body);

    await redis.del('public:email-formats');
    const third = await request(app).get('/api/v1/public/email-formats');
    expect(third.body.companies.map((c) => c.domain)).toEqual(['acme.com', 'five.io']);
  });

  it('returns an empty list when nothing qualifies', async () => {
    const res = await request(app).get('/api/v1/public/email-formats');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ minContacts: 5, generatedAt: expect.any(String), companies: [] });
  });
});
