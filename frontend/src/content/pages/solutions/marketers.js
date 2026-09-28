import { CREDIT_COSTS, LIVE, formatCount } from '../../../data/facts.js';
import { FREE_PLAN_MONTHLY_CREDITS, findPlan } from '../../../data/plans.js';

const BASIC = findPlan('BASIC');
const PRO = findPlan('PROFESSIONAL');
const ORG = findPlan('ORGANIZATION');
const revealCost = (n) => formatCount(n * CREDIT_COSTS.REVEAL);

const verifiedAnswer = LIVE.emailVerification
  ? 'Guessed addresses are. When DataPit has no address on file, it builds one from the person’s name and company domain and checks it with an email verifier. A rejected guess is refunded, and each reveal shows whether the address was verified.'
  : 'Not yet. A reveal returns the email on file, or a first.last@company-domain guess when there isn’t one, marked as unverified. Check addresses with the [free email verifier](/tools/email-verifier) before a send.';

export default {
  meta: {
    path: '/solutions/marketers',
    section: 'solutions',
    name: 'Marketers',
    title: 'B2B Contact and Company Data for Marketers | DataPit',
    description: `Build B2B account and contact lists by industry, company size, location, seniority and department. Search for free and export a CSV for ${CREDIT_COSTS.CSV_EXPORT} credits.`,
    updated: '2026-09-28',
    published: true,
    station: 'crystals',
  },
  hero: {
    eyebrow: 'For marketers',
    lines: ['Account lists', 'for B2B campaigns'],
    sub: `DataPit lets B2B marketers build account and contact lists by industry, company size, location, seniority and department. Searching and filtering are free. Export a list as a CSV for ${CREDIT_COSTS.CSV_EXPORT} credits per file, and reveal the work emails you need for ${CREDIT_COSTS.REVEAL} credits each.`,
  },
  blocks: [
    {
      type: 'callout',
      title: 'In short',
      text: 'Filter companies by industry, headcount and location to build an account list, then find the people there by seniority and department. Searching is free. Emails in an export stay masked until your workspace reveals them, so reveal before you export contacts.',
    },
    { type: 'h2', text: 'How do marketers build a list in DataPit?' },
    {
      type: 'steps',
      items: [
        {
          title: 'Define the accounts',
          text: 'In company search, filter by industry, number of employees and location. Searching is free, and the counts next to each filter update as you narrow the search.',
        },
        {
          title: 'Save the search and keep a list',
          text: 'Save the filters as a saved search, and add the companies you want to a company list.',
        },
        {
          title: 'Export the account list',
          text: `A company CSV costs ${CREDIT_COSTS.CSV_EXPORT} credits per file, up to 5,000 rows. It includes each company’s name, domain, industry, headcount range, location and LinkedIn URL.`,
        },
        {
          title: 'Find the people at those accounts',
          text: 'In people search, filter by seniority, department and job title, plus the company’s industry and location. Contact details stay masked until revealed.',
        },
        {
          title: 'Reveal the contacts you’ll use',
          text: `Each reveal costs ${CREDIT_COSTS.REVEAL} credits and unlocks the contact for your whole workspace. A people CSV includes emails only for contacts your workspace has revealed.`,
        },
        {
          title: 'Check addresses before a send',
          text: 'Run important addresses through the [free email verifier](/tools/email-verifier). It checks the format, the domain and its mail server.',
        },
      ],
    },
    { type: 'h2', text: 'Which filters can marketers use in DataPit?' },
    {
      type: 'table',
      head: ['Filter', 'Company search', 'People search'],
      rows: [
        ['Industry', 'Yes', 'Yes, by the person’s company'],
        ['Location', 'Yes', 'Yes, by the person’s company'],
        ['Number of employees', 'Yes, in ranges from 1–10 to 5,001+', 'No'],
        ['Company name', 'Yes', 'Yes'],
        ['Seniority', 'No', 'Yes'],
        ['Department', 'No', 'Yes'],
        ['Job title', 'No', 'Yes'],
      ],
      note: 'People search filters industry and location by the person’s company, not by where the person lives. See [people search](/features/people-search) for every filter.',
    },
    { type: 'h2', text: 'Can I size a market with DataPit?' },
    {
      type: 'p',
      text: 'You can size what DataPit holds. The counts next to each filter show how many records match your current selection. They describe DataPit’s database, not the whole market.',
    },
    { type: 'dataCoverage' },
    { type: 'h2', text: 'What does a campaign list cost in credits?' },
    {
      type: 'table',
      head: ['Step', 'Credits'],
      rows: [
        ['Search companies and people', 'Free'],
        ['Export an account list of up to 5,000 companies', String(CREDIT_COSTS.CSV_EXPORT)],
        ['Reveal 100 contacts', revealCost(100)],
        ['Reveal 500 contacts', revealCost(500)],
        ['Export the revealed contacts', String(CREDIT_COSTS.CSV_EXPORT)],
        ['Open a company’s full profile', `${CREDIT_COSTS.COMPANY_VIEW}, first view only`],
      ],
      note: `The Free plan includes ${formatCount(FREE_PLAN_MONTHLY_CREDITS)} credits a month. A paid seat earns ${formatCount(BASIC.block.paidSeatCredits)} on ${BASIC.name}, or ${formatCount(PRO.block.paidSeatCredits)} on ${PRO.name} and ${ORG.name}. See [pricing](/pricing).`,
    },
    { type: 'h2', text: 'What doesn’t DataPit do for marketing yet?' },
    {
      type: 'list',
      items: [
        '**No intent data.** There are no buying signals, lead scores, or funding and job-change alerts.',
        '**No marketing tool sync.** There’s no HubSpot or Salesforce connection, so lists move by CSV.',
        '**No ad-platform audiences.** DataPit doesn’t push lists to ad platforms. Upload the CSV yourself.',
      ],
    },
    {
      type: 'faq',
      items: [
        {
          q: 'Does DataPit have intent data?',
          a: 'No. DataPit has company and people filters, but no intent data, buying signals or lead scores.',
        },
        {
          q: 'Can I export emails in bulk?',
          a: `A CSV costs ${CREDIT_COSTS.CSV_EXPORT} credits per file, up to 5,000 rows. It includes emails only for contacts your workspace has revealed, at ${CREDIT_COSTS.REVEAL} credits each. The rest stay masked.`,
        },
        {
          q: 'Is company search free?',
          a: `Yes. Searching and filtering companies costs nothing. Opening a company’s full profile costs ${CREDIT_COSTS.COMPANY_VIEW} credits the first time your workspace views it.`,
        },
        {
          q: 'Does DataPit connect to HubSpot?',
          a: 'Not yet. Export a CSV and import it into HubSpot or any other tool.',
        },
        { q: 'Are revealed emails verified?', a: verifiedAnswer },
      ],
    },
    {
      type: 'related',
      items: [
        { label: 'Founders', to: '/solutions/founders', text: 'Prospecting on the free plan.' },
        { label: 'RevOps', to: '/solutions/revops', text: 'Seats, credit prices and the team audit.' },
        { label: 'People search', to: '/features/people-search', text: 'Every filter, and what each one matches.' },
        { label: 'Free email verifier', to: '/tools/email-verifier', text: 'Check an address before you send.' },
        {
          label: 'How to verify an email address',
          to: '/blog/how-to-verify-an-email-address',
          text: 'What each check tells you, and what it can’t.',
        },
        { label: 'Pricing', to: '/pricing', text: `Seat blocks from $${BASIC.price} a month, and a free plan.` },
      ],
    },
  ],
};
