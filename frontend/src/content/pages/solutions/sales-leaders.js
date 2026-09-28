import { CREDIT_COSTS, LIVE, MAX_SELF_SERVE_BLOCKS, formatCount } from '../../../data/facts.js';
import {
  BILLING_INTERVALS,
  FREE_SEAT_MONTHLY_CREDITS,
  WELCOME_GIFT_CREDITS,
  findPlan,
} from '../../../data/plans.js';

const BASIC = findPlan('BASIC');
const PRO = findPlan('PROFESSIONAL');
const ORG = findPlan('ORGANIZATION');
const PAID = [BASIC, PRO, ORG];

// A block's seats: the owner takes a paid seat, anyone else can take either kind.
const seats = (plan) => plan.block.paidSeats + plan.block.freeSeats;
const blocksFor = (plan, people) => Math.ceil(people / seats(plan));
const teamCell = (plan, people) => {
  const blocks = blocksFor(plan, people);
  return `$${formatCount(blocks * plan.price)} (${blocks} ${blocks === 1 ? 'block' : 'blocks'})`;
};
const discount = (key) => Math.round(BILLING_INTERVALS.find((i) => i.key === key).discount * 100);

const verifiedAnswer = LIVE.emailVerification
  ? 'Guessed addresses are. When DataPit has no address on file, it builds one from the person’s name and company domain and checks it with an email verifier. A rejected guess is refunded, and each reveal shows whether the address was verified.'
  : 'Not yet. A reveal returns the email on file, or a first.last@company-domain guess when there isn’t one, marked as unverified. Check important addresses with the [free email verifier](/tools/email-verifier) before you send.';

export default {
  meta: {
    path: '/solutions/sales-leaders',
    section: 'solutions',
    name: 'Sales leaders',
    title: 'Prospecting Tool for Sales Leaders and Teams | DataPit',
    description: `One DataPit workspace for your sales team: shared reveals, seat blocks from $${BASIC.price} a month and a team audit of each rep’s credit spend.`,
    updated: '2026-09-28',
    published: true,
    station: 'crystals',
  },
  hero: {
    eyebrow: 'For sales leaders',
    lines: ['Prospecting data', 'your team shares'],
    sub: `DataPit gives a sales team one workspace to search B2B contacts and reveal work emails. A contact one rep reveals is free for the rest of the team, and owners and admins see each rep’s credit spend by action. Seat blocks start at $${BASIC.price} a month for up to ${seats(BASIC)} people.`,
  },
  blocks: [
    {
      type: 'callout',
      title: 'In short',
      text: `Put your reps in one workspace and give each a seat. They search for free, reveal the contacts they’ll work for ${CREDIT_COSTS.REVEAL} credits each, and never pay twice for the same person. The team credit audit shows who spent what, and on which action.`,
    },
    { type: 'h2', text: 'How does a sales team use DataPit day to day?' },
    {
      type: 'steps',
      items: [
        {
          title: 'Set up the workspace',
          text: 'Choose a plan and a number of seat blocks, then invite reps one at a time or in bulk. As the owner, you place each person in a paid or a free seat.',
        },
        {
          title: 'Reps search for free',
          text: 'Each rep filters people by job title, seniority and department, and by the company’s industry and location. Contact details stay masked, and searching costs nothing.',
        },
        {
          title: 'Reps reveal the contacts they’ll work',
          text: `A reveal costs ${CREDIT_COSTS.REVEAL} credits in the app and shows the contact’s work email. Once anyone on the team reveals a contact, it’s free for the whole workspace.`,
        },
        {
          title: 'Research stays close to LinkedIn',
          text: `With the [Chrome extension](/chrome-extension), a rep checks the LinkedIn profile they’re viewing against DataPit. Revealing the contact there costs ${CREDIT_COSTS.EXTENSION_REVEAL} credits.`,
        },
        {
          title: 'Lists keep accounts organized',
          text: 'Reps save the searches they run often and add people or companies to lists. A saved search replays the same filters next time.',
        },
        {
          title: 'You review the spend',
          text: 'Owners and admins open the team credit audit in Settings, under Users & teams. It shows each teammate’s spend by action and downloads as a CSV.',
        },
        {
          title: 'You move credits where they’re needed',
          text: 'Each member has their own credit balance, earned by the seat they sit in. When a rep runs low, the owner can transfer credits to them from the owner’s balance.',
        },
      ],
    },
    { type: 'h2', text: 'Can a sales leader see what each rep spends?' },
    {
      type: 'p',
      text: 'Yes, on paid plans. Each member sees their own credit history, and owners and admins also see the team credit audit. It splits every teammate’s spend by action and downloads as a CSV.',
    },
    {
      type: 'p',
      text: 'DataPit reports what your team spends, not what it closes. There’s no pipeline reporting and no CRM sync, so deal results stay in your CRM.',
    },
    { type: 'h2', text: 'Which DataPit features matter most to a sales team?' },
    {
      type: 'list',
      items: [
        '**Shared reveals.** One reveal unlocks a contact for the whole workspace, so two reps never pay for the same person.',
        '**Seats and roles.** Admins invite people, one at a time or in bulk, and change roles. Only the owner assigns seats and removes members.',
        `**Credits per seat.** Paid seats earn ${formatCount(BASIC.block.paidSeatCredits)} credits a month on ${BASIC.name} and ${formatCount(PRO.block.paidSeatCredits)} on ${PRO.name} and ${ORG.name}. Free seats earn ${formatCount(FREE_SEAT_MONTHLY_CREDITS)} on every paid plan.`,
        '**Team credit audit.** Spend per teammate and per action, for owners and admins.',
        '**People search.** Filters for job title, seniority, department and company, free to run. See [people search](/features/people-search).',
        `**The Chrome extension.** Look up the LinkedIn profile you’re on and reveal the contact for ${CREDIT_COSTS.EXTENSION_REVEAL} credits.`,
        ...(LIVE.sequenceSending
          ? ['**Sequences.** Email and wait steps on every paid plan, so reps can follow up from the same workspace.']
          : []),
      ],
    },
    { type: 'h2', text: 'What does DataPit cost for a sales team?' },
    {
      type: 'p',
      text: `Paid plans are sold in blocks of seats, and each block includes some free seats. A ${BASIC.name} block has ${seats(BASIC)} seats, ${PRO.name} has ${seats(PRO)} and ${ORG.name} has ${seats(ORG)}. The owner needs a paid seat, and anyone else can take a free one.`,
    },
    {
      type: 'table',
      caption: 'Monthly price by team size',
      head: ['Team size', ...PAID.map((p) => p.name)],
      rows: [5, 10, 25].map((people) => [`${people} people`, ...PAID.map((p) => teamCell(p, people))]),
      note: `Monthly billing. Quarterly billing saves ${discount('QUARTER')}% and annual billing ${discount('YEAR')}%. Self-serve checkout goes up to ${MAX_SELF_SERVE_BLOCKS} blocks; for more, [contact sales](/contact).`,
    },
    {
      type: 'p',
      text: `Every newly covered teammate gets a one-time ${formatCount(WELCOME_GIFT_CREDITS)}-credit welcome gift. ${PRO.name} adds a monthly owner bonus of ${formatCount(PRO.block.ownerBonus)} credits, and ${ORG.name} adds ${formatCount(ORG.block.ownerBonus)}. See [pricing](/pricing) for every plan.`,
    },
    { type: 'h2', text: 'What costs credits?' },
    {
      type: 'table',
      head: ['Action', 'Credits'],
      rows: [
        ['Search people and companies', 'Free'],
        ['Reveal a contact in the web app', String(CREDIT_COSTS.REVEAL)],
        ['Reveal a contact from the Chrome extension', String(CREDIT_COSTS.EXTENSION_REVEAL)],
        ['Open a contact a teammate already revealed', 'Free'],
        ['Open a company’s full profile', `${CREDIT_COSTS.COMPANY_VIEW}, the first time your workspace opens it`],
        ['Export a search or list as a CSV, up to 5,000 rows', `${CREDIT_COSTS.CSV_EXPORT} per file`],
        ...(LIVE.sequenceSending
          ? [['Enroll a contact in a sequence', String(CREDIT_COSTS.SEQUENCE_ENROLLMENT)]]
          : []),
      ],
    },
    {
      type: 'faq',
      items: [
        {
          q: 'Do reps share one pool of credits?',
          a: 'No. Each member has a personal balance, earned by the seat they sit in. The owner can transfer credits to any member who needs more.',
        },
        {
          q: 'If two reps reveal the same contact, do we pay twice?',
          a: 'No. The first reveal unlocks the contact for the whole workspace. Anyone else on the team sees it for free.',
        },
        {
          q: 'Does DataPit sync with Salesforce or HubSpot?',
          a: `Not yet: there are no CRM integrations today. Reps can export a search or a list as a CSV for ${CREDIT_COSTS.CSV_EXPORT} credits per file and import it. Contacts nobody on the team has revealed stay masked in the file.`,
        },
        {
          q: 'Can DataPit show which deals it sourced?',
          a: 'No. DataPit records credit spend per teammate, not pipeline or revenue. Track outcomes in your CRM.',
        },
        { q: 'Are revealed emails verified?', a: verifiedAnswer },
        {
          q: 'How large a team can buy online?',
          a: `Self-serve checkout goes up to ${MAX_SELF_SERVE_BLOCKS} blocks, which is ${formatCount(MAX_SELF_SERVE_BLOCKS * seats(ORG))} seats on ${ORG.name}. Larger teams can [contact sales](/contact).`,
        },
      ],
    },
    {
      type: 'related',
      items: [
        { label: 'RevOps', to: '/solutions/revops', text: 'Seats, roles, credit prices and the team audit in detail.' },
        { label: 'Account executives', to: '/solutions/account-executives', text: 'How AEs find the right people at a target account.' },
        ...(LIVE.sequenceSending
          ? [{ label: 'SDRs', to: '/solutions/sdrs', text: 'Build a list, reveal it and work it in a sequence.' }]
          : []),
        { label: 'People search', to: '/features/people-search', text: 'The filters your reps search with.' },
        { label: 'Pricing', to: '/pricing', text: `Seat blocks from $${BASIC.price} a month, and a free plan.` },
      ],
    },
  ],
};
