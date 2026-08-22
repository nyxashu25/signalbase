// The getting-started checklist (docs/UX-ROADMAP.md Phase 3). Each task is
// detected from data the workspace already produces (an EmailReveal row, a
// Sequence row, …) — nothing here is self-reported, except SEARCH_PEOPLE,
// which has no persisted artefact and is recorded by the people-search
// controller instead. `reward` is paid once, on first completion, as an
// ONBOARDING_REWARD ledger row (see onboardingService.js).
//
// Totals: 9 rewarded tasks × 5 + 3 groups × 10 = 75 credits — exactly
// MAX_REWARD_CREDITS, which doubles as a hard cap in case the numbers here
// ever drift.

export const TASK_REWARD_CREDITS = 5;
export const GROUP_REWARD_CREDITS = 10;
export const MAX_REWARD_CREDITS = 75;

export const ONBOARDING_GROUPS = [
  {
    key: 'find',
    label: 'Find your first contacts',
    description: 'Search the database, unlock an email, and keep what you find.',
    reward: GROUP_REWARD_CREDITS,
    tasks: [
      {
        key: 'SEARCH_PEOPLE',
        label: 'Run a people search',
        description: 'Filter by title, seniority, industry or location.',
        cta: { label: 'Search people', to: '/app/people' },
        reward: TASK_REWARD_CREDITS,
      },
      {
        key: 'REVEAL_EMAIL',
        label: 'Reveal an email address',
        description: 'Use "Access email" on any contact — 2 credits each.',
        cta: { label: 'Search people', to: '/app/people' },
        reward: TASK_REWARD_CREDITS,
      },
      {
        key: 'ADD_TO_LIST',
        label: 'Add a contact to a list',
        description: 'Lists are how you keep prospects together for export or outreach.',
        cta: { label: 'Search people', to: '/app/people' },
        reward: TASK_REWARD_CREDITS,
      },
      {
        key: 'SAVE_SEARCH',
        label: 'Save a search',
        description: 'Name a filter set so you can rerun it in one click.',
        cta: { label: 'Search people', to: '/app/people' },
        reward: TASK_REWARD_CREDITS,
      },
    ],
  },
  {
    key: 'reach',
    label: 'Reach out',
    description: 'Put a contact into an automated email cadence.',
    reward: GROUP_REWARD_CREDITS,
    // Sequences are gated to paid plans (config/planConfig.js) — the
    // service marks these tasks `requiresPlan` for a FREE workspace so the
    // UI can explain the lock instead of sending the user into a 402.
    requiresSequences: true,
    tasks: [
      {
        key: 'CREATE_SEQUENCE',
        label: 'Create a sequence',
        description: 'A sequence is a series of email and wait steps.',
        cta: { label: 'New sequence', to: '/app/sequences/new' },
        reward: TASK_REWARD_CREDITS,
      },
      {
        key: 'ACTIVATE_SEQUENCE',
        label: 'Activate it',
        description: 'Drafts never send — activate to start the cadence.',
        cta: { label: 'Open sequences', to: '/app/sequences' },
        reward: TASK_REWARD_CREDITS,
      },
      {
        key: 'ENROLL_CONTACT',
        label: 'Enroll a contact',
        description: 'Enroll a revealed contact and the first step sends on schedule.',
        cta: { label: 'Open sequences', to: '/app/sequences' },
        reward: TASK_REWARD_CREDITS,
      },
    ],
  },
  {
    key: 'explore',
    label: 'Know your way around',
    description: 'The two-minute version of everything else.',
    reward: GROUP_REWARD_CREDITS,
    tasks: [
      {
        key: 'VERIFY_EMAIL',
        label: 'Verify your email',
        description: 'Done the moment you clicked the confirmation link.',
        cta: null,
        reward: 0,
      },
      {
        key: 'TAKE_TOUR',
        label: 'Take the product tour',
        description: 'The guided walkthrough that ran on your first sign-in.',
        cta: { label: 'Replay tour', to: '/app?tour=1' },
        reward: TASK_REWARD_CREDITS,
      },
      {
        key: 'VIEW_COMPANY',
        label: 'Open a company profile',
        description: 'Company pages show every contact we have at that company.',
        cta: { label: 'Search companies', to: '/app/companies' },
        reward: TASK_REWARD_CREDITS,
      },
      {
        key: 'INVITE_TEAMMATE',
        label: 'Invite a teammate',
        description: 'Seat invites are on the way — this will light up when they ship.',
        cta: null,
        reward: 0,
        // Not built yet (TODO.md P0) — shown greyed out, never counted
        // toward completion, never rewarded.
        available: false,
      },
    ],
  },
];

export const ONBOARDING_TASKS = ONBOARDING_GROUPS.flatMap((g) =>
  g.tasks.map((t) => ({ ...t, groupKey: g.key })),
);

export const GROUP_COMPLETION_KEY = (groupKey) => `group:${groupKey}`;
