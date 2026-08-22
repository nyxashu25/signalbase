import { createHash } from 'node:crypto';
import { prisma } from '../config/db.js';
import { redis } from '../config/redis.js';
import { hashPassword } from './password.js';
import { reindexAll } from '../services/indexerService.js';
import { initializeBalance } from '../services/creditService.js';
import { logger } from '../config/logger.js';

const DEMO_ORG_SLUG = 'datapit-demo';
const DEMO_USER_EMAIL = 'demo@datapit.io';
const DEMO_USER_PASSWORD = 'demo1234';

// Deterministic pseudo-UUID so re-running the seed upserts the same rows
// instead of creating duplicates — idempotency without a natural unique key.
function deterministicId(seed) {
  const hex = createHash('sha256').update(seed).digest('hex');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

const ADJECTIVES = [
  'Nova',
  'Vertex',
  'Orbit',
  'Lumen',
  'Atlas',
  'Quantum',
  'Pulse',
  'Halo',
  'Crest',
  'Forge',
  'Drift',
  'Anchor',
  'Beacon',
  'Cobalt',
  'Delta',
  'Echo',
  'Flux',
  'Grove',
  'Haven',
  'Ionic',
];
const NOUNS = ['Labs', 'Systems', 'Works', 'Cloud', 'Health', 'Analytics', 'Dynamics', 'Networks'];
const INDUSTRIES = [
  'SaaS',
  'Fintech',
  'Healthcare',
  'E-commerce',
  'Cybersecurity',
  'Logistics',
  'Marketing',
  'EdTech',
];
const LOCATIONS = [
  'San Francisco, CA',
  'New York, NY',
  'Austin, TX',
  'Seattle, WA',
  'Boston, MA',
  'Denver, CO',
  'Chicago, IL',
  'Toronto, ON',
];
const TECH_POOL = [
  'React',
  'AWS',
  'Salesforce',
  'HubSpot',
  'Snowflake',
  'Kubernetes',
  'Segment',
  'Stripe',
  'Postgres',
  'Kafka',
  'Datadog',
  'Zendesk',
];
const FIRST_NAMES = ['Jordan', 'Casey', 'Morgan', 'Riley', 'Avery', 'Taylor', 'Reese', 'Quinn'];
const LAST_NAMES = [
  'Bennett',
  'Ortiz',
  'Nakamura',
  'Singh',
  'Kowalski',
  'Dubois',
  'Adeyemi',
  'Novak',
];
const ROLE_TEMPLATES = [
  { title: 'VP of Sales', seniority: 'VP', department: 'Sales' },
  { title: 'Sales Development Manager', seniority: 'Manager', department: 'Sales' },
  { title: 'Head of Marketing', seniority: 'Director', department: 'Marketing' },
];

function pick(arr, i) {
  return arr[i % arr.length];
}

function buildCompany(i) {
  const name = `${pick(ADJECTIVES, i)} ${pick(NOUNS, Math.floor(i / ADJECTIVES.length))}`;
  const domain = `${name.toLowerCase().replace(/\s+/g, '')}.com`;
  return {
    id: deterministicId(`company:${domain}`),
    name,
    domain,
    industry: pick(INDUSTRIES, i),
    headcountMin: 50 + (i % 5) * 100,
    headcountMax: 200 + (i % 5) * 150,
    location: pick(LOCATIONS, i),
    techStack: [TECH_POOL[i % TECH_POOL.length], TECH_POOL[(i + 3) % TECH_POOL.length]],
  };
}

function buildContacts(company, companyIndex) {
  return ROLE_TEMPLATES.map((role, j) => {
    const firstName = pick(FIRST_NAMES, companyIndex + j);
    const lastName = pick(LAST_NAMES, companyIndex * 3 + j);
    return {
      id: deterministicId(`contact:${company.domain}:${j}`),
      companyId: company.id,
      firstName,
      lastName,
      title: role.title,
      seniority: role.seniority,
      department: role.department,
      // Emails are deliberately left unpopulated here — Phase 03's email
      // finder/verifier fills these in as a real (billed) action, not seed data.
      email: null,
      emailVerified: false,
      // Roughly two in three contacts carry a (fake, 555-prefixed) direct
      // line so the phone column has something to mask and reveal.
      phone: (companyIndex + j) % 3 === 2 ? null : `+1 415 555 ${String(1000 + ((companyIndex * 7 + j * 13) % 9000)).padStart(4, '0')}`,
      linkedinUrl: `https://www.linkedin.com/in/${firstName.toLowerCase()}-${lastName.toLowerCase()}`,
    };
  });
}

async function seedDemoTenant() {
  const org = await prisma.org.upsert({
    where: { slug: DEMO_ORG_SLUG },
    update: {},
    create: { slug: DEMO_ORG_SLUG, name: 'DataPit Demo' },
  });

  const workspace = await prisma.workspace.upsert({
    where: { id: deterministicId(`workspace:${DEMO_ORG_SLUG}`) },
    update: {},
    create: {
      id: deterministicId(`workspace:${DEMO_ORG_SLUG}`),
      orgId: org.id,
      name: 'Demo Workspace',
      monthlyCreditGrant: 100,
    },
  });

  const passwordHash = await hashPassword(DEMO_USER_PASSWORD);
  // emailVerified: the demo account has no inbox to confirm from, and login
  // rejects unverified accounts — so the seed verifies it up front (and on
  // re-run, in case it was created before the verification gate existed).
  const user = await prisma.user.upsert({
    where: { email: DEMO_USER_EMAIL },
    update: { emailVerified: true },
    create: { email: DEMO_USER_EMAIL, passwordHash, name: 'Demo User', emailVerified: true },
  });

  await prisma.membership.upsert({
    where: { userId_workspaceId: { userId: user.id, workspaceId: workspace.id } },
    update: {},
    create: { userId: user.id, workspaceId: workspace.id, role: 'OWNER' },
  });

  // Redis-backed — the relational demo data (org/workspace/user/companies/
  // contacts) is still worth having even if Redis is unavailable, so this
  // step is optional rather than fatal. Without it the demo user exists but
  // has no initialized credit balance, and login/register won't work
  // either (both are Redis-dependent) until Redis comes up.
  try {
    await initializeBalance(workspace.id, workspace.monthlyCreditGrant);
  } catch (err) {
    logger.warn(
      { err: err.message },
      'Could not initialize credit balance (Redis unavailable?) — skipping',
    );
  }

  return { org, workspace, user };
}

async function seedCompaniesAndContacts(count = 40) {
  for (let i = 0; i < count; i++) {
    const companyData = buildCompany(i);
    const company = await prisma.company.upsert({
      where: { domain: companyData.domain },
      update: {},
      create: companyData,
    });

    for (const contact of buildContacts(company, i)) {
      await prisma.contact.upsert({
        where: { id: contact.id },
        update: {},
        create: contact,
      });
    }
  }
}

async function main() {
  const { user } = await seedDemoTenant();
  await seedCompaniesAndContacts(40);

  // Elasticsearch-backed — same reasoning as initializeBalance above:
  // optional, not fatal. Without it, search endpoints return nothing until
  // `npm run reindex` is run against a running Elasticsearch.
  try {
    await reindexAll();
  } catch (err) {
    logger.warn(
      { err: err.message },
      'Could not reindex into Elasticsearch (unavailable?) — skipping',
    );
  }

  logger.info(
    { email: DEMO_USER_EMAIL, password: DEMO_USER_PASSWORD, userId: user.id },
    'Seed complete: demo tenant + 40 companies with contacts',
  );
}

main()
  .catch((err) => {
    logger.error({ err }, 'Seed failed');
    process.exitCode = 1;
  })
  .finally(() => {
    redis.disconnect();
    return prisma.$disconnect();
  });
