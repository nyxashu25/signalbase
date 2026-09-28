import { CREDIT_COSTS, EXTENSION_STORE_URL, LIVE, formatCount } from '../../../data/facts.js';
import { FREE_PLAN_MONTHLY_CREDITS, PLANS } from '../../../data/plans.js';

// Phones only once imported records carry them (LIVE in facts.js; today none do).
const PHONE = LIVE.phoneData ? ' and phone number' : '';
const FREE_CREDITS = formatCount(FREE_PLAN_MONTHLY_CREDITS);
const LOWEST_PRICE = PLANS.filter((p) => p.block)[0].price;

export default {
  meta: {
    path: '/chrome-extension',
    section: 'extension',
    name: 'Chrome extension',
    title: 'LinkedIn Email Finder Chrome Extension | DataPit',
    description: `DataPit's free Chrome extension checks the LinkedIn profile you're viewing against DataPit and reveals the work email${PHONE} for ${CREDIT_COSTS.EXTENSION_REVEAL} credits.`,
    updated: '2026-09-28',
    published: true,
    station: 'reveal',
  },
  hero: {
    eyebrow: 'Chrome extension',
    lines: ['Find emails on', 'LinkedIn profiles'],
    sub: `DataPit — LinkedIn Lookup is a free Chrome extension. Open a LinkedIn profile and it checks the person against DataPit. If they're in the database, you can reveal their work email${PHONE} for ${CREDIT_COSTS.EXTENSION_REVEAL} credits. It's free if your team already revealed them.`,
    primary: { label: 'Add to Chrome', to: EXTENSION_STORE_URL },
    secondary: { label: 'Start free', to: '/login?mode=register' },
  },
  blocks: [
    {
      type: 'callout',
      title: 'In short',
      text: `Install the extension from the [Chrome Web Store](${EXTENSION_STORE_URL}), connect it with an API key from your DataPit workspace, and open any linkedin.com/in/ profile. A DataPit card shows whether the person is in the database, and one click reveals their work email${PHONE} for ${CREDIT_COSTS.EXTENSION_REVEAL} credits.`,
    },
    { type: 'h2', text: 'How does the DataPit Chrome extension work?' },
    {
      type: 'steps',
      items: [
        {
          title: 'Install it from the Chrome Web Store',
          text: `The extension is free: [add DataPit — LinkedIn Lookup to Chrome](${EXTENSION_STORE_URL}).`,
        },
        {
          title: 'Connect your workspace',
          text: 'In DataPit, go to Settings → API & Extension, create an API key and paste it into the extension popup. The key stays in the extension, never on the LinkedIn page.',
        },
        {
          title: 'Open a LinkedIn profile',
          text: 'On any linkedin.com/in/ page, a DataPit card appears at the bottom right with the result of the lookup.',
        },
        {
          title: 'Reveal the contact',
          text: `If the person is in DataPit, reveal their work email${PHONE} for ${CREDIT_COSTS.EXTENSION_REVEAL} credits. Contacts anyone on your team has already revealed are free.`,
        },
      ],
    },
    { type: 'h2', text: 'What happens when someone isn’t in DataPit?' },
    {
      type: 'p',
      text: 'DataPit queues the profile for its team, who can find the person and add them to the database. If the person is found but LinkedIn shows a different job title, the change is queued for the team to review. The [extension privacy notice](/chrome-extension/privacy) lists what DataPit keeps from each lookup.',
    },
    { type: 'h2', text: 'What does the extension send to DataPit?' },
    {
      type: 'p',
      text: 'Five fields from each profile you open: the person’s name, the profile URL, their job title, their current company and their location. It sends no other page text and no browsing history. Chrome loads its script on linkedin.com pages, but it only acts on linkedin.com/in/ profiles. It sends data only to DataPit.',
    },
    { type: 'h2', text: 'How much does it cost?' },
    {
      type: 'table',
      head: ['Action', 'Credits'],
      rows: [
        ['Look up a profile', 'Free'],
        [LIVE.phoneData ? 'Reveal email and phone' : 'Reveal the work email', String(CREDIT_COSTS.EXTENSION_REVEAL)],
        ['Reveal a contact your team already revealed', 'Free'],
        ['Reveal the same contact in the DataPit web app', String(CREDIT_COSTS.REVEAL)],
      ],
      note: `Credits come from your DataPit plan. The Free plan includes ${FREE_CREDITS} credits a month; see [pricing](/pricing) for paid plans.`,
    },
    {
      type: 'faq',
      items: [
        {
          q: 'Is the DataPit Chrome extension free?',
          a: `Yes. The extension is free to install. Lookups are free, and revealing a contact costs ${CREDIT_COSTS.EXTENSION_REVEAL} credits from your DataPit plan, including the Free plan's ${FREE_CREDITS} monthly credits.`,
        },
        {
          q: 'Do I need a DataPit account?',
          a: 'Yes. The extension connects to your DataPit workspace with an API key you create in Settings → API & Extension. [Create a free account](/login?mode=register) to get one.',
        },
        {
          q: 'Which browsers does it support?',
          a: 'It’s built for Google Chrome and listed on the Chrome Web Store. The DataPit dashboard also offers a .zip to load unpacked, for other Chromium browsers or manual installs.',
        },
        {
          q: 'Does DataPit keep the profiles I look up?',
          a: 'Only some. If the person isn’t in DataPit, or their job title has changed, DataPit keeps profile details for its team to review. The [extension privacy notice](/chrome-extension/privacy) lists what it keeps.',
        },
      ],
    },
    {
      type: 'related',
      items: [
        { label: 'Product', to: '/product', text: 'Search, reveal, sequences and the credit ledger.' },
        { label: 'Pricing', to: '/pricing', text: `Seat blocks from $${LOWEST_PRICE} a month, and a free plan.` },
        { label: 'Extension privacy notice', to: '/chrome-extension/privacy', text: 'What the extension reads, sends and stores, and how to remove it.' },
      ],
    },
  ],
};
