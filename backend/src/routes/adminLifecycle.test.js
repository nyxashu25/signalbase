import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { resetDb, resetRedis } from '../test/dbHelpers.js';
import { registerAndVerify } from '../test/authHelpers.js';
import { prisma } from '../config/db.js';
import { redis } from '../config/redis.js';
import { hashPassword } from '../utils/password.js';
import { getBalance } from '../services/creditService.js';
import { purgeExpiredDeletions } from '../services/deletionService.js';
import { invalidateWorkspaceGuardCache } from '../middleware/workspaceGuard.js';

const app = createApp();
const adminCreds = { email: 'root@datapit.io', password: 'super-secret-admin-pw' };

async function loginAsAdmin() {
  const passwordHash = await hashPassword(adminCreds.password);
  await prisma.superAdmin.create({ data: { email: adminCreds.email, passwordHash, name: 'Root' } });
  const res = await request(app).post('/api/v1/admin/auth/login').send(adminCreds);
  return res.body.accessToken;
}

async function registerTenant(email = 'owner@lifecycle.test') {
  const res = await registerAndVerify(app, {
    email,
    password: 'correct-horse-battery',
    name: 'Owner',
    orgName: 'Lifecycle Co',
  });
  return {
    accessToken: res.body.accessToken,
    workspaceId: res.body.workspace.id,
    userId: res.body.user.id,
    email,
  };
}

describe('admin lifecycle', () => {
  beforeEach(async () => {
    await resetDb();
    await resetRedis();
    // The workspace guard cache is in-process — a previous test's entries
    // must never leak across resetDb.
    invalidateWorkspaceGuardCache();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('adjusts a user’s personal credits in add/remove/set modes with audit rows', async () => {
    const token = await loginAsAdmin();
    const tenant = await registerTenant(); // signup grant: 800

    const add = await request(app)
      .post(`/api/v1/admin/users/${tenant.userId}/credits`)
      .set('Authorization', `Bearer ${token}`)
      .send({ mode: 'add', amount: 200 });
    expect(add.status).toBe(200);
    expect(add.body.balance).toBe(1000);

    // remove clamps at zero — asking for more than the balance never goes
    // negative.
    const remove = await request(app)
      .post(`/api/v1/admin/users/${tenant.userId}/credits`)
      .set('Authorization', `Bearer ${token}`)
      .send({ mode: 'remove', amount: 5000 });
    expect(remove.body.balance).toBe(0);

    const set = await request(app)
      .post(`/api/v1/admin/users/${tenant.userId}/credits`)
      .set('Authorization', `Bearer ${token}`)
      .send({ mode: 'set', amount: 1234 });
    expect(set.body.balance).toBe(1234);
    expect(await getBalance(tenant.userId)).toBe(1234);

    const auditCount = await prisma.adminAuditLog.count({
      where: { action: 'ADJUST_USER_CREDITS' },
    });
    expect(auditCount).toBe(3);
  });

  it('suspending a workspace cuts off every request; unsuspend restores', async () => {
    const token = await loginAsAdmin();
    const tenant = await registerTenant();

    const before = await request(app)
      .get('/api/v1/workspace/members')
      .set('Authorization', `Bearer ${tenant.accessToken}`);
    expect(before.status).toBe(200);

    const suspend = await request(app)
      .post(`/api/v1/admin/workspaces/${tenant.workspaceId}/suspend`)
      .set('Authorization', `Bearer ${token}`);
    expect(suspend.status).toBe(204);

    const blocked = await request(app)
      .get('/api/v1/workspace/members')
      .set('Authorization', `Bearer ${tenant.accessToken}`);
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.message).toMatch(/suspended/);

    await request(app)
      .post(`/api/v1/admin/workspaces/${tenant.workspaceId}/unsuspend`)
      .set('Authorization', `Bearer ${token}`);
    const restored = await request(app)
      .get('/api/v1/workspace/members')
      .set('Authorization', `Bearer ${tenant.accessToken}`);
    expect(restored.status).toBe(200);
  });

  it('soft-deleting a user blocks login, hides them, lists them as deleted, and restore undoes it', async () => {
    const token = await loginAsAdmin();
    const tenant = await registerTenant();

    const del = await request(app)
      .delete(`/api/v1/admin/users/${tenant.userId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(204);

    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: tenant.email, password: 'correct-horse-battery' });
    expect(login.status).toBe(403);
    expect(login.body.error.message).toMatch(/deleted/);

    // Hidden from the default admin listing; present in deleted view + section.
    const defaultList = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${token}`);
    expect(defaultList.body.results.some((u) => u.id === tenant.userId)).toBe(false);

    const deletedList = await request(app)
      .get('/api/v1/admin/users')
      .query({ deleted: 'true' })
      .set('Authorization', `Bearer ${token}`);
    expect(deletedList.body.results.some((u) => u.id === tenant.userId)).toBe(true);

    const section = await request(app)
      .get('/api/v1/admin/deleted')
      .set('Authorization', `Bearer ${token}`);
    const row = section.body.users.find((u) => u.id === tenant.userId);
    expect(row).toBeTruthy();
    expect(new Date(row.purgeAt).getTime()).toBeGreaterThan(Date.now());

    await request(app)
      .post(`/api/v1/admin/users/${tenant.userId}/restore`)
      .set('Authorization', `Bearer ${token}`);
    const loginAfter = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: tenant.email, password: 'correct-horse-battery' });
    expect(loginAfter.status).toBe(200);
  });

  it('soft-deleting a workspace blocks its members and shows in the deleted section', async () => {
    const token = await loginAsAdmin();
    const tenant = await registerTenant();

    await request(app)
      .delete(`/api/v1/admin/workspaces/${tenant.workspaceId}`)
      .set('Authorization', `Bearer ${token}`);

    const blocked = await request(app)
      .get('/api/v1/workspace/members')
      .set('Authorization', `Bearer ${tenant.accessToken}`);
    expect(blocked.status).toBe(403);

    const section = await request(app)
      .get('/api/v1/admin/deleted')
      .set('Authorization', `Bearer ${token}`);
    expect(section.body.workspaces.some((w) => w.id === tenant.workspaceId)).toBe(true);

    await request(app)
      .post(`/api/v1/admin/workspaces/${tenant.workspaceId}/restore`)
      .set('Authorization', `Bearer ${token}`);
    const restored = await request(app)
      .get('/api/v1/workspace/members')
      .set('Authorization', `Bearer ${tenant.accessToken}`);
    expect(restored.status).toBe(200);
  });

  it('admin removes a member from a workspace (owner protected) with an audit row', async () => {
    const token = await loginAsAdmin();
    const tenant = await registerTenant();
    const mate = await prisma.user.create({
      data: { email: 'mate@lifecycle.test', passwordHash: 'x', name: 'Mate' },
    });
    await prisma.membership.create({
      data: { userId: mate.id, workspaceId: tenant.workspaceId, role: 'MEMBER' },
    });

    const removed = await request(app)
      .delete(`/api/v1/admin/workspaces/${tenant.workspaceId}/members/${mate.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(removed.status).toBe(204);
    expect(
      await prisma.membership.findFirst({
        where: { workspaceId: tenant.workspaceId, userId: mate.id },
      }),
    ).toBeNull();

    const ownerAttempt = await request(app)
      .delete(`/api/v1/admin/workspaces/${tenant.workspaceId}/members/${tenant.userId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(ownerAttempt.status).toBe(409);

    expect(await prisma.adminAuditLog.count({ where: { action: 'REMOVE_MEMBER' } })).toBe(1);
  });

  it('the 60-day purge hard-deletes users (SetNull survivors intact) and workspaces + Redis keys', async () => {
    const tenant = await registerTenant();
    const sixtyOneDaysAgo = new Date(Date.now() - 61 * 24 * 3600_000);

    // Give the user attached content that used to RESTRICT-block deletion.
    const list = await prisma.list.create({
      data: {
        workspaceId: tenant.workspaceId,
        name: 'Their list',
        type: 'CONTACTS',
        createdById: tenant.userId,
      },
    });
    const ticket = await prisma.ticket.create({
      data: {
        workspaceId: tenant.workspaceId,
        createdById: tenant.userId,
        type: 'SUPPORT',
        subject: 'Help',
      },
    });

    // A second workspace to purge, owned by someone who survives.
    const other = await registerTenant('other@lifecycle.test');

    await prisma.user.update({
      where: { id: tenant.userId },
      data: { deletedAt: sixtyOneDaysAgo },
    });
    await prisma.workspace.update({
      where: { id: other.workspaceId },
      data: { deletedAt: sixtyOneDaysAgo },
    });
    // A too-recent deletion must NOT purge.
    const fresh = await registerTenant('fresh@lifecycle.test');
    await prisma.user.update({ where: { id: fresh.userId }, data: { deletedAt: new Date() } });

    const result = await purgeExpiredDeletions();
    expect(result.purgedUsers).toBe(1);
    expect(result.purgedWorkspaces).toBe(1);

    // User gone, their balance key gone, content survives with null creator.
    expect(await prisma.user.findUnique({ where: { id: tenant.userId } })).toBeNull();
    expect(await redis.get(`credits:balance:user:${tenant.userId}`)).toBeNull();
    const survivingList = await prisma.list.findUnique({ where: { id: list.id } });
    expect(survivingList.createdById).toBeNull();
    const survivingTicket = await prisma.ticket.findUnique({ where: { id: ticket.id } });
    expect(survivingTicket.createdById).toBeNull();

    // Workspace gone; its (non-deleted) owner user survives with their balance.
    expect(await prisma.workspace.findUnique({ where: { id: other.workspaceId } })).toBeNull();
    expect(await prisma.user.findUnique({ where: { id: other.userId } })).not.toBeNull();
    expect(await getBalance(other.userId)).toBe(800);

    // The fresh deletion is still waiting.
    expect(await prisma.user.findUnique({ where: { id: fresh.userId } })).not.toBeNull();
  });
});
