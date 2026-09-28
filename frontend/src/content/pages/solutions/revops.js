import { CREDIT_COSTS, LIVE, MAX_SELF_SERVE_BLOCKS, formatCount } from '../../../data/facts.js';
import {
  BILLING_INTERVALS,
  FREE_PLAN_MONTHLY_CREDITS,
  FREE_SEAT_MONTHLY_CREDITS,
  PLANS,
  WELCOME_GIFT_CREDITS,
  blockPriceForInterval,
  findPlan,
} from '../../../data/plans.js';

const BASIC = findPlan('BASIC');
const PRO = findPlan('PROFESSIONAL');
const ORG = findPlan('ORGANIZATION');
const PAID = PLANS.filter((p) => p.block);

const seats = (plan) => plan.block.paidSeats + plan.block.freeSeats;
const discount = (key) => Math.round(BILLING_INTERVALS.find((i) => i.key === key).discount * 100);
const usd = (n) => `$${Number.isInteger(n) ? formatCount(n) : n.toFixed(2)}`;
const PER = { MONTH: 'a month', QUARTER: 'a quarter', YEAR: 'a year' };

export default {
  meta: {
    path: '/solutions/revops',
    section: 'solutions',
    name: 'RevOps',
    title: 'B2B Contact Data for RevOps Teams | DataPit',
    description:
      'DataPit for RevOps: seats bought in blocks, personal credit balances, a fixed credit price per action, and a team audit of spend by member.',
    updated: '2026-09-28',
    published: true,
    station: 'crystals',
  },
  hero: {
    eyebrow: 'For RevOps',
    lines: ['Prospecting spend', 'you can account for'],
    sub: 'DataPit gives RevOps a predictable way to fund prospecting data. Seats are bought in blocks, each seat earns a fixed number of credits a month, and every action has a fixed credit price. Owners and admins can see and download each teammate’s credit spend by action.',
  },
  blocks: [
    {
      type: 'callout',
      title: 'In short',
      text: 'Pick a plan and a number of seat blocks, set roles, and let each seat earn its own monthly credits. The team credit audit shows spend per teammate and per action. DataPit has no CRM sync or general API yet, so data leaves by CSV.',
    },
    { type: 'h2', text: 'How does RevOps set up and run DataPit?' },
    {
      type: 'steps',
      items: [
        {
          title: 'Size the plan',
          text: `Buy seat blocks on the plan that fits, from 1 to ${MAX_SELF_SERVE_BLOCKS} blocks online. Billing is monthly, quarterly (${discount('QUARTER')}% off) or annual (${discount('YEAR')}% off).`,
        },
        {
          title: 'Set roles',
          text: 'Workspaces have owners, admins and members. Admins invite people, one at a time or in bulk, and change roles. Only the owner assigns seats, removes members and transfers credits.',
        },
        {
          title: 'Assign seats',
          text: `Each block has paid and free seats, counted separately. The owner must hold a paid seat, and free seats earn ${formatCount(FREE_SEAT_MONTHLY_CREDITS)} credits a month on every paid plan.`,
        },
        {
          title: 'Fund each person',
          text: 'Credits are personal: every member has their own balance, granted by the seat they sit in. The owner can move credits from their balance to a member who runs low.',
        },
        {
          title: 'Audit spend',
          text: 'In Settings, under Users & teams, owners and admins see the team credit audit. It lists each teammate’s spend by action and downloads as a CSV.',
        },
        {
          title: 'Move data into your systems',
          text: `A CSV export of a search or a list costs ${CREDIT_COSTS.CSV_EXPORT} credits per file, up to 5,000 rows. Contacts your workspace hasn’t revealed stay masked in the file.`,
        },
      ],
    },
    { type: 'h2', text: 'What does each action cost in credits?' },
    {
      type: 'table',
      head: ['Action', 'Credits'],
      rows: [
        ['Search people and companies, with filters and counts', 'Free'],
        ['Reveal a contact in the web app', String(CREDIT_COSTS.REVEAL)],
        ['Reveal a contact from the Chrome extension', String(CREDIT_COSTS.EXTENSION_REVEAL)],
        ['Open a contact a teammate already revealed', 'Free'],
        ['Open a company’s full profile', `${CREDIT_COSTS.COMPANY_VIEW}, the first time your workspace opens it`],
        ['Export a search or list as a CSV, up to 5,000 rows', `${CREDIT_COSTS.CSV_EXPORT} per file`],
        ...(LIVE.sequenceSending
          ? [['Enroll a contact in a sequence', formatCount(CREDIT_COSTS.SEQUENCE_ENROLLMENT)]]
          : []),
      ],
      note: 'A reveal unlocks the contact for the whole workspace, so nobody pays for the same person twice.',
    },
    { type: 'h2', text: 'How are seats and credits priced?' },
    {
      type: 'table',
      head: ['Plan', 'Price per block', 'Seats per block', 'Credits per paid seat', 'Owner bonus'],
      rows: [
        ['Free', '$0', '1', `${formatCount(FREE_PLAN_MONTHLY_CREDITS)} a month for the one seat`, 'None'],
        ...PAID.map((p) => [
          p.name,
          `$${p.price} a month`,
          `${p.block.paidSeats} paid + ${p.block.freeSeats} free`,
          `${formatCount(p.block.paidSeatCredits)} a month`,
          p.block.ownerBonus ? `${formatCount(p.block.ownerBonus)} a month` : 'None',
        ]),
      ],
      note: `Free seats earn ${formatCount(FREE_SEAT_MONTHLY_CREDITS)} credits a month on every paid plan. Each newly covered teammate gets a one-time ${formatCount(WELCOME_GIFT_CREDITS)}-credit welcome gift.`,
    },
    { type: 'h2', text: 'How does DataPit billing work?' },
    {
      type: 'table',
      head: ['Billing', 'Discount', ...PAID.map((p) => `${p.name} block`)],
      rows: BILLING_INTERVALS.map((i) => [
        i.label,
        i.discount ? `${Math.round(i.discount * 100)}%` : 'None',
        ...PAID.map((p) => `${usd(blockPriceForInterval(p.key, i.key))} ${PER[i.key]}`),
      ]),
    },
    {
      type: 'p',
      text: 'A quarterly or annual invoice grants that many months of credits at once. Upgrades apply straight away. Moving to a lower paid plan is locked until the current billing period ends.',
    },
    { type: 'h2', text: 'What doesn’t DataPit do yet?' },
    {
      type: 'list',
      items: [
        '**No CRM sync.** There’s no HubSpot, Salesforce or Pipedrive integration, so data moves by CSV.',
        '**No automation hooks.** Nothing pushes DataPit events into your other tools.',
        '**No general API.** API keys exist only to connect the Chrome extension to a workspace.',
        '**No single sign-on.** Each member signs in with their own DataPit login.',
        '**No pipeline attribution.** DataPit records credit spend, not deals or revenue.',
        ...(LIVE.sequenceSending
          ? []
          : ['**No sequence delivery.** Sequence sending isn’t switched on, so DataPit doesn’t deliver outreach email today.']),
      ],
    },
    { type: 'h2', text: 'How does DataPit handle opt-out requests?' },
    {
      type: 'p',
      text: 'Anyone listed in DataPit can ask for their details to be removed with the opt-out form on the [Privacy page](/privacy). Records with that email address are redacted and taken out of search.',
    },
    {
      type: 'faq',
      items: [
        {
          q: 'Is there a shared credit pool?',
          a: 'No. Each member has a personal balance, granted monthly by the seat they sit in. The owner can transfer credits from their own balance to any member.',
        },
        {
          q: 'Who can see the team’s credit spend?',
          a: 'Owners and admins, on paid plans. Members see only their own credit history.',
        },
        {
          q: 'What happens when someone runs out of credits?',
          a: 'Actions that cost credits are refused until the balance covers them. The owner can transfer credits, or you can buy extra credits from Billing.',
        },
        {
          q: 'Can we connect DataPit to our CRM?',
          a: 'Not yet. Export searches and lists as CSV files and import them. Contacts nobody on the team has revealed stay masked in the file.',
        },
        {
          q: 'How many seats can we buy online?',
          a: `Up to ${MAX_SELF_SERVE_BLOCKS} blocks: ${formatCount(MAX_SELF_SERVE_BLOCKS * seats(BASIC))} seats on ${BASIC.name}, ${formatCount(MAX_SELF_SERVE_BLOCKS * seats(PRO))} on ${PRO.name} and ${formatCount(MAX_SELF_SERVE_BLOCKS * seats(ORG))} on ${ORG.name}. For more, [contact sales](/contact).`,
        },
        {
          q: 'Is our workspace kept separate from other customers?',
          a: 'Yes. Every request is scoped to the workspace you’re signed in to, so your lists, saved searches, reveals and credit history stay with your workspace.',
        },
      ],
    },
    {
      type: 'related',
      items: [
        { label: 'Sales leaders', to: '/solutions/sales-leaders', text: 'What a sales team costs, by team size.' },
        { label: 'Marketers', to: '/solutions/marketers', text: 'Account and contact lists for campaigns.' },
        { label: 'Pricing', to: '/pricing', text: 'Every plan, seat block and billing option.' },
        { label: 'People search', to: '/features/people-search', text: 'The filters your team searches with.' },
      ],
    },
  ],
};
