import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { resetDb, resetRedis } from '../test/dbHelpers.js';
import { prisma } from '../config/db.js';
import { hashPassword } from '../utils/password.js';

const app = createApp();

const adminCreds = { email: 'root@datapit.io', password: 'super-secret-admin-pw' };

async function loginAsAdmin() {
  const passwordHash = await hashPassword(adminCreds.password);
  await prisma.superAdmin.create({ data: { email: adminCreds.email, passwordHash, name: 'Root' } });
  const res = await request(app).post('/api/v1/admin/auth/login').send(adminCreds);
  return res.body.accessToken;
}

async function seedMissingPerson(overrides = {}) {
  return prisma.missingPerson.create({
    data: {
      linkedinSlug: 'casey-nguyen',
      linkedinUrl: 'https://www.linkedin.com/in/casey-nguyen',
      name: 'Casey Nguyen',
      jobTitle: 'Head of Growth',
      companyName: 'Skyline Labs',
      ...overrides,
    },
  });
}

async function seedLostChild(overrides = {}) {
  const company = await prisma.company.create({
    data: { name: 'Nova Systems', domain: 'novasystems.com' },
  });
  const contact = await prisma.contact.create({
    data: {
      companyId: company.id,
      firstName: 'Jordan',
      lastName: 'Bennett',
      title: 'VP Engineering',
      linkedinSlug: 'jordan-bennett',
    },
  });
  const lostChild = await prisma.lostChild.create({
    data: {
      contactId: contact.id,
      linkedinSlug: 'jordan-bennett',
      oldTitle: 'VP Engineering',
      newTitle: 'Chief Technology Officer',
      ...overrides,
    },
  });
  return { contact, lostChild };
}

describe('admin sourcing queues', () => {
  beforeEach(async () => {
    await resetDb();
    await resetRedis();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('rejects sourcing routes without an admin token', async () => {
    const res = await request(app).get('/api/v1/admin/sourcing/missing-persons');
    expect(res.status).toBe(401);
  });

  it('lists pending missing persons newest-demand-first and reports badge counts', async () => {
    const token = await loginAsAdmin();
    await seedMissingPerson();
    await seedMissingPerson({ linkedinSlug: 'ana-silva', linkedinUrl: 'https://www.linkedin.com/in/ana-silva', name: 'Ana Silva' });
    await seedMissingPerson({ linkedinSlug: 'resolved-one', linkedinUrl: 'https://www.linkedin.com/in/resolved-one', status: 'ADDED' });
    await seedLostChild();

    const list = await request(app)
      .get('/api/v1/admin/sourcing/missing-persons')
      .set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body.total).toBe(2); // PENDING only by default
    expect(list.body.missingPersons.map((m) => m.linkedinSlug).sort()).toEqual([
      'ana-silva',
      'casey-nguyen',
    ]);

    const counts = await request(app)
      .get('/api/v1/admin/sourcing/counts')
      .set('Authorization', `Bearer ${token}`);
    expect(counts.body).toEqual({ missingPersons: 2, lostChildren: 1 });
  });

  it('resolves a missing person (Mark added / Dismiss), audits it, and blocks double-resolution', async () => {
    const token = await loginAsAdmin();
    const row = await seedMissingPerson();

    const res = await request(app)
      .post(`/api/v1/admin/sourcing/missing-persons/${row.id}/resolve`)
      .set('Authorization', `Bearer ${token}`)
      .send({ resolution: 'ADDED' });
    expect(res.status).toBe(200);
    expect(res.body.missingPerson.status).toBe('ADDED');

    const audit = await prisma.adminAuditLog.findMany({ where: { action: 'RESOLVE_MISSING_PERSON' } });
    expect(audit).toHaveLength(1);
    expect(audit[0].metadata).toMatchObject({ linkedinSlug: 'casey-nguyen', resolution: 'ADDED' });

    const again = await request(app)
      .post(`/api/v1/admin/sourcing/missing-persons/${row.id}/resolve`)
      .set('Authorization', `Bearer ${token}`)
      .send({ resolution: 'DISMISSED' });
    expect(again.status).toBe(409);
  });

  it('lists lost children with their contact, applies the observed title to the shared Contact, and audits both titles', async () => {
    const token = await loginAsAdmin();
    const { contact, lostChild } = await seedLostChild();

    const list = await request(app)
      .get('/api/v1/admin/sourcing/lost-children')
      .set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body.lostChildren).toHaveLength(1);
    expect(list.body.lostChildren[0].contact.company.name).toBe('Nova Systems');

    const apply = await request(app)
      .post(`/api/v1/admin/sourcing/lost-children/${lostChild.id}/resolve`)
      .set('Authorization', `Bearer ${token}`)
      .send({ resolution: 'APPLIED' });
    expect(apply.status).toBe(200);
    expect(apply.body.lostChild.status).toBe('APPLIED');

    const updated = await prisma.contact.findUnique({ where: { id: contact.id } });
    expect(updated.title).toBe('Chief Technology Officer');

    const audit = await prisma.adminAuditLog.findMany({ where: { action: 'RESOLVE_LOST_CHILD' } });
    expect(audit).toHaveLength(1);
    expect(audit[0].metadata).toMatchObject({
      oldTitle: 'VP Engineering',
      newTitle: 'Chief Technology Officer',
      resolution: 'APPLIED',
    });
  });

  it('dismissing a lost child leaves the contact untouched', async () => {
    const token = await loginAsAdmin();
    const { contact, lostChild } = await seedLostChild();

    const res = await request(app)
      .post(`/api/v1/admin/sourcing/lost-children/${lostChild.id}/resolve`)
      .set('Authorization', `Bearer ${token}`)
      .send({ resolution: 'DISMISSED' });
    expect(res.status).toBe(200);

    const untouched = await prisma.contact.findUnique({ where: { id: contact.id } });
    expect(untouched.title).toBe('VP Engineering');
  });

  it('an approved import auto-marks a matching pending person as ADDED', async () => {
    // Exercised through the import path itself: inserting a contact whose
    // slug matches a PENDING row flips it (see databaseImportService).
    const { processImportBatch } = await import('../services/databaseImportService.js');
    const admin = await prisma.superAdmin.create({
      data: { email: 'importer@datapit.io', passwordHash: await hashPassword('x'.repeat(12)), name: 'Importer' },
    });
    const batch = await prisma.databaseImportBatch.create({
      data: { filename: 'test.csv', status: 'PROCESSING', totalRows: 1, uploadedById: admin.id },
    });
    await seedMissingPerson({
      linkedinSlug: 'casey-nguyen',
      linkedinUrl: 'https://www.linkedin.com/in/casey-nguyen',
    });

    await processImportBatch({
      batchId: batch.id,
      rows: [
        {
          'First Name': 'Casey',
          'Last Name': 'Nguyen',
          'Company Name': 'Skyline Labs',
          Domain: 'skylinelabs.com',
          'Job Title': 'Head of Growth',
          'Prospect Linkedin profile Link': 'https://www.linkedin.com/in/Casey-Nguyen/',
        },
      ],
    });

    const row = await prisma.missingPerson.findUnique({ where: { linkedinSlug: 'casey-nguyen' } });
    expect(row.status).toBe('ADDED');

    const contact = await prisma.contact.findFirst({ where: { linkedinSlug: 'casey-nguyen' } });
    expect(contact).not.toBeNull();
  });
});
