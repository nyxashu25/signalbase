import { es } from '../config/elasticsearch.js';
import { prisma } from '../config/db.js';
import { esIndexQueue } from '../jobs/queues.js';
import {
  COMPANIES_INDEX,
  CONTACTS_INDEX,
  companyMapping,
  contactMapping,
} from '../config/esIndices.js';
import { logger } from '../config/logger.js';

export async function ensureIndices() {
  for (const [index, mappings] of [
    [COMPANIES_INDEX, companyMapping],
    [CONTACTS_INDEX, contactMapping],
  ]) {
    const exists = await es.indices.exists({ index });
    if (!exists) {
      await es.indices.create({ index, mappings });
      logger.info(`Created ES index "${index}"`);
    }
  }
}

function companyDoc(company) {
  return {
    id: company.id,
    name: company.name,
    domain: company.domain,
    industry: company.industry,
    headcountMin: company.headcountMin,
    headcountMax: company.headcountMax,
    location: company.location,
    techStack: company.techStack,
    createdAt: company.createdAt,
  };
}

function contactDoc(contact) {
  return {
    id: contact.id,
    companyId: contact.companyId,
    companyName: contact.company?.name,
    industry: contact.company?.industry,
    location: contact.company?.location,
    fullName: `${contact.firstName} ${contact.lastName}`,
    title: contact.title,
    seniority: contact.seniority,
    department: contact.department,
    hasEmail: Boolean(contact.email),
    emailVerified: contact.emailVerified,
    createdAt: contact.createdAt,
  };
}

/** Enqueues a debounced reindex of one entity — used from write paths (seed, future CRUD). */
export async function enqueueIndex(type, id) {
  await esIndexQueue.add(
    'index',
    { type, id },
    { jobId: `${type}:${id}`, removeOnComplete: true, removeOnFail: 50 },
  );
}

/** Indexes a single entity immediately — called by the queue processor. */
export async function indexOne(type, id) {
  if (type === 'company') {
    const company = await prisma.company.findUnique({ where: { id } });
    if (!company) return es.delete({ index: COMPANIES_INDEX, id }, { ignore: [404] });
    return es.index({ index: COMPANIES_INDEX, id: company.id, document: companyDoc(company) });
  }

  if (type === 'contact') {
    const contact = await prisma.contact.findUnique({ where: { id }, include: { company: true } });
    // Redacted (GDPR/CCPA erasure) contacts must not be searchable, even
    // though the row itself is kept for FK integrity with lists/reveals/
    // sequence history — delete rather than reindex blanked PII fields.
    if (!contact || contact.redactedAt)
      return es.delete({ index: CONTACTS_INDEX, id }, { ignore: [404] });
    return es.index({ index: CONTACTS_INDEX, id: contact.id, document: contactDoc(contact) });
  }

  throw new Error(`Unknown index type: ${type}`);
}

/** Full backfill — the "documented re-index job": rebuild ES from Postgres from scratch. */
export async function reindexAll() {
  await ensureIndices();

  const companies = await prisma.company.findMany();
  const contacts = await prisma.contact.findMany({ include: { company: true } });

  if (companies.length) {
    const body = companies.flatMap((c) => [
      { index: { _index: COMPANIES_INDEX, _id: c.id } },
      companyDoc(c),
    ]);
    await es.bulk({ operations: body, refresh: true });
  }

  if (contacts.length) {
    const body = contacts.flatMap((c) => [
      { index: { _index: CONTACTS_INDEX, _id: c.id } },
      contactDoc(c),
    ]);
    await es.bulk({ operations: body, refresh: true });
  }

  logger.info({ companies: companies.length, contacts: contacts.length }, 'Reindex complete');
}
