import { CREDIT_COSTS, LIVE, formatCount } from '../../../data/facts.js';
import {
  BILLING_INTERVALS,
  FREE_PLAN_MONTHLY_CREDITS,
  FREE_SEAT_MONTHLY_CREDITS,
  WELCOME_GIFT_CREDITS,
  findPlan,
} from '../../../data/plans.js';

const BASIC = findPlan('BASIC');
const PRO = findPlan('PROFESSIONAL');
const ORG = findPlan('ORGANIZATION');

const seats = (plan) => plan.block.paidSeats + plan.block.freeSeats;
const discount = (key) => Math.round(BILLING_INTERVALS.find((i) => i.key === key).discount * 100);
const freeReveals = (cost) => formatCount(Math.floor(FREE_PLAN_MONTHLY_CREDITS / cost));
const credits = (plan) =>
  `${formatCount(plan.block.paidSeatCredits)} per paid seat, ${formatCount(FREE_SEAT_MONTHLY_CREDITS)} per free seat` +
  (plan.block.ownerBonus ? `, plus ${formatCount(plan.block.ownerBonus)} for the owner` : '');

const verifiedAnswer = LIVE.emailVerification
  ? 'Guessed addresses are. When DataPit has no address on file, it builds one from the person’s name and company domain and checks it with an email verifier. A rejected guess is refunded, and each reveal shows whether the address was verified.'
  : 'Not yet. A reveal returns the email on file, or a first.last@company-domain guess when there isn’t one, marked as unverified. Check important addresses with the [free email verifier](/tools/email-verifier) before you send.';

export default {
  meta: {
    path: '/solutions/founders',
    section: 'solutions',
    name: 'Founders',
    title: 'B2B Contact Data for Founder-Led Sales | DataPit',
    description: `DataPit is free for one user with ${formatCount(FREE_PLAN_MONTHLY_CREDITS)} credits a month. Search B2B contacts, reveal work emails for ${CREDIT_COSTS.REVEAL} credits and add seats from $${BASIC.price} a month.`,
    updated: '2026-09-28',
    published: true,
    station: 'crystals',
  },
  hero: {
    eyebrow: 'For founders',
    lines: ['Founder-led sales', 'from the free plan'],
    sub: `DataPit is free for one user, with ${formatCount(FREE_PLAN_MONTHLY_CREDITS)} credits a month. That’s up to ${freeReveals(CREDIT_COSTS.REVEAL)} work-email reveals in the web app if you spend credits on nothing else. Search people and companies for free, reveal the prospects you’ll contact, and move to a paid plan when you hire your first rep.`,
  },
  blocks: [
    {
      type: 'callout',
      title: 'In short',
      text: `Sign up for free, describe your first customers as search filters, and reveal the people you’ll contact for ${CREDIT_COSTS.REVEAL} credits each. Add the Chrome extension for LinkedIn research. When you hire, a ${BASIC.name} block costs $${BASIC.price} a month and covers up to ${seats(BASIC)} people.`,
    },
    { type: 'h2', text: 'How does a founder use DataPit?' },
    {
      type: 'steps',
      items: [
        {
          title: 'Create a free workspace',
          text: `[Sign up](/login?mode=register) for the Free plan: one seat with ${formatCount(FREE_PLAN_MONTHLY_CREDITS)} credits a month.`,
        },
        {
          title: 'Turn your first customers into filters',
          text: 'Combine job title, seniority and department with the company’s industry and location. Company search adds headcount ranges.',
        },
        {
          title: 'Check who’s there before you spend',
          text: 'Searching is free and shows names, titles and companies, with contact details masked. You see what DataPit holds for your market before you spend a credit.',
        },
        {
          title: 'Reveal the first prospects',
          text: `Each reveal costs ${CREDIT_COSTS.REVEAL} credits and shows the work email. Save the search and keep the people you reveal in a list.`,
        },
        {
          title: 'Research on LinkedIn',
          text: `The [Chrome extension](/chrome-extension) checks the profile you’re viewing against DataPit. Revealing from there costs ${CREDIT_COSTS.EXTENSION_REVEAL} credits.`,
        },
        {
          title: 'Add seats when you hire',
          text:
            `Invites, roles and the team credit audit start on ${BASIC.name}. A contact anyone on the team has revealed is free for everyone.` +
            (LIVE.sequenceSending ? ' Paid plans also add email sequences.' : ''),
        },
      ],
    },
    { type: 'h2', text: 'What does DataPit cost for a founder?' },
    {
      type: 'table',
      head: ['Stage', 'Plan', 'Price', 'Credits a month'],
      rows: [
        ['Just you', 'Free', '$0', formatCount(FREE_PLAN_MONTHLY_CREDITS)],
        [`You and up to ${seats(BASIC) - 1} others`, `${BASIC.name}, 1 block`, `$${BASIC.price} a month`, credits(BASIC)],
        [`Up to ${seats(PRO)} people`, `${PRO.name}, 1 block`, `$${PRO.price} a month`, credits(PRO)],
        [`Up to ${seats(ORG)} people`, `${ORG.name}, 1 block`, `$${ORG.price} a month`, credits(ORG)],
      ],
      note: `Quarterly billing saves ${discount('QUARTER')}% and annual billing ${discount('YEAR')}%. Each newly covered teammate gets a one-time ${formatCount(WELCOME_GIFT_CREDITS)}-credit welcome gift. See [pricing](/pricing) for every plan.`,
    },
    { type: 'h2', text: 'When should a founder upgrade?' },
    {
      type: 'p',
      text:
        (LIVE.sequenceSending
          ? 'Upgrade when you add a teammate or want to send email sequences. '
          : 'Upgrade when you add a teammate. ') +
        'The Free plan is a single seat, and invites and roles need a paid plan. If you still work alone and run low, buy extra credits from Billing instead.',
    },
    { type: 'h2', text: 'Will DataPit have my prospects?' },
    {
      type: 'p',
      text: 'Check before you spend. Search is free, so run your filters and see who comes back.',
    },
    { type: 'dataCoverage' },
    {
      type: 'p',
      text: 'If someone you find on LinkedIn isn’t in DataPit, the Chrome extension adds them to a sourcing queue. The DataPit team works through that queue to add missing people.',
    },
    {
      type: 'faq',
      items: [
        {
          q: 'What do I get on the Free plan?',
          a: `One seat with ${formatCount(FREE_PLAN_MONTHLY_CREDITS)} credits a month, plus people and company search, reveals, lists, CSV export and the Chrome extension. Team features need a paid plan.`,
        },
        {
          q: 'How many prospects can I reveal a month for free?',
          a: `Up to ${freeReveals(CREDIT_COSTS.REVEAL)} in the web app, or ${freeReveals(CREDIT_COSTS.EXTENSION_REVEAL)} from the Chrome extension, if you spend credits on nothing else. Opening a company’s full profile costs ${CREDIT_COSTS.COMPANY_VIEW} credits the first time.`,
        },
        {
          q: 'Can I send cold email from DataPit?',
          a: LIVE.sequenceSending
            ? `Yes, on paid plans. Sequences combine plain-text email steps with wait steps, at ${formatCount(CREDIT_COSTS.SEQUENCE_ENROLLMENT)} credits per contact enrolled. Our [cold email templates](/blog/cold-email-templates) help with the first draft.`
            : `Not yet. Export your revealed contacts as a CSV for ${CREDIT_COSTS.CSV_EXPORT} credits per file and send from your own email tool. Our [cold email templates](/blog/cold-email-templates) help with the first draft.`,
        },
        {
          q: 'Does DataPit work with my CRM?',
          a: 'Not directly yet: there are no CRM integrations. Export a CSV and import it into your CRM or a spreadsheet.',
        },
        { q: 'Are revealed emails verified?', a: verifiedAnswer },
      ],
    },
    {
      type: 'related',
      items: [
        { label: 'Sales leaders', to: '/solutions/sales-leaders', text: 'What DataPit costs once you have a team.' },
        { label: 'Marketers', to: '/solutions/marketers', text: 'Account and contact lists for campaigns.' },
        { label: 'Chrome extension', to: '/chrome-extension', text: 'Look up LinkedIn profiles against DataPit.' },
        {
          label: 'How to find someone’s email address',
          to: '/blog/how-to-find-someones-email-address',
          text: 'A step-by-step guide for B2B contacts.',
        },
        { label: 'Cold email templates', to: '/blog/cold-email-templates', text: 'First emails you can adapt.' },
        { label: 'Pricing', to: '/pricing', text: 'The free plan and every paid plan.' },
      ],
    },
  ],
};
