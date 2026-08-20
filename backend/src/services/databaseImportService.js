import { parse } from 'csv-parse/sync';
import { prisma } from '../config/db.js';
import { logger } from '../config/logger.js';
import { ApiError } from '../middleware/errorHandler.js';
import { enqueueIndex } from './indexerService.js';
import { databaseImportQueue } from '../jobs/queues.js';
import { RPF_REQUIRED_HEADERS, parseEmpSize } from '../config/rpfFormat.js';

// Capped like recalc.py caps its error_summary — a batch with thousands of
// bad rows shouldn't bloat the DB row or the admin UI with every one of them.
const MAX_STORED_ERRORS = 100;

export function parseRpfCsv(buffer) {
  let rows;
  try {
    rows = parse(buffer, { columns: true, skip_empty_lines: true, trim: true, bom: true });
  } catch (err) {
    throw new ApiError(400, `Could not parse CSV: ${err.message}`);
  }
  if (rows.length === 0) {
    throw new ApiError(400, 'CSV has no data rows');
  }
  const headers = Object.keys(rows[0]);
  const missing = RPF_REQUIRED_HEADERS.filter((h) => !headers.includes(h));
  if (missing.length) {
    throw new ApiError(400, `CSV is missing required column(s): ${missing.join(', ')}`);
  }
  return rows;
}

export async function createImportBatch({ rows, filename, superAdminId }) {
  const batch = await prisma.databaseImportBatch.create({
    data: {
      filename,
      status: 'PROCESSING',
      totalRows: rows.length,
      uploadedById: superAdminId,
    },
  });
  await databaseImportQueue.add(
    'process',
    { batchId: batch.id, rows },
    { jobId: `import-${batch.id}`, removeOnComplete: true, removeOnFail: 50 },
  );
  return batch;
}

function companyDomain(row) {
  const domain = row['Domain']?.trim();
  if (domain) return domain.toLowerCase();
  const email = row['Email ID']?.trim();
  const at = email?.indexOf('@');
  if (email && at > 0) return email.slice(at + 1).toLowerCase();
  return null;
}

async function upsertCompany(row, batchId) {
  const domain = companyDomain(row);
  const name = row['Company Name']?.trim();
  if (!domain || !name) {
    throw new Error('Missing Company Name/Domain and no Email ID to derive a domain from');
  }

  const existing = await prisma.company.findUnique({ where: { domain } });
  if (existing) return { company: existing, isNew: false };

  const { min, max } = parseEmpSize(row['Emp Size']);
  const city = row['City']?.trim();
  const state = row['State']?.trim();
  const location = [city, state].filter(Boolean).join(', ') || null;

  const company = await prisma.company.create({
    data: {
      name,
      domain,
      industry: row['Industry Type']?.trim() || null,
      headcountMin: min,
      headcountMax: max,
      location,
      linkedinUrl: row['Company Linkedin profile Link']?.trim() || null,
      importBatchId: batchId,
    },
  });
  return { company, isNew: true };
}

function requireContactNames(row) {
  const firstName = row['First Name']?.trim();
  const lastName = row['Last Name']?.trim();
  if (!firstName || !lastName) {
    throw new Error('Missing First Name/Last Name');
  }
  return { firstName, lastName };
}

async function insertContact(row, firstName, lastName, companyId, batchId) {
  const email = row['Email ID']?.trim() || null;
  return prisma.contact.create({
    data: {
      companyId,
      firstName,
      lastName,
      title: row['Job Title']?.trim() || null,
      department: row['Department']?.trim() || null,
      seniority: row['Seniority']?.trim() || null,
      email,
      emailVerified: false,
      linkedinUrl: row['Prospect Linkedin profile Link']?.trim() || null,
      importBatchId: batchId,
    },
  });
}

/** Runs in the worker (see jobs/processors/databaseImportProcessor.js). */
export async function processImportBatch({ batchId, rows }) {
  let insertedCompanies = 0;
  let insertedContacts = 0;
  const errors = [];

  try {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        // Validate before touching Company at all — a row that can never
        // produce a contact shouldn't leave a contact-less company behind.
        const { firstName, lastName } = requireContactNames(row);
        const { company, isNew } = await upsertCompany(row, batchId);
        if (isNew) insertedCompanies++;
        // Always insert — an admin re-uploading the same list to pick up
        // new contacts at existing companies is the expected workflow, and
        // de-duping by email would silently drop legitimate re-uploads.
        await insertContact(row, firstName, lastName, company.id, batchId);
        insertedContacts++;
      } catch (err) {
        if (errors.length < MAX_STORED_ERRORS) {
          errors.push({ row: i + 2, message: err.message }); // +2: header row + 1-index
        }
      }
    }

    await prisma.databaseImportBatch.update({
      where: { id: batchId },
      data: {
        status: 'PENDING_APPROVAL',
        insertedCompanies,
        insertedContacts,
        errorCount: rows.length - insertedContacts,
        errors,
        processedAt: new Date(),
      },
    });
  } catch (err) {
    logger.error({ err, batchId }, 'Database import batch failed');
    await prisma.databaseImportBatch.update({
      where: { id: batchId },
      data: {
        status: 'FAILED',
        insertedCompanies,
        insertedContacts,
        errors: [...errors, { row: null, message: err.message }].slice(0, MAX_STORED_ERRORS),
        processedAt: new Date(),
      },
    });
  }
}

export async function listImportBatches() {
  return prisma.databaseImportBatch.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      uploadedBy: { select: { name: true, email: true } },
      approvedBy: { select: { name: true, email: true } },
    },
  });
}

export async function getImportBatch(id) {
  const batch = await prisma.databaseImportBatch.findUnique({
    where: { id },
    include: {
      uploadedBy: { select: { name: true, email: true } },
      approvedBy: { select: { name: true, email: true } },
    },
  });
  if (!batch) throw new ApiError(404, 'Import batch not found');
  return batch;
}

/** Publishes a reviewed batch: indexes its rows into search and clears the staging flag. */
export async function approveImportBatch(id, superAdminId) {
  const batch = await prisma.databaseImportBatch.findUnique({ where: { id } });
  if (!batch) throw new ApiError(404, 'Import batch not found');
  if (batch.status !== 'PENDING_APPROVAL') {
    throw new ApiError(400, `Batch is ${batch.status.toLowerCase()}, not pending approval`);
  }

  const [companies, contacts] = await Promise.all([
    prisma.company.findMany({ where: { importBatchId: id }, select: { id: true } }),
    prisma.contact.findMany({ where: { importBatchId: id }, select: { id: true } }),
  ]);

  for (const c of companies) await enqueueIndex('company', c.id);
  for (const c of contacts) await enqueueIndex('contact', c.id);

  await prisma.$transaction([
    prisma.company.updateMany({ where: { importBatchId: id }, data: { importBatchId: null } }),
    prisma.contact.updateMany({ where: { importBatchId: id }, data: { importBatchId: null } }),
    prisma.databaseImportBatch.update({
      where: { id },
      data: { status: 'APPROVED', approvedById: superAdminId, approvedAt: new Date() },
    }),
  ]);

  return getImportBatch(id);
}
