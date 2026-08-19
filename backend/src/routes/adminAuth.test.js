import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { resetDb, resetRedis } from '../test/dbHelpers.js';
import { prisma } from '../config/db.js';
import { hashPassword } from '../utils/password.js';
import { signAccessToken } from '../services/tokenService.js';
import { verifyAdminToken } from '../services/adminTokenService.js';

const app = createApp();

const adminCreds = { email: 'root@datapit.io', password: 'super-secret-admin-pw' };

async function seedAdmin() {
  const passwordHash = await hashPassword(adminCreds.password);
  return prisma.superAdmin.create({
    data: { email: adminCreds.email, passwordHash, name: 'Root Admin' },
  });
}

describe('admin auth', () => {
  beforeEach(async () => {
    await resetDb();
    await resetRedis();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('logs a super admin in and returns an access token', async () => {
    await seedAdmin();

    const res = await request(app).post('/api/v1/admin/auth/login').send(adminCreds);

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.admin.email).toBe(adminCreds.email);
    expect(res.body.admin.passwordHash).toBeUndefined();
  });

  it('rejects a wrong password and an unknown email with the same generic error', async () => {
    await seedAdmin();

    const wrongPassword = await request(app)
      .post('/api/v1/admin/auth/login')
      .send({ email: adminCreds.email, password: 'nope' });
    const unknownEmail = await request(app)
      .post('/api/v1/admin/auth/login')
      .send({ email: 'nobody@datapit.io', password: 'nope' });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.error.message).toBe(unknownEmail.body.error.message);
  });

  it('an admin access token cannot authenticate against tenant-only routes', async () => {
    const admin = await seedAdmin();
    const login = await request(app).post('/api/v1/admin/auth/login').send(adminCreds);

    const meAsAdmin = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`);
    expect(meAsAdmin.status).toBe(401);

    // Sanity-check the reverse direction too — a tenant token was never
    // issued here, so exercise adminTokenService directly against a
    // tenant-shaped token to confirm the different secret rejects it.
    const tenantToken = signAccessToken({
      userId: admin.id,
      workspaceId: 'w1',
      orgId: 'o1',
      role: 'OWNER',
    });
    expect(() => verifyAdminToken(tenantToken)).toThrow();
  });

  it('suspended tenant users cannot log in', async () => {
    const passwordHash = await hashPassword('correct-horse-battery');
    const org = await prisma.org.create({ data: { name: 'Acme', slug: 'acme-susp' } });
    const workspace = await prisma.workspace.create({
      data: { orgId: org.id, name: 'Acme Workspace' },
    });
    const user = await prisma.user.create({
      data: {
        email: 'suspended@acme.test',
        passwordHash,
        name: 'Suspended User',
        suspendedAt: new Date(),
      },
    });
    await prisma.membership.create({
      data: { userId: user.id, workspaceId: workspace.id, role: 'OWNER' },
    });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'suspended@acme.test', password: 'correct-horse-battery' });

    expect(res.status).toBe(403);
  });
});
