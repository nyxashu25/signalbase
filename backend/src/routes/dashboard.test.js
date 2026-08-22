import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { resetDb, resetRedis } from '../test/dbHelpers.js';
import { registerAndVerify } from '../test/authHelpers.js';
import { prisma } from '../config/db.js';
import { redis } from '../config/redis.js';
import { MAX_REWARD_CREDITS } from '../config/onboardingConfig.js';

const app = createApp();

async function registerOrg(orgName, email) {
  const res = await registerAndVerify(app, {
    email,
    password: 'correct-horse-battery',
    name: 'Owner',
    orgName,
  });
  return {
    accessToken: res.body.accessToken,
    workspaceId: res.body.workspace.id,
    userId: res.body.user.id,
  };
}

async function seedContact() {
  const company = await prisma.company.create({
    data: { name: 'Acme Widgets', domain: 'acme-widgets.test', industry: 'Software' },
  });
  const contact = await prisma.contact.create({
    data: { companyId: company.id, firstName: 'Ada', lastName: 'Lovelace', email: 'ada@acme-widgets.test' },
  });
  return { company, contact };
}

function getOnboarding(token) {
  return request(app).get('/api/v1/dashboard/onboarding').set('Authorization', `Bearer ${token}`);
}

async function balance(workspaceId) {
  return Number(await redis.get(`credits:balance:${workspaceId}`));
}

describe('dashboard: onboarding checklist', () => {
  beforeEach(async () => {
    await resetDb();
    await resetRedis();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('requires auth', async () => {
    const res = await request(app).get('/api/v1/dashboard/onboarding');
    expect(res.status).toBe(401);
  });

  it('starts a fresh workspace with only "verify email" done and rewards nothing for it', async () => {
    const org = await registerOrg('Acme', 'owner@acme.test');
    const before = await balance(org.workspaceId);

    const res = await getOnboarding(org.accessToken);
    expect(res.status).toBe(200);
    expect(res.body.groups.map((g) => g.key)).toEqual(['find', 'reach', 'explore']);

    const allTasks = res.body.groups.flatMap((g) => g.tasks);
    const verify = allTasks.find((t) => t.key === 'VERIFY_EMAIL');
    expect(verify.completed).toBe(true);
    expect(verify.reward).toBe(0);
    expect(allTasks.filter((t) => t.completed).map((t) => t.key)).toEqual(['VERIFY_EMAIL']);

    // INVITE_TEAMMATE is shown but not built — never counted.
    const invite = allTasks.find((t) => t.key === 'INVITE_TEAMMATE');
    expect(invite.available).toBe(false);
    expect(res.body.totalCount).toBe(10);
    expect(res.body.completedCount).toBe(1);
    expect(res.body.percent).toBe(10);
    expect(res.body.nextTask).toBe('SEARCH_PEOPLE');
    expect(res.body.creditsEarned).toBe(0);
    expect(res.body.creditsAvailable).toBe(MAX_REWARD_CREDITS);
    expect(res.body.justRewarded).toEqual([]);
    expect(await balance(org.workspaceId)).toBe(before);
  });

  it('marks sequence tasks as plan-locked on the Free plan', async () => {
    const org = await registerOrg('Acme', 'owner@acme.test');
    const res = await getOnboarding(org.accessToken);
    const reach = res.body.groups.find((g) => g.key === 'reach');
    expect(reach.requiresPlan).toBe('BASIC');
    expect(reach.tasks.every((t) => t.requiresPlan === 'BASIC')).toBe(true);
    // The suggested next task skips the locked group.
    expect(res.body.nextTask).toBe('SEARCH_PEOPLE');

    await prisma.workspace.update({ where: { id: org.workspaceId }, data: { plan: 'BASIC' } });
    const after = await getOnboarding(org.accessToken);
    expect(after.body.groups.find((g) => g.key === 'reach').requiresPlan).toBeNull();
  });

  it('detects a completed task from existing data, rewards it exactly once, and writes an ONBOARDING_REWARD ledger row', async () => {
    const org = await registerOrg('Acme', 'owner@acme.test');
    const { contact } = await seedContact();
    const before = await balance(org.workspaceId);

    await prisma.emailReveal.create({
      data: { workspaceId: org.workspaceId, contactId: contact.id, revealedById: org.userId },
    });

    const first = await getOnboarding(org.accessToken);
    const reveal = first.body.groups.flatMap((g) => g.tasks).find((t) => t.key === 'REVEAL_EMAIL');
    expect(reveal.completed).toBe(true);
    expect(reveal.rewardedCredits).toBe(5);
    expect(first.body.justRewarded).toEqual([
      { key: 'REVEAL_EMAIL', label: 'Reveal an email address', credits: 5 },
    ]);
    expect(first.body.creditsEarned).toBe(5);
    expect(await balance(org.workspaceId)).toBe(before + 5);

    const ledger = await prisma.creditLedgerEntry.findMany({
      where: { workspaceId: org.workspaceId, reason: 'ONBOARDING_REWARD' },
    });
    expect(ledger).toHaveLength(1);
    expect(ledger[0].delta).toBe(5);

    // Reading again never pays twice.
    const second = await getOnboarding(org.accessToken);
    expect(second.body.justRewarded).toEqual([]);
    expect(second.body.creditsEarned).toBe(5);
    expect(await balance(org.workspaceId)).toBe(before + 5);
  });

  it('records a people search as a completed task and pays the reward on the next checklist read', async () => {
    const org = await registerOrg('Acme', 'owner@acme.test');
    const search = await request(app)
      .get('/api/v1/search/people?page=1&pageSize=5')
      .set('Authorization', `Bearer ${org.accessToken}`);
    expect(search.status).toBe(200);

    const res = await getOnboarding(org.accessToken);
    const task = res.body.groups.flatMap((g) => g.tasks).find((t) => t.key === 'SEARCH_PEOPLE');
    expect(task.completed).toBe(true);
    expect(res.body.justRewarded.map((r) => r.key)).toContain('SEARCH_PEOPLE');
  });

  it('pays the group bonus once every task in a group is done', async () => {
    const org = await registerOrg('Acme', 'owner@acme.test');
    const { contact } = await seedContact();
    const before = await balance(org.workspaceId);

    // Complete all four "find" tasks via their data trails.
    await prisma.onboardingTaskCompletion.create({
      data: { workspaceId: org.workspaceId, key: 'SEARCH_PEOPLE' },
    });
    await prisma.emailReveal.create({
      data: { workspaceId: org.workspaceId, contactId: contact.id, revealedById: org.userId },
    });
    const list = await prisma.list.create({
      data: { workspaceId: org.workspaceId, name: 'Leads', type: 'CONTACTS', createdById: org.userId },
    });
    await prisma.listItem.create({ data: { listId: list.id, contactId: contact.id } });
    await prisma.savedSearch.create({
      data: {
        workspaceId: org.workspaceId,
        createdById: org.userId,
        type: 'PEOPLE',
        name: 'VPs',
        filters: { seniority: ['VP'] },
      },
    });

    const res = await getOnboarding(org.accessToken);
    const find = res.body.groups.find((g) => g.key === 'find');
    expect(find.completed).toBe(true);
    expect(find.tasks.every((t) => t.completed)).toBe(true);
    const keys = res.body.justRewarded.map((r) => r.key);
    expect(keys).toEqual(
      expect.arrayContaining(['SEARCH_PEOPLE', 'REVEAL_EMAIL', 'ADD_TO_LIST', 'SAVE_SEARCH', 'group:find']),
    );
    // 4 tasks × 5 + group bonus 10
    expect(res.body.creditsEarned).toBe(30);
    expect(await balance(org.workspaceId)).toBe(before + 30);
    expect(res.body.nextTask).toBe('TAKE_TOUR'); // "reach" is plan-locked on Free
  });

  it('never pays out more than the cap', async () => {
    const org = await registerOrg('Acme', 'owner@acme.test');
    const before = await balance(org.workspaceId);
    // Pretend every reward has already been earned.
    await prisma.onboardingTaskCompletion.create({
      data: {
        workspaceId: org.workspaceId,
        key: 'SAVE_SEARCH',
        rewardCredits: MAX_REWARD_CREDITS,
        rewardedAt: new Date(),
      },
    });
    await prisma.onboardingTaskCompletion.create({
      data: { workspaceId: org.workspaceId, key: 'SEARCH_PEOPLE' },
    });

    const res = await getOnboarding(org.accessToken);
    expect(res.body.justRewarded).toEqual([]);
    expect(res.body.creditsEarned).toBe(MAX_REWARD_CREDITS);
    expect(await balance(org.workspaceId)).toBe(before);
  });

  it('is workspace-isolated', async () => {
    const a = await registerOrg('Acme', 'owner@acme.test');
    const b = await registerOrg('Globex', 'owner@globex.test');
    const { contact } = await seedContact();
    await prisma.emailReveal.create({
      data: { workspaceId: a.workspaceId, contactId: contact.id, revealedById: a.userId },
    });

    const resB = await getOnboarding(b.accessToken);
    const reveal = resB.body.groups.flatMap((g) => g.tasks).find((t) => t.key === 'REVEAL_EMAIL');
    expect(reveal.completed).toBe(false);
    expect(resB.body.creditsEarned).toBe(0);
  });
});

describe('dashboard: stats', () => {
  beforeEach(async () => {
    await resetDb();
    await resetRedis();
  });

  it('reports this-month reveals and credits used plus lists/sequences counts', async () => {
    const org = await registerOrg('Acme', 'owner@acme.test');
    const { contact } = await seedContact();
    await prisma.emailReveal.create({
      data: { workspaceId: org.workspaceId, contactId: contact.id, revealedById: org.userId },
    });
    await prisma.creditLedgerEntry.createMany({
      data: [
        { workspaceId: org.workspaceId, delta: -2, reason: 'EMAIL_REVEAL', contactId: contact.id },
        { workspaceId: org.workspaceId, delta: -20, reason: 'COMPANY_VIEW' },
        // Last month — must not count.
        {
          workspaceId: org.workspaceId,
          delta: -50,
          reason: 'CSV_EXPORT',
          createdAt: new Date(Date.UTC(2020, 0, 15)),
        },
        { workspaceId: org.workspaceId, delta: 5, reason: 'ONBOARDING_REWARD' },
      ],
    });
    await prisma.list.create({
      data: { workspaceId: org.workspaceId, name: 'Leads', type: 'CONTACTS', createdById: org.userId },
    });
    await prisma.sequence.create({
      data: { workspaceId: org.workspaceId, name: 'Q3', status: 'ACTIVE', createdById: org.userId },
    });
    await prisma.sequence.create({
      data: { workspaceId: org.workspaceId, name: 'Draft', status: 'DRAFT', createdById: org.userId },
    });

    const res = await request(app)
      .get('/api/v1/dashboard/stats')
      .set('Authorization', `Bearer ${org.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      revealsThisMonth: 1,
      creditsUsedThisMonth: 22,
      activeSequences: 1,
      lists: 1,
      savedContacts: 0,
    });
  });
});
