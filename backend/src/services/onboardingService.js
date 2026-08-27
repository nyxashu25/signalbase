import { prisma } from '../config/db.js';
import { grantCredits } from './creditService.js';
import { logger } from '../config/logger.js';
import { planIncludesSequences } from '../config/planConfig.js';
import {
  ONBOARDING_GROUPS,
  ONBOARDING_TASKS,
  GROUP_COMPLETION_KEY,
  MAX_REWARD_CREDITS,
} from '../config/onboardingConfig.js';

// ---------------------------------------------------------------------------
// Detection — one cheap indexed count per *incomplete* task. Every detector
// is workspace-scoped (or, for the two user-level facts, scoped to the
// requesting user); once a completion row exists the detector never runs
// again for that workspace.
// ---------------------------------------------------------------------------

const DETECTORS = {
  // No persisted artefact for a search — recorded by searchController.people
  // via recordEvent() below. A missing row simply means "not yet".
  SEARCH_PEOPLE: async () => false,
  REVEAL_EMAIL: async ({ workspaceId }) =>
    (await prisma.emailReveal.count({ where: { workspaceId }, take: 1 })) > 0,
  ADD_TO_LIST: async ({ workspaceId }) =>
    (await prisma.listItem.count({
      where: { contactId: { not: null }, list: { workspaceId } },
      take: 1,
    })) > 0,
  SAVE_SEARCH: async ({ workspaceId }) =>
    (await prisma.savedSearch.count({ where: { workspaceId }, take: 1 })) > 0,
  CREATE_SEQUENCE: async ({ workspaceId }) =>
    (await prisma.sequence.count({ where: { workspaceId }, take: 1 })) > 0,
  // A sequence that is or was running — PAUSED can only be reached from
  // ACTIVE. An enrollment also implies activation (enroll requires it).
  ACTIVATE_SEQUENCE: async ({ workspaceId }) =>
    (await prisma.sequence.count({
      where: { workspaceId, status: { in: ['ACTIVE', 'PAUSED'] } },
      take: 1,
    })) > 0 || (await prisma.sequenceEnrollment.count({ where: { workspaceId }, take: 1 })) > 0,
  ENROLL_CONTACT: async ({ workspaceId }) =>
    (await prisma.sequenceEnrollment.count({ where: { workspaceId }, take: 1 })) > 0,
  VERIFY_EMAIL: async ({ user }) => Boolean(user?.emailVerified),
  TAKE_TOUR: async ({ user }) => Boolean(user?.tutorialCompletedAt),
  VIEW_COMPANY: async ({ workspaceId }) =>
    (await prisma.companyDetailView.count({ where: { workspaceId }, take: 1 })) > 0,
  INVITE_TEAMMATE: async () => false,
};

function isUniqueViolation(err) {
  return err?.code === 'P2002';
}

/** Creates the completion row if absent. Returns true only for the caller that actually created it. */
async function markComplete(workspaceId, key) {
  try {
    await prisma.onboardingTaskCompletion.create({ data: { workspaceId, key } });
    return true;
  } catch (err) {
    if (isUniqueViolation(err)) return false;
    throw err;
  }
}

/**
 * Called by routes that observe a task happening with no data trail (today:
 * the people search). Fire-and-forget semantics — never throws, never
 * slows the request it's attached to. The reward itself is paid out by
 * getProgress() the next time the checklist is read, so the user sees the
 * "+5 credits" toast on the Home screen rather than nowhere.
 */
export async function recordEvent(workspaceId, key) {
  if (!ONBOARDING_TASKS.some((t) => t.key === key)) return;
  try {
    await markComplete(workspaceId, key);
  } catch (err) {
    logger.warn({ err, workspaceId, key }, 'Failed to record onboarding event');
  }
}

// ---------------------------------------------------------------------------
// Rewards — each completion row is paid out at most once: the guarded
// updateMany on rewardedAt IS NULL is the lock, so two concurrent
// getProgress() calls can't both credit the same task. The cap is enforced
// against the sum already recorded on the rows themselves.
// ---------------------------------------------------------------------------

async function payReward(workspaceId, userId, row, configuredReward, alreadyEarned) {
  const remaining = Math.max(0, MAX_REWARD_CREDITS - alreadyEarned);
  const amount = Math.min(configuredReward, remaining);

  const claimed = await prisma.onboardingTaskCompletion.updateMany({
    where: { id: row.id, rewardedAt: null },
    data: { rewardedAt: new Date(), rewardCredits: amount },
  });
  if (claimed.count !== 1) return 0; // someone else paid it out first

  if (amount > 0) {
    // Credits are personal — the reward lands on the balance of the user
    // whose getProgress() call claimed it (in practice, whoever finished
    // the checklist task).
    await grantCredits({ userId, workspaceId, amount, reason: 'ONBOARDING_REWARD' });
  }
  return amount;
}

function labelFor(key) {
  if (key.startsWith('group:')) {
    return ONBOARDING_GROUPS.find((g) => GROUP_COMPLETION_KEY(g.key) === key)?.label ?? key;
  }
  return ONBOARDING_TASKS.find((t) => t.key === key)?.label ?? key;
}

function rewardFor(key) {
  if (key.startsWith('group:')) {
    return ONBOARDING_GROUPS.find((g) => GROUP_COMPLETION_KEY(g.key) === key)?.reward ?? 0;
  }
  return ONBOARDING_TASKS.find((t) => t.key === key)?.reward ?? 0;
}

/**
 * The whole checklist for a workspace, as the Home screen renders it. Side
 * effects, by design: newly-detected completions are recorded, and any
 * unpaid reward (task or group) is paid out — the `justRewarded` list is
 * what the frontend turns into "+5 credits" toasts.
 */
export async function getProgress(workspaceId, userId) {
  const [workspace, user, existing] = await Promise.all([
    prisma.workspace.findUnique({ where: { id: workspaceId }, select: { plan: true } }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { emailVerified: true, tutorialCompletedAt: true },
    }),
    prisma.onboardingTaskCompletion.findMany({ where: { workspaceId } }),
  ]);

  const rows = new Map(existing.map((r) => [r.key, r]));
  const ctx = { workspaceId, userId, user };

  // 1. Detect anything newly done.
  for (const task of ONBOARDING_TASKS) {
    if (rows.has(task.key) || task.available === false) continue;
    const detector = DETECTORS[task.key];
    if (!detector) continue;
    if (await detector(ctx)) {
      await markComplete(workspaceId, task.key);
    }
  }

  // Re-read once so group checks, rewards and the response all reflect
  // step 1 — including rows another concurrent request may have created.
  const fresh = await prisma.onboardingTaskCompletion.findMany({ where: { workspaceId } });
  const freshRows = new Map(fresh.map((r) => [r.key, r]));

  // 2. Group completion = every counted task in the group is done.
  for (const group of ONBOARDING_GROUPS) {
    const gKey = GROUP_COMPLETION_KEY(group.key);
    if (freshRows.has(gKey)) continue;
    const counted = group.tasks.filter((t) => t.available !== false);
    if (counted.every((t) => freshRows.has(t.key))) {
      await markComplete(workspaceId, gKey);
      const row = await prisma.onboardingTaskCompletion.findUnique({
        where: { workspaceId_key: { workspaceId, key: gKey } },
      });
      if (row) freshRows.set(gKey, row);
    }
  }

  // 3. Pay out anything unpaid, oldest first, under the cap.
  let earned = [...freshRows.values()].reduce((sum, r) => sum + r.rewardCredits, 0);
  const justRewarded = [];
  const unpaid = [...freshRows.values()]
    .filter((r) => r.rewardedAt === null)
    .sort((a, b) => a.completedAt - b.completedAt);
  for (const row of unpaid) {
    const configured = rewardFor(row.key);
    const paid = await payReward(workspaceId, userId, row, configured, earned);
    if (paid > 0) {
      earned += paid;
      justRewarded.push({ key: row.key, label: labelFor(row.key), credits: paid });
    }
    freshRows.set(row.key, { ...row, rewardedAt: new Date(), rewardCredits: paid });
  }

  // 4. Shape the response.
  const sequencesLocked = !planIncludesSequences(workspace?.plan ?? 'FREE');
  let completedCount = 0;
  let totalCount = 0;
  let nextTask = null;

  const groups = ONBOARDING_GROUPS.map((group) => {
    const tasks = group.tasks.map((task) => {
      const row = freshRows.get(task.key);
      const available = task.available !== false;
      const completed = Boolean(row);
      if (available) {
        totalCount += 1;
        if (completed) completedCount += 1;
      }
      const requiresPlan = group.requiresSequences && sequencesLocked && !completed ? 'BASIC' : null;
      if (!nextTask && available && !completed && !requiresPlan) nextTask = task.key;
      return {
        key: task.key,
        label: task.label,
        description: task.description,
        cta: task.cta,
        reward: task.reward,
        available,
        completed,
        completedAt: row?.completedAt ?? null,
        rewardedCredits: row?.rewardCredits ?? 0,
        requiresPlan,
      };
    });
    const gRow = freshRows.get(GROUP_COMPLETION_KEY(group.key));
    return {
      key: group.key,
      label: group.label,
      description: group.description,
      reward: group.reward,
      completed: Boolean(gRow),
      completedAt: gRow?.completedAt ?? null,
      requiresPlan: group.requiresSequences && sequencesLocked && !gRow ? 'BASIC' : null,
      tasks,
    };
  });

  return {
    groups,
    completedCount,
    totalCount,
    percent: totalCount === 0 ? 100 : Math.round((completedCount / totalCount) * 100),
    creditsEarned: earned,
    creditsAvailable: MAX_REWARD_CREDITS,
    nextTask,
    justRewarded,
  };
}

// ---------------------------------------------------------------------------
// Home-screen stat tiles. "This month" is the current UTC calendar month —
// the same clock the monthly credit grant runs on.
// ---------------------------------------------------------------------------

export function startOfCurrentMonthUtc(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export async function getStats(workspaceId) {
  const since = startOfCurrentMonthUtc();
  const [revealsThisMonth, usedAgg, activeSequences, lists, savedContacts] = await Promise.all([
    prisma.emailReveal.count({ where: { workspaceId, createdAt: { gte: since } } }),
    prisma.creditLedgerEntry.aggregate({
      where: { workspaceId, delta: { lt: 0 }, createdAt: { gte: since } },
      _sum: { delta: true },
    }),
    prisma.sequence.count({ where: { workspaceId, status: 'ACTIVE' } }),
    prisma.list.count({ where: { workspaceId } }),
    // "Saved" in the Phase 2 sense — contacts this workspace has kept, via a
    // reveal or a list.
    prisma.listItem.count({ where: { contactId: { not: null }, list: { workspaceId } } }),
  ]);
  return {
    revealsThisMonth,
    creditsUsedThisMonth: Math.abs(usedAgg._sum.delta ?? 0),
    activeSequences,
    lists,
    savedContacts,
    since,
  };
}
