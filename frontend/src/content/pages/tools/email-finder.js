import { FREE_PLAN_MONTHLY_CREDITS } from '../../../data/plans.js';
import { CREDIT_COSTS, formatCount } from '../../../data/facts.js';

// Mirrors POST /api/v1/public/tools/find-email (backend/src/routes/publicTools.js):
// its rate limit, and the addresses a domain needs before its pattern is used.
const SEARCHES_PER_DAY = 10;
const MIN_PATTERN_CONTACTS = 5;

// Unpublished until the full contact import is live: the finder is only as
// useful as the database behind it.
export default {
  meta: {
    path: '/tools/email-finder',
    section: 'tools',
    name: 'Free email finder',
    title: 'Free Email Finder by Name and Company | DataPit',
    description:
      'Enter a name and a company domain. The free email finder searches DataPit’s database and, when it knows the company’s pattern, suggests the likely address.',
    updated: '2026-09-28',
    published: false,
    station: 'lens',
  },
  tool: 'email-finder',
  hero: {
    eyebrow: 'Free tool',
    lines: ['Free email', 'finder'],
    sub: 'Enter a person’s name and their company’s domain. The finder searches DataPit’s contact database and shows a masked match if we have them. If not, and we know the company’s email pattern, it suggests the likely address as an unverified guess. It’s free, with no sign-up.',
  },
  blocks: [
    {
      type: 'callout',
      title: 'In short',
      text: `A match shows a masked address, like j***.d**@acme.com. [Sign up free](/login?mode=register) to reveal the full address for ${CREDIT_COSTS.REVEAL} credits. A suggestion is only a guess from the company’s usual format, so check it before you send.`,
    },
    { type: 'h2', text: 'What does the email finder search?' },
    {
      type: 'p',
      text: 'DataPit’s own database of B2B contacts. It looks for a person with that first and last name at that domain. It doesn’t search the web, LinkedIn or anyone’s inbox.',
    },
    { type: 'dataCoverage' },
    {
      type: 'p',
      text: 'People who asked to be removed from DataPit never appear in the results.',
    },
    { type: 'h2', text: 'What do the results mean?' },
    {
      type: 'table',
      head: ['Result', 'What it means', 'What to do'],
      rows: [
        [
          'Masked email',
          'The person is in DataPit with a work email on file.',
          `Sign up free and reveal it for ${CREDIT_COSTS.REVEAL} credits.`,
        ],
        [
          'Unverified guess',
          'We don’t have the person’s address, but we know the company’s most common pattern. The finder applies it to the name.',
          'Check the guess with the [free email verifier](/tools/email-verifier) before you send.',
        ],
        [
          'Not in DataPit yet',
          `We don’t have the person, and we have fewer than ${MIN_PATTERN_CONTACTS} addresses at the domain.`,
          'Try the company’s main domain, or another spelling of the name.',
        ],
      ],
    },
    { type: 'h2', text: 'How is the likely address worked out?' },
    {
      type: 'p',
      text: `We compare the work addresses DataPit has at the domain with the names they belong to. The most common pattern, like first.last or flast, is applied to the name you entered. We only suggest an address when the domain has at least ${MIN_PATTERN_CONTACTS} addresses in DataPit.`,
    },
    {
      type: 'p',
      text: 'A pattern is a good starting point, not proof. Shared names, nicknames and older addresses often break it. See [company email formats](/email-format) for the full breakdown by company.',
    },
    {
      type: 'faq',
      items: [
        {
          q: 'Is the email finder free?',
          a: `Yes. You can run ${SEARCHES_PER_DAY} searches a day for free, with no account. Revealing a full address needs a free DataPit account and costs ${CREDIT_COSTS.REVEAL} credits. The Free plan includes ${formatCount(FREE_PLAN_MONTHLY_CREDITS)} credits a month.`,
        },
        {
          q: 'Why is the email address masked?',
          a: 'Full contact details are for signed-in DataPit users. The mask shows that we have the address without handing it to anyone who asks. [Sign up free](/login?mode=register) to reveal it.',
        },
        {
          q: 'Is the suggested address correct?',
          a: 'Not always. It’s the company’s most common pattern applied to the name, and nobody has checked it. Run it through the [email verifier](/tools/email-verifier), and keep in mind that no free check can confirm a mailbox exists.',
        },
        {
          q: 'How many searches can I run?',
          a: `${SEARCHES_PER_DAY} a day from one connection. After that, the tool tells you how long to wait before the next search.`,
        },
      ],
    },
    {
      type: 'related',
      items: [
        {
          label: 'Free email verifier',
          to: '/tools/email-verifier',
          text: 'Check an address before you send.',
        },
        {
          label: 'Email finder in DataPit',
          to: '/features/email-finder',
          text: 'Search by company and role, then reveal.',
        },
        {
          label: 'Chrome extension',
          to: '/chrome-extension',
          text: 'Look up LinkedIn profiles in DataPit.',
        },
        {
          label: 'Pricing',
          to: '/pricing',
          text: 'A free plan, and seat blocks from $29 a month.',
        },
      ],
    },
  ],
};
