import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { resetDb, resetRedis } from '../test/dbHelpers.js';
import { prisma } from '../config/db.js';
import { hashPassword } from '../utils/password.js';
import {
  parseRpfCsv,
  createImportBatch,
  processImportBatch,
  approveImportBatch,
} from '../services/databaseImportService.js';

const app = createApp();

const adminCreds = { email: 'root@datapit.io', password: 'super-secret-admin-pw' };

async function loginAsAdmin() {
  const passwordHash = await hashPassword(adminCreds.password);
  const admin = await prisma.superAdmin.create({
    data: { email: adminCreds.email, passwordHash, name: 'Root' },
  });
  const res = await request(app).post('/api/v1/admin/auth/login').send(adminCreds);
  return { token: res.body.accessToken, adminId: admin.id };
}

const CSV_HEADER =
  'Date,First Name,Last Name,Job Title,Email ID,Domain,Department,Seniority,Company Name,Industry Type,TelephoneNo,Alternative No.,Address,City,Zip Code,State,Country,Emp Size,Revenue,Prospect Linkedin profile Link,Company Linkedin profile Link';

function csvRow({
  first = 'Jamie',
  last = 'Rivera',
  title = 'VP Sales',
  email = '',
  domain = 'brightpath.io',
  company = 'BrightPath',
} = {}) {
  return [
    '19-08-2026', // Date
    first, // First Name
    last, // Last Name
    title, // Job Title
    email, // Email ID
    domain, // Domain
    'Sales', // Department
    'VP', // Seniority
    company, // Company Name
    'SaaS', // Industry Type
    '', // TelephoneNo
    '', // Alternative No.
    '', // Address
    'Austin', // City
    '', // Zip Code
    'TX', // State
    'United States', // Country
    '51-200', // Emp Size
    '', // Revenue
    '', // Prospect Linkedin profile Link
    '', // Company Linkedin profile Link
  ].join(',');
}

describe('database imports (Extend Database)', () => {
  beforeEach(async () => {
    await resetDb();
    await resetRedis();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /admin/database-imports', () => {
    it('rejects an unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/v1/admin/database-imports')
        .attach('file', Buffer.from(`${CSV_HEADER}\n${csvRow()}`), 'contacts.csv');
      expect(res.status).toBe(401);
    });

    it('accepts a CSV and queues a batch', async () => {
      const { token } = await loginAsAdmin();
      const res = await request(app)
        .post('/api/v1/admin/database-imports')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from(`${CSV_HEADER}\n${csvRow()}\n${csvRow({ last: 'Chen' })}`), 'contacts.csv');

      expect(res.status).toBe(202);
      expect(res.body.status).toBe('PROCESSING');
      expect(res.body.totalRows).toBe(2);
    });

    it('rejects a request with no file', async () => {
      const { token } = await loginAsAdmin();
      const res = await request(app)
        .post('/api/v1/admin/database-imports')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(400);
    });

    it('rejects a non-CSV file', async () => {
      const { token } = await loginAsAdmin();
      const res = await request(app)
        .post('/api/v1/admin/database-imports')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from('not a csv'), 'contacts.txt');
      expect(res.status).toBe(400);
    });

    it('rejects a CSV missing required RPF columns', async () => {
      const { token } = await loginAsAdmin();
      const res = await request(app)
        .post('/api/v1/admin/database-imports')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from('Foo,Bar\n1,2'), 'contacts.csv');
      expect(res.status).toBe(400);
    });
  });

  describe('GET /admin/database-imports/:batchId', () => {
    it('404s for an unknown batch', async () => {
      const { token } = await loginAsAdmin();
      const res = await request(app)
        .get('/api/v1/admin/database-imports/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });

  describe('processImportBatch', () => {
    it('creates one company and two contacts for two rows at the same domain', async () => {
      const { adminId } = await loginAsAdmin();
      const rows = parseRpfCsv(
        Buffer.from(`${CSV_HEADER}\n${csvRow()}\n${csvRow({ first: 'Sam', last: 'Chen' })}`),
      );
      const batch = await createImportBatch({ rows, filename: 'x.csv', superAdminId: adminId });
      await processImportBatch({ batchId: batch.id, rows });

      const companies = await prisma.company.findMany({ where: { domain: 'brightpath.io' } });
      expect(companies).toHaveLength(1);
      expect(companies[0].importBatchId).toBe(batch.id);

      const contacts = await prisma.contact.findMany({ where: { companyId: companies[0].id } });
      expect(contacts).toHaveLength(2);

      const updated = await prisma.databaseImportBatch.findUnique({ where: { id: batch.id } });
      expect(updated.status).toBe('PENDING_APPROVAL');
      expect(updated.insertedCompanies).toBe(1);
      expect(updated.insertedContacts).toBe(2);
      expect(updated.errorCount).toBe(0);
    });

    it('always inserts a new contact even when the email already exists', async () => {
      const { adminId } = await loginAsAdmin();
      const rows = parseRpfCsv(
        Buffer.from(
          `${CSV_HEADER}\n${csvRow({ email: 'jamie@brightpath.io' })}\n${csvRow({ first: 'Jamie2', email: 'jamie@brightpath.io' })}`,
        ),
      );
      const batch = await createImportBatch({ rows, filename: 'x.csv', superAdminId: adminId });
      await processImportBatch({ batchId: batch.id, rows });

      const contacts = await prisma.contact.findMany({ where: { email: 'jamie@brightpath.io' } });
      expect(contacts).toHaveLength(2);
    });

    it('records a row error and does not insert an invalid row, without failing the batch', async () => {
      const { adminId } = await loginAsAdmin();
      const badRow = csvRow().replace('Jamie,Rivera', ',');
      const rows = parseRpfCsv(Buffer.from(`${CSV_HEADER}\n${csvRow()}\n${badRow}`));
      const batch = await createImportBatch({ rows, filename: 'x.csv', superAdminId: adminId });
      await processImportBatch({ batchId: batch.id, rows });

      const updated = await prisma.databaseImportBatch.findUnique({ where: { id: batch.id } });
      expect(updated.status).toBe('PENDING_APPROVAL');
      expect(updated.insertedContacts).toBe(1);
      expect(updated.errorCount).toBe(1);
      expect(updated.errors[0].message).toMatch(/First Name/);
    });
  });

  describe('approveImportBatch', () => {
    it('clears importBatchId and marks the batch approved', async () => {
      const { adminId } = await loginAsAdmin();
      const rows = parseRpfCsv(Buffer.from(`${CSV_HEADER}\n${csvRow()}`));
      const batch = await createImportBatch({ rows, filename: 'x.csv', superAdminId: adminId });
      await processImportBatch({ batchId: batch.id, rows });

      const approved = await approveImportBatch(batch.id, adminId);
      expect(approved.status).toBe('APPROVED');
      expect(approved.approvedById).toBe(adminId);

      const company = await prisma.company.findUnique({ where: { domain: 'brightpath.io' } });
      expect(company.importBatchId).toBeNull();
      const contact = await prisma.contact.findFirst({ where: { companyId: company.id } });
      expect(contact.importBatchId).toBeNull();
    });

    it('shows the approver on the list endpoint after approval', async () => {
      const { token, adminId } = await loginAsAdmin();
      const rows = parseRpfCsv(Buffer.from(`${CSV_HEADER}\n${csvRow()}`));
      const batch = await createImportBatch({ rows, filename: 'x.csv', superAdminId: adminId });
      await processImportBatch({ batchId: batch.id, rows });
      await approveImportBatch(batch.id, adminId);

      const res = await request(app)
        .get('/api/v1/admin/database-imports')
        .set('Authorization', `Bearer ${token}`);
      const listed = res.body.find((b) => b.id === batch.id);
      expect(listed.approvedBy.email).toBe(adminCreds.email);
    });

    it('does not create an orphan company when the only row for it is invalid', async () => {
      const { adminId } = await loginAsAdmin();
      const badRow = csvRow({ domain: 'orphan-test.io', company: 'OrphanCo' }).replace(
        'Jamie,Rivera',
        ',',
      );
      const rows = parseRpfCsv(Buffer.from(`${CSV_HEADER}\n${badRow}`));
      const batch = await createImportBatch({ rows, filename: 'x.csv', superAdminId: adminId });
      await processImportBatch({ batchId: batch.id, rows });

      const company = await prisma.company.findUnique({ where: { domain: 'orphan-test.io' } });
      expect(company).toBeNull();
      const updated = await prisma.databaseImportBatch.findUnique({ where: { id: batch.id } });
      expect(updated.insertedCompanies).toBe(0);
    });

    it('rejects approving a batch that is not pending approval', async () => {
      const { adminId } = await loginAsAdmin();
      const rows = parseRpfCsv(Buffer.from(`${CSV_HEADER}\n${csvRow()}`));
      const batch = await createImportBatch({ rows, filename: 'x.csv', superAdminId: adminId });
      await processImportBatch({ batchId: batch.id, rows });
      await approveImportBatch(batch.id, adminId);

      await expect(approveImportBatch(batch.id, adminId)).rejects.toThrow(/not pending approval/);
    });
  });
});
