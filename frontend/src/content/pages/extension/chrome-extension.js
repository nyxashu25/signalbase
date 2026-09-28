import { CREDIT_COSTS, EXTENSION_STORE_URL } from '../../../data/facts.js';

export default {
  meta: {
    path: '/chrome-extension',
    section: 'extension',
    name: 'Chrome extension',
    title: 'LinkedIn Email Finder Chrome Extension | DataPit',
    description: `DataPit's free Chrome extension checks the LinkedIn profile you're viewing against DataPit and reveals the email and phone for ${CREDIT_COSTS.EXTENSION_REVEAL} credits.`,
    updated: '2026-09-28',
    published: true,
    station: 'reveal',
  },
  hero: {
    eyebrow: 'Chrome extension',
    lines: ['Find emails on', 'LinkedIn profiles'],
    sub: `DataPit — LinkedIn Lookup is a free Chrome extension. Open a LinkedIn profile and it checks the person against DataPit. If they're in the database, you can reveal their work email and phone number for ${CREDIT_COSTS.EXTENSION_REVEAL} credits, or for free if your team already has.`,
    primary: { label: 'Add to Chrome', to: EXTENSION_STORE_URL },
    secondary: { label: 'Start free', to: '/login?mode=register' },
  },
  blocks: [
    {
      type: 'callout',
      title: 'In short',
      text: `Install the extension from the [Chrome Web Store](${EXTENSION_STORE_URL}), connect it with an API key from your DataPit workspace, and open any linkedin.com/in/ profile. A DataPit card shows whether the person is in the database, and one click reveals their contact details.`,
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
          text: `If the person is in DataPit, reveal their email and phone number for ${CREDIT_COSTS.EXTENSION_REVEAL} credits. Contacts anyone on your team has already revealed are free.`,
        },
      ],
    },
    { type: 'h2', text: 'What happens when someone isn’t in DataPit?' },
    {
      type: 'p',
      text: 'The profile is queued for sourcing: the DataPit team works through the queue to add missing people to the database. If a profile is found but the job title has changed, the change is reported so the record can be updated.',
    },
    { type: 'h2', text: 'What does the extension read?' },
    {
      type: 'p',
      text: 'Exactly five fields from each profile you open, and nothing else: the person’s name, the profile URL, their job title, their current company’s name and their location. It reads no other page text and no browsing history. It only runs on linkedin.com/in/ pages you open yourself, and it only talks to DataPit.',
    },
    { type: 'h2', text: 'How much does it cost?' },
    {
      type: 'table',
      head: ['Action', 'Credits'],
      rows: [
        ['Look up a profile', 'Free'],
        ['Reveal email and phone', String(CREDIT_COSTS.EXTENSION_REVEAL)],
        ['Reveal a contact your team already revealed', 'Free'],
        ['Reveal the same contact in the DataPit web app', String(CREDIT_COSTS.REVEAL)],
      ],
      note: 'Credits come from your DataPit plan. The Free plan includes 800 credits a month; see [pricing](/pricing) for paid plans.',
    },
    {
      type: 'faq',
      items: [
        {
          q: 'Is the DataPit Chrome extension free?',
          a: `Yes. The extension is free to install. Lookups are free, and revealing a contact costs ${CREDIT_COSTS.EXTENSION_REVEAL} credits from your DataPit plan, including the Free plan's 800 monthly credits.`,
        },
        {
          q: 'Do I need a DataPit account?',
          a: 'Yes. The extension connects to your DataPit workspace with an API key you create in Settings → API & Extension. [Create a free account](/login?mode=register) to get one.',
        },
        {
          q: 'Which browsers does it support?',
          a: 'Google Chrome, from the Chrome Web Store. Other Chromium browsers can load the downloadable version manually.',
        },
        {
          q: 'Does it scrape LinkedIn?',
          a: 'No. It doesn’t crawl or collect in the background. It only reads the five profile fields above from pages you open yourself, one at a time.',
        },
      ],
    },
    {
      type: 'related',
      items: [
        { label: 'Product', to: '/product', text: 'Search, reveal, sequences and the credit ledger.' },
        { label: 'Pricing', to: '/pricing', text: 'Seat blocks from $29 a month, and a free plan.' },
      ],
    },
  ],
};
