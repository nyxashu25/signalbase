import {
  CREDIT_COSTS,
  EXTENSION_NAME,
  EXTENSION_STORE_URL,
  EXTENSION_SURFACES,
  LIVE,
  extensionStoreNote,
  formatCount,
} from '../../../data/facts.js';
import { FREE_PLAN_MONTHLY_CREDITS, PLANS } from '../../../data/plans.js';

// Phones only once imported records carry them (LIVE in facts.js; today none do).
const PHONE = LIVE.phoneData ? ' and phone number' : '';
const FREE_CREDITS = formatCount(FREE_PLAN_MONTHLY_CREDITS);
const LOWEST_PRICE = PLANS.filter((p) => p.block)[0].price;
const REVEAL = CREDIT_COSTS.EXTENSION_REVEAL;
const STORE_NOTE = extensionStoreNote();

export default {
  meta: {
    path: '/chrome-extension',
    section: 'extension',
    name: 'Chrome extension',
    title: 'Free Email Finder Chrome Extension | DataPit',
    description:
      'Free Chrome extension that finds work emails on LinkedIn, Sales Navigator, company websites, Gmail, Google Calendar, HubSpot and Salesforce.',
    updated: '2026-10-02',
    published: true,
    station: 'reveal',
  },
  hero: {
    eyebrow: 'Chrome extension',
    lines: ['Find emails', 'wherever you work'],
    sub: `${EXTENSION_NAME} is free to install. It shows who is in DataPit on LinkedIn and Sales Navigator profiles, company websites, Gmail threads, Google Calendar events and HubSpot or Salesforce records. It reveals a work email${PHONE} for ${REVEAL} credits, free if your team already revealed it.`,
    primary: { label: 'Add to Chrome, free', to: EXTENSION_STORE_URL },
    secondary: { label: 'Start free', to: '/login?mode=register' },
  },
  blocks: [
    {
      type: 'callout',
      title: 'In short',
      text: `Install the extension free from the [Chrome Web Store](${EXTENSION_STORE_URL}) and connect it with an API key from your DataPit workspace. It works on ${EXTENSION_SURFACES}. A DataPit card shows who on the page is in DataPit, and one click reveals a work email${PHONE} for ${REVEAL} credits.${STORE_NOTE ? ` ${STORE_NOTE}` : ''}`,
    },
    { type: 'h2', text: 'Where does the DataPit extension work?' },
    {
      type: 'table',
      head: ['Where', 'What you see', 'When it looks people up'],
      rows: [
        ['LinkedIn profiles', 'A card for the person whose profile you’re on', 'When you open the profile'],
        [
          'Sales Navigator leads',
          'A card for the lead, matched by their public profile or by name and company',
          'When you open the lead',
        ],
        [
          'Company websites',
          'The company and its people in DataPit, in the extension popup',
          'When you click the DataPit icon',
        ],
        ['Gmail', 'The people in the open email thread or draft', 'When you open the DataPit card'],
        ['Google Calendar', 'The guests of the open event', 'When you open the DataPit card'],
        ['HubSpot and Salesforce', 'The people on the contact, lead, company or account record', 'When you open the DataPit card'],
      ],
      note: 'On Gmail, Calendar and the CRMs, the launcher shows how many people it can see, and nothing is looked up until you open the card.',
    },
    { type: 'h2', text: 'How do you install it?' },
    {
      type: 'steps',
      items: [
        {
          title: 'Add it to Chrome',
          text: `The extension is free to install: [add ${EXTENSION_NAME} to Chrome](${EXTENSION_STORE_URL}).`,
        },
        {
          title: 'Connect your workspace',
          text: 'In DataPit, go to Settings → API & Extension, create an API key and paste it into the extension popup. The key stays inside the extension, never on the pages you visit.',
        },
        {
          title: 'Open a profile, an email, an event or a record',
          text: 'The DataPit card appears at the bottom right. On a company’s website, click the DataPit icon in Chrome’s toolbar instead.',
        },
        {
          title: 'Reveal the contacts you want',
          text: `Reveal a work email${PHONE} for ${REVEAL} credits. Contacts anyone on your team has already revealed are free.`,
        },
      ],
    },
    { type: 'h2', text: 'What happens when someone isn’t in DataPit?' },
    {
      type: 'p',
      text: 'On a LinkedIn profile, DataPit queues the person for its team, who can find them and add them to the database. If the person is found but LinkedIn shows a different job title, the change is queued for review. On Sales Navigator, Gmail, Calendar, the CRMs and company websites, the card simply says the person isn’t in DataPit yet.',
    },
    { type: 'h2', text: 'What does the extension send to DataPit?' },
    {
      type: 'list',
      items: [
        '**LinkedIn and Sales Navigator:** five fields about the person on the page: name, profile address, job title, current company and location.',
        '**Gmail, Google Calendar, HubSpot and Salesforce:** the email addresses of the people shown, only when you open the card. Never message text, subjects or attachments.',
        '**Company websites:** the site’s domain, only when you click the DataPit icon.',
      ],
    },
    {
      type: 'p',
      text: 'It sends data only to DataPit, and stores only your API key on your computer. The [extension privacy notice](/chrome-extension/privacy) covers every request in detail.',
    },
    { type: 'h2', text: 'How much does it cost?' },
    {
      type: 'table',
      head: ['Action', 'Credits'],
      rows: [
        ['Install the extension', 'Free'],
        ['Look up a profile, lead, email thread, event, record or company site', 'Free'],
        [LIVE.phoneData ? 'Reveal email and phone' : 'Reveal the work email', String(REVEAL)],
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
          a: `Yes. It is free to install and lookups are free. Revealing a contact costs ${REVEAL} credits from your DataPit plan, including the Free plan's ${FREE_CREDITS} monthly credits.`,
        },
        {
          q: 'Does it read my emails?',
          a: 'No. In Gmail it reads only the email addresses of the people in the thread or draft you have open, and only when you open the DataPit card. It never reads message text, subjects or attachments, and DataPit doesn’t store the addresses you look up.',
        },
        {
          q: 'Which CRMs does it work with?',
          a: 'HubSpot and Salesforce Lightning. Open a contact, lead, company or account record and the DataPit card lists the people on it.',
        },
        {
          q: 'Do I need a DataPit account?',
          a: 'Yes. The extension connects to your DataPit workspace with an API key you create in Settings → API & Extension. [Create a free account](/login?mode=register) to get one.',
        },
        {
          q: 'Which browsers does it support?',
          a: 'It’s built for Google Chrome and listed on the Chrome Web Store. The DataPit dashboard also offers a .zip to load unpacked, for other Chromium browsers or manual installs.',
        },
      ],
    },
    {
      type: 'related',
      items: [
        { label: 'Product', to: '/product', text: 'Search, reveal and the credit ledger.' },
        { label: 'Pricing', to: '/pricing', text: `Seat blocks from $${LOWEST_PRICE} a month, and a free plan.` },
        { label: 'Extension privacy notice', to: '/chrome-extension/privacy', text: 'What the extension reads, sends and stores, and how to remove it.' },
      ],
    },
  ],
};
