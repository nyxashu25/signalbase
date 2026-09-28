import { CREDIT_COSTS, EXTENSION_STORE_URL, LIVE, formatCount } from '../../../data/facts.js';
import { FREE_PLAN_MONTHLY_CREDITS, PLANS } from '../../../data/plans.js';

const BASIC_PRICE = PLANS.find((p) => p.key === 'BASIC').price;

export default {
  meta: {
    path: '/features/people-search',
    section: 'features',
    name: 'People search',
    title: 'B2B People Search and Contact Database | DataPit',
    description: `Search B2B contacts by job title, seniority, department, company, industry and location for free. Reveal a contact's work email for ${CREDIT_COSTS.REVEAL} credits.`,
    updated: '2026-09-28',
    published: true,
    station: 'lens',
  },
  hero: {
    eyebrow: 'People search',
    lines: ['Search the people', 'you sell to'],
    sub: `DataPit's people search lets you filter B2B contacts by job title, seniority, department, company, and the company's industry and location. Search results are free, with emails masked. Revealing a contact's work email costs ${CREDIT_COSTS.REVEAL} credits. Opening a company's full profile costs ${CREDIT_COSTS.COMPANY_VIEW} credits the first time your workspace views it. Save people to lists or export them to CSV.`,
  },
  blocks: [
    {
      type: 'callout',
      title: 'In short',
      text: `Filter people or companies, then reveal the contacts you want for ${CREDIT_COSTS.REVEAL} credits each. Until someone on your team reveals a contact, their email stays masked everywhere: in search, lists, company profiles and CSV exports. Searching and building lists cost nothing, but opening a company’s full profile costs ${CREDIT_COSTS.COMPANY_VIEW} credits the first time.`,
    },
    { type: 'h2', text: 'What is a B2B contact database?' },
    {
      type: 'p',
      text: 'It’s a searchable set of business contacts: names, job titles, companies and work emails. Sales and marketing teams use one to find the people who match their buyer, instead of building lists by hand.',
    },
    {
      type: 'p',
      text: 'DataPit works this way. Searching and filtering are free, and you spend credits to reveal the contacts you want in full.',
    },
    { type: 'dataCoverage' },
    { type: 'h2', text: 'What can you filter people by?' },
    {
      type: 'table',
      head: ['Filter', 'What it matches'],
      rows: [
        ['Keyword', 'A person’s full name or job title.'],
        ['Job title', 'Titles that contain the words you type, like “marketing” or “head of”.'],
        ['Company', 'Company names that contain the text you type.'],
        ['Seniority', 'One or more seniority levels.'],
        ['Department', 'One or more departments.'],
        ['Company industry', 'The industry of the company the person works for.'],
        ['Company location', 'Where the person’s company is based, not where the person lives.'],
        [
          'Email status',
          LIVE.emailVerification
            ? 'Verified, unverified, or not found. Not found means no email is on file for the contact.'
            : 'Unverified or not found. Not found means no email is on file. Verification isn’t switched on yet, so no contact is marked verified.',
        ],
      ],
      note: 'Sort results by relevance, name A to Z, name Z to A, or newest first. The counts beside each filter option update as you narrow the search.',
    },
    { type: 'h2', text: 'What can you filter companies by?' },
    {
      type: 'table',
      head: ['Filter', 'What it matches'],
      rows: [
        ['Keyword', 'The company name.'],
        ['Industry', 'One or more industries.'],
        ['Employees', 'Headcount bands: 1–10, 11–50, 51–200, 201–500, 501–1,000, 1,001–5,000 and 5,001+.'],
        ['Location', 'Where the company is based.'],
        [
          'Tech stack',
          'Technologies listed on the company record. Only companies whose record lists them can match, and imported records don’t list them yet.',
        ],
      ],
      note: 'Sort companies by relevance, name A to Z, name Z to A, largest first, or newest first.',
    },
    {
      type: 'p',
      text: 'Save a people or company search to run it again later with the same filters. Saved searches are shared with your workspace, up to 50 of each kind.',
    },
    { type: 'h2', text: 'Why are emails masked in search results?' },
    {
      type: 'p',
      text: 'So you can judge a contact before you pay for it. Every result shows the person’s name, title and company. The email is masked, like a****@n****.com, until someone in your workspace reveals it.',
    },
    {
      type: 'p',
      text: `A reveal costs ${CREDIT_COSTS.REVEAL} credits in the web app, or ${CREDIT_COSTS.EXTENSION_REVEAL} from the [Chrome extension](/chrome-extension). It unlocks the contact for your whole workspace, so nobody on your team pays for the same person twice. See [how the email finder works](/features/email-finder) for what a reveal returns.`,
    },
    { type: 'h2', text: 'How do lists work?' },
    {
      type: 'p',
      text: 'A list holds either people or companies. Add results to a list from search or from a company profile, and open it later to work through it. Lists belong to your workspace, so teammates see the same lists you do.',
    },
    {
      type: 'p',
      text: `There’s no limit on the number of lists, on any plan. Deleting a list takes an admin.${
        LIVE.sequenceSending
          ? ' On paid plans, you can enroll a people list into an email sequence.'
          : ''
      }`,
    },
    { type: 'h2', text: 'What’s in a CSV export?' },
    {
      type: 'p',
      text: `You can export a people search, a company search or a list. Each file costs a flat ${CREDIT_COSTS.CSV_EXPORT} credits, however many rows it has, up to ${formatCount(5000)} rows. You’re charged only once the file is ready.`,
    },
    {
      type: 'table',
      head: ['Export', 'Columns'],
      rows: [
        [
          'People',
          `First name, last name, title, company, department, email, phone${LIVE.phoneData ? '' : ' (empty for now)'} and an email status column.`,
        ],
        [
          'Companies',
          'Name, domain, industry, headcount range, location, tech stack and LinkedIn URL.',
        ],
      ],
      note: `**Unrevealed contacts stay masked in the file.** The email status column says Revealed, Masked or Not found for each row. Reveal the contacts you need before you export.`,
    },
    { type: 'h2', text: 'What does a company profile cost?' },
    {
      type: 'p',
      text: `Company search results are free. Opening a company’s full profile shows its details and the contacts DataPit has there, masked until revealed.`,
    },
    {
      type: 'p',
      text: `The first time anyone in your workspace opens a company’s profile, it costs ${CREDIT_COSTS.COMPANY_VIEW} credits. After that, the profile is free for everyone on your team.`,
    },
    { type: 'h2', text: 'How much does people search cost?' },
    {
      type: 'table',
      head: ['Action', 'Credits'],
      rows: [
        ['Search, filter and browse masked results', 'Free'],
        ['Save a search or build a list', 'Free'],
        ['Reveal a contact in the web app', String(CREDIT_COSTS.REVEAL)],
        ['Reveal a contact from the Chrome extension', String(CREDIT_COSTS.EXTENSION_REVEAL)],
        ['See a contact your team already revealed', 'Free'],
        ['Open a company profile for the first time', String(CREDIT_COSTS.COMPANY_VIEW)],
        ['Export a CSV file', `${CREDIT_COSTS.CSV_EXPORT} per file`],
      ],
      note: `Search, reveal, company profiles and export work on every plan. The Free plan includes ${formatCount(FREE_PLAN_MONTHLY_CREDITS)} credits a month; see [pricing](/pricing) for paid plans.`,
    },
    {
      type: 'faq',
      items: [
        {
          q: 'Is DataPit’s people search free?',
          a: `Yes. Searching, filtering, saving searches and building lists cost nothing, on every plan. Credits go on reveals (${CREDIT_COSTS.REVEAL} in the app, ${CREDIT_COSTS.EXTENSION_REVEAL} from the extension), first-time company profiles (${CREDIT_COSTS.COMPANY_VIEW}) and CSV exports (${CREDIT_COSTS.CSV_EXPORT} per file).`,
        },
        {
          q: 'Who on my team can see a contact I reveal?',
          a: 'Everyone in your workspace. One reveal unlocks the contact for the whole team, in search, lists, company profiles and exports. The credits come from the balance of the person who revealed it.',
        },
        {
          q: 'Does DataPit have intent data or lead scores?',
          a: 'No. DataPit doesn’t track buying intent, website visits or job changes, and it doesn’t score leads. The filters describe who people are and where they work.',
        },
        {
          q: 'Can I send contacts to my CRM?',
          a: 'Not directly. DataPit has no CRM integration today. Export a CSV and import it into your CRM, after revealing the contacts you need, because unrevealed emails stay masked in the file.',
        },
        {
          q: 'Can I look someone up from their LinkedIn profile?',
          a: `Yes, with the free [DataPit — LinkedIn Lookup](${EXTENSION_STORE_URL}) Chrome extension. It checks the profile you’re viewing against DataPit. If the person is in DataPit, you can reveal them for ${CREDIT_COSTS.EXTENSION_REVEAL} credits.`,
        },
        {
          q: 'How can someone be removed from DataPit?',
          a: 'Anyone can ask to be removed with the opt-out form on the [privacy page](/privacy). Records with a matching email are redacted and taken out of search.',
        },
      ],
    },
    {
      type: 'related',
      items: [
        {
          label: 'Email finder',
          to: '/features/email-finder',
          text: 'What a reveal returns, and when credits come back.',
        },
        {
          label: 'Chrome extension',
          to: '/chrome-extension',
          text: 'Look up LinkedIn profiles in DataPit.',
        },
        {
          label: 'DataPit for account executives',
          to: '/solutions/account-executives',
          text: 'How AEs use search, lists and reveals.',
        },
        {
          label: 'Pricing',
          to: '/pricing',
          text: `A free plan, and seat blocks from $${BASIC_PRICE} a month.`,
        },
      ],
    },
  ],
};
