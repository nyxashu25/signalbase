import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { prisma } from '../config/db.js';
import { resetDb, resetRedis } from '../test/dbHelpers.js';
import { getBalance } from './creditService.js';
import { distributeWorkspaceGrant, sweepFreeUserGrants } from './creditGrantService.js';
import { activateCoverage, assignSeat, suggestedBlocks } from './seatService.js';

let emailCounter = 0;

async function makeUser(name = 'User') {
  return prisma.user.create({
    data: { email: `u${++emailCounter}@grant.test`, passwordHash: 'x', name },
  });
}

async function makeWorkspace({ plan = 'PROFESSIONAL', blocks = 1 } = {}) {
  const org = await prisma.org.create({
    data: { slug: `grant-test-${++emailCounter}`, name: 'Grant Test' },
  });
  return prisma.workspace.create({
    data: { orgId: org.id, name: 'Grant Test WS', plan, blocks },
  });
}

async function addMember(workspace, user, { role = 'MEMBER', seatType = 'PENDING' } = {}) {
  return prisma.membership.create({
    data: { userId: user.id, workspaceId: workspace.id, role, seatType },
  });
}

describe('creditGrantService.distributeWorkspaceGrant', () => {
  beforeEach(async () => {
    await resetDb();
    await resetRedis();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('pays paid seats, free seats, the owner bonus — and nothing to pending', async () => {
    const workspace = await makeWorkspace({ plan: 'PROFESSIONAL' });
    const owner = await makeUser('Owner');
    const paidMember = await makeUser('Paid');
    const freeMember = await makeUser('Free');
    const pendingMember = await makeUser('Pending');
    await addMember(workspace, owner, { role: 'OWNER', seatType: 'PAID' });
    await addMember(workspace, paidMember, { seatType: 'PAID' });
    await addMember(workspace, freeMember, { seatType: 'FREE' });
    await addMember(workspace, pendingMember, { seatType: 'PENDING' });

    const { granted, totalCredits } = await distributeWorkspaceGrant(workspace.id, 1);

    expect(granted).toBe(3); // owner + paid + free earned a seat grant
    expect(totalCredits).toBe(2000 + 2000 + 1500 + 2000); // + owner bonus
    expect(await getBalance(owner.id)).toBe(2000 + 2000);
    expect(await getBalance(paidMember.id)).toBe(2000);
    expect(await getBalance(freeMember.id)).toBe(1500);
    expect(await getBalance(pendingMember.id)).toBe(0);

    const bonusRows = await prisma.creditLedgerEntry.findMany({
      where: { workspaceId: workspace.id, reason: 'OWNER_BONUS' },
    });
    expect(bonusRows).toHaveLength(1);
    expect(bonusRows[0]).toMatchObject({ userId: owner.id, delta: 2000 });
  });

  it('multiplies by months and uses the Basic rates (900/seat, no bonus)', async () => {
    const workspace = await makeWorkspace({ plan: 'BASIC' });
    const owner = await makeUser('Owner');
    await addMember(workspace, owner, { role: 'OWNER', seatType: 'PAID' });

    await distributeWorkspaceGrant(workspace.id, 3); // quarterly

    expect(await getBalance(owner.id)).toBe(900 * 3);
    const bonusRows = await prisma.creditLedgerEntry.count({
      where: { workspaceId: workspace.id, reason: 'OWNER_BONUS' },
    });
    expect(bonusRows).toBe(0);
  });

  it('skips suspended/deleted workspaces and suspended/deleted users', async () => {
    const workspace = await makeWorkspace({ plan: 'PROFESSIONAL' });
    const owner = await makeUser('Owner');
    await addMember(workspace, owner, { role: 'OWNER', seatType: 'PAID' });

    await prisma.workspace.update({
      where: { id: workspace.id },
      data: { suspendedAt: new Date() },
    });
    expect((await distributeWorkspaceGrant(workspace.id, 1)).totalCredits).toBe(0);

    await prisma.workspace.update({ where: { id: workspace.id }, data: { suspendedAt: null } });
    await prisma.user.update({ where: { id: owner.id }, data: { deletedAt: new Date() } });
    expect((await distributeWorkspaceGrant(workspace.id, 1)).totalCredits).toBe(0);
    expect(await getBalance(owner.id)).toBe(0);
  });
});

describe('creditGrantService.sweepFreeUserGrants', () => {
  beforeEach(async () => {
    await resetDb();
    await resetRedis();
  });

  it('grants 800 to due free users, exactly once, and skips seat-covered users', async () => {
    const freeWs = await makeWorkspace({ plan: 'FREE', blocks: 0 });
    const dueUser = await makeUser('Due');
    await addMember(freeWs, dueUser, { role: 'OWNER', seatType: 'PAID' }); // seatType ignored on FREE plan
    // Due: last grant 40 days ago.
    await prisma.user.update({
      where: { id: dueUser.id },
      data: { lastMonthlyGrantAt: new Date(Date.now() - 40 * 24 * 3600_000) },
    });

    const freshUser = await makeUser('Fresh');
    const freshWs = await makeWorkspace({ plan: 'FREE', blocks: 0 });
    await addMember(freshWs, freshUser, { role: 'OWNER' });
    await prisma.user.update({
      where: { id: freshUser.id },
      data: { lastMonthlyGrantAt: new Date() }, // not due yet
    });

    // Covered by a paid seat elsewhere — earns via invoice.paid, not the sweep.
    const coveredUser = await makeUser('Covered');
    const paidWs = await makeWorkspace({ plan: 'PROFESSIONAL' });
    await addMember(paidWs, coveredUser, { role: 'OWNER', seatType: 'PAID' });
    await prisma.user.update({
      where: { id: coveredUser.id },
      data: { lastMonthlyGrantAt: new Date(Date.now() - 40 * 24 * 3600_000) },
    });

    const first = await sweepFreeUserGrants();
    expect(first.grantedCount).toBe(1);
    expect(await getBalance(dueUser.id)).toBe(800);
    expect(await getBalance(freshUser.id)).toBe(0);
    expect(await getBalance(coveredUser.id)).toBe(0);

    // Second sweep right away: nobody is due — no double grant.
    const second = await sweepFreeUserGrants();
    expect(second.grantedCount).toBe(0);
    expect(await getBalance(dueUser.id)).toBe(800);
  });
});

describe('seatService', () => {
  beforeEach(async () => {
    await resetDb();
    await resetRedis();
  });

  it('suggestedBlocks covers every member with whole blocks', () => {
    expect(suggestedBlocks('BASIC', 1)).toBe(1); // 6/block
    expect(suggestedBlocks('BASIC', 6)).toBe(1);
    expect(suggestedBlocks('BASIC', 7)).toBe(2);
    expect(suggestedBlocks('PROFESSIONAL', 9)).toBe(2); // 8/block
    expect(suggestedBlocks('ORGANIZATION', 19)).toBe(1); // 19/block
    expect(suggestedBlocks('ORGANIZATION', 20)).toBe(2);
  });

  it('activateCoverage promotes pending members owner-first, paid then free, gifts once', async () => {
    const workspace = await makeWorkspace({ plan: 'BASIC', blocks: 1 }); // 5 paid + 1 free
    const users = [];
    for (let i = 0; i < 8; i++) users.push(await makeUser(`M${i}`));
    // Owner joins LAST but must still land in a paid seat first.
    for (let i = 1; i < 8; i++) await addMember(workspace, users[i]);
    await addMember(workspace, users[0], { role: 'OWNER' });

    const { activated } = await activateCoverage(workspace.id);
    expect(activated).toBe(6); // 5 paid + 1 free; 2 stay pending

    const memberships = await prisma.membership.findMany({
      where: { workspaceId: workspace.id },
      include: { user: true },
    });
    const byUser = new Map(memberships.map((m) => [m.userId, m]));
    expect(byUser.get(users[0].id).seatType).toBe('PAID'); // owner first

    const counts = { PAID: 0, FREE: 0, PENDING: 0 };
    for (const m of memberships) counts[m.seatType]++;
    expect(counts).toEqual({ PAID: 5, FREE: 1, PENDING: 2 });

    // Every covered member got the one-time 1,500 gift, pending got none.
    for (const m of memberships) {
      const expected = m.seatType === 'PENDING' ? 0 : 1500;
      expect(await getBalance(m.userId)).toBe(expected);
    }

    // Idempotent: a redelivered webhook has nothing left to promote or gift.
    const again = await activateCoverage(workspace.id);
    expect(again.activated).toBe(0);
    expect(await getBalance(users[0].id)).toBe(1500);
    const giftRows = await prisma.creditLedgerEntry.count({
      where: { workspaceId: workspace.id, reason: 'WELCOME_GIFT' },
    });
    expect(giftRows).toBe(6);
  });

  it('assignSeat enforces capacity, protects the owner, and gifts on first coverage', async () => {
    const workspace = await makeWorkspace({ plan: 'BASIC', blocks: 1 });
    const owner = await makeUser('Owner');
    const member = await makeUser('Member');
    await addMember(workspace, owner, { role: 'OWNER', seatType: 'PAID' });
    await addMember(workspace, member);

    // Assign to the single free seat -> gift fires once.
    await assignSeat(workspace.id, member.id, 'FREE');
    expect(await getBalance(member.id)).toBe(1500);

    // Re-covering (FREE -> PAID) never re-gifts.
    await assignSeat(workspace.id, member.id, 'PAID');
    expect(await getBalance(member.id)).toBe(1500);

    // Free seat capacity is 1 — a second member can't take a second free seat
    // when it's occupied.
    const third = await makeUser('Third');
    await addMember(workspace, third);
    const fourth = await makeUser('Fourth');
    await addMember(workspace, fourth, { seatType: 'FREE' });
    await expect(assignSeat(workspace.id, third.id, 'FREE')).rejects.toMatchObject({
      statusCode: 409,
    });

    // The owner can never be demoted off a paid seat.
    await expect(assignSeat(workspace.id, owner.id, 'FREE')).rejects.toMatchObject({
      statusCode: 409,
    });

    // Not a member -> 404.
    const outsider = await makeUser('Outsider');
    await expect(assignSeat(workspace.id, outsider.id, 'PAID')).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});
