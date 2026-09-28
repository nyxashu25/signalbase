import { CREDIT_COSTS, LIVE, formatCount } from '../../../data/facts.js';
import { FREE_PLAN_MONTHLY_CREDITS, FREE_SEAT_MONTHLY_CREDITS, findPlan } from '../../../data/plans.js';

const BASIC = findPlan('BASIC');
const PRO = findPlan('PROFESSIONAL');
const ORG = findPlan('ORGANIZATION');

// What one seat's monthly credits cover if they go only on in-app reveals.
const reveals = (credits) => formatCount(Math.floor(credits / CREDIT_COSTS.REVEAL));
const seatRow = (label, credits) => [label, formatCount(credits), reveals(credits)];

const verifiedAnswer = LIVE.emailVerification
  ? 'Guessed addresses are. When DataPit has no address on file, it builds one from the person’s name and company domain and checks it with an email verifier. A rejected guess is refunded, and each reveal shows whether the address was verified.'
  : 'Not yet. A reveal returns the email on file, or a first.last@company-domain guess when there isn’t one, marked as unverified. Check important addresses with the [free email verifier](/tools/email-verifier) before you send.';

export default {
  meta: {
    path: '/solutions/account-executives',
    section: 'solutions',
    name: 'Account executives',
    title: 'Prospecting Tool for Account Executives | DataPit',
    description: `Find the right people at a target account. Search contacts by title, seniority and department for free, then reveal a work email for ${CREDIT_COSTS.REVEAL} credits.`,
    updated: '2026-09-28',
    published: true,
    station: 'crystals',
  },
  hero: {
    eyebrow: 'For account executives',
    lines: ['Find the people', 'behind the account'],
    sub: `DataPit helps account executives find the right people at a target account. Search its contacts by title, seniority and department for free, then reveal work emails for the ones worth a conversation. Each reveal costs ${CREDIT_COSTS.REVEAL} credits in the web app, or ${CREDIT_COSTS.EXTENSION_REVEAL} from a LinkedIn profile with the Chrome extension.`,
  },
  blocks: [
    {
      type: 'callout',
      title: 'In short',
      text: 'Filter people by **Company name contains**, then by seniority and department, to see who DataPit holds at an account. Searching is free and contact details stay masked. Reveal only the people you’ll contact, and keep them in a list for the account.',
    },
    { type: 'h2', text: 'How does an account executive use DataPit?' },
    {
      type: 'steps',
      items: [
        {
          title: 'Start from the account',
          text: `Search for the company, or filter people by **Company name contains**. Opening a company’s full profile costs ${CREDIT_COSTS.COMPANY_VIEW} credits the first time your workspace views it, and it’s free after that.`,
        },
        {
          title: 'Map the buying group',
          text: 'Narrow the results by seniority, department and job title to find the decision makers and the people around them. Searching costs nothing.',
        },
        {
          title: 'Reveal the people you’ll contact',
          text: `Each reveal costs ${CREDIT_COSTS.REVEAL} credits and shows the contact’s work email. If a teammate already revealed someone, you see them for free.`,
        },
        {
          title: 'Research on LinkedIn',
          text: `On a LinkedIn profile, the [Chrome extension](/chrome-extension) shows whether the person is in DataPit. Revealing them there costs ${CREDIT_COSTS.EXTENSION_REVEAL} credits.`,
        },
        {
          title: 'Keep a list per account',
          text: 'Add people and companies to lists, and save the searches you run often. Lists are available on every plan.',
        },
        {
          title: 'Hand off to your CRM',
          text: `Export a list as a CSV for ${CREDIT_COSTS.CSV_EXPORT} credits per file and import it into your CRM. Contacts your workspace hasn’t revealed stay masked in the file.`,
        },
      ],
    },
    { type: 'h2', text: 'Which DataPit features matter most to an account executive?' },
    {
      type: 'list',
      items: [
        '**People search by company.** Filter by company name, then by seniority, department and job title. See [people search](/features/people-search).',
        '**Company profiles.** The company’s industry, headcount range and location, with its contacts listed and masked until revealed.',
        '**Shared reveals.** One reveal unlocks a contact for your whole workspace, so nobody on the team pays for the same person twice.',
        '**The Chrome extension.** Check a LinkedIn profile against DataPit without leaving the page.',
        '**Lists and saved searches.** One list per account keeps your research in one place.',
      ],
    },
    { type: 'h2', text: 'Is my target account in DataPit?' },
    {
      type: 'p',
      text: 'Search is free, so check before you spend a credit. Run your filters and see who comes back: names, titles and companies are shown, and contact details are masked.',
    },
    { type: 'dataCoverage' },
    {
      type: 'p',
      text: 'If someone you find on LinkedIn isn’t in DataPit, the Chrome extension adds their profile to a sourcing queue. The DataPit team works through that queue to add missing people.',
    },
    { type: 'h2', text: 'What does DataPit cost for an account executive?' },
    {
      type: 'p',
      text: 'Credits come with your seat each month. This is what one seat’s monthly credits cover if you spend them only on reveals in the web app.',
    },
    {
      type: 'table',
      head: ['Seat', 'Credits a month', 'In-app reveals'],
      rows: [
        seatRow('Free plan', FREE_PLAN_MONTHLY_CREDITS),
        seatRow(`${BASIC.name} paid seat`, BASIC.block.paidSeatCredits),
        seatRow(`${PRO.name} or ${ORG.name} paid seat`, PRO.block.paidSeatCredits),
        seatRow('Free seat on a paid plan', FREE_SEAT_MONTHLY_CREDITS),
      ],
      note: `Company profiles (${CREDIT_COSTS.COMPANY_VIEW} credits on first view) and CSV exports (${CREDIT_COSTS.CSV_EXPORT} per file) come out of the same balance. See [pricing](/pricing) for seat prices.`,
    },
    {
      type: 'faq',
      items: [
        {
          q: 'Can I see everyone who works at a company?',
          a: 'You see everyone DataPit holds for that company, which isn’t necessarily everyone who works there. Filter by seniority and department to get to the right people quickly.',
        },
        {
          q: 'Do reveals include phone numbers?',
          a: LIVE.phoneData
            ? 'Yes, where the record has one. A single reveal unlocks the work email and any phone number on file.'
            : 'DataPit is built around work email today. A reveal includes a phone number only when the record has one, so don’t plan on phone data yet.',
        },
        {
          q: 'Can I push contacts into Salesforce or HubSpot?',
          a: 'Not directly: DataPit has no CRM integrations yet. Export a list or a search as a CSV and import it.',
        },
        {
          q: 'Is revealing from the extension different from the web app?',
          a: `It unlocks the same contact for your workspace. It costs ${CREDIT_COSTS.EXTENSION_REVEAL} credits instead of ${CREDIT_COSTS.REVEAL}, and it’s free if anyone on your team already revealed the person.`,
        },
        { q: 'Are revealed emails verified?', a: verifiedAnswer },
      ],
    },
    {
      type: 'related',
      items: [
        { label: 'Sales leaders', to: '/solutions/sales-leaders', text: 'Seats, shared reveals and the team credit audit.' },
        ...(LIVE.sequenceSending
          ? [{ label: 'SDRs', to: '/solutions/sdrs', text: 'Build a list, reveal it and work it in a sequence.' }]
          : []),
        { label: 'Chrome extension', to: '/chrome-extension', text: 'Look up LinkedIn profiles against DataPit.' },
        { label: 'People search', to: '/features/people-search', text: 'Every filter, and what each one matches.' },
        {
          label: 'How to find someone’s email address',
          to: '/blog/how-to-find-someones-email-address',
          text: 'A step-by-step guide for B2B contacts.',
        },
        { label: 'Pricing', to: '/pricing', text: `Seat blocks from $${BASIC.price} a month, and a free plan.` },
      ],
    },
  ],
};
