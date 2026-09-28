import { CREDIT_COSTS, LIVE } from '../../../data/facts.js';

// The privacy notice the Chrome Web Store listing links to. Every statement
// describes the code as it is: extension/ (manifest.json, background.js,
// content.js, popup.js, options.js, announce.js) and the backend it calls
// (routes/extension.js, services/extensionService.js, sourcingService.js,
// revealService.js, apiKeyService.js). Re-check it whenever the extension's
// version, permissions, payload or storage change.
const CHECKED = '2026-09-28';
const EXTENSION_VERSION = '0.5.0'; // extension/manifest.json "version"
const API_BASE = 'https://datapit.io/api/v1'; // extension/background.js DEFAULT_API_BASE

// Phones only once imported records carry them (LIVE in facts.js; today none do).
const PHONE = LIVE.phoneData ? ' and phone number' : '';
// Hunter.io is called only when EMAIL_VERIFIER_API_KEY is set
// (backend/src/services/emailVerifierService.js); LIVE.emailVerification tracks that.
const VERIFIER = LIVE.emailVerification
  ? ' To check an address it works out, DataPit sends that address to Hunter.io, an outside email-checking service.'
  : '';

export default {
  meta: {
    path: '/chrome-extension/privacy',
    section: 'extension',
    name: 'Extension privacy notice',
    title: 'Chrome Extension Privacy Notice | DataPit',
    description:
      'What the DataPit — LinkedIn Lookup Chrome extension reads, sends and stores, why it needs each permission, and how to disconnect or remove it.',
    updated: '2026-09-28',
    published: true,
    station: 'reveal',
  },
  hero: {
    eyebrow: 'Chrome extension',
    lines: ['Extension', 'privacy notice'],
    sub: 'DataPit — LinkedIn Lookup reads five fields from LinkedIn profiles you open: name, profile URL, job title, current company and location. Once you connect an API key, it sends them to DataPit to check whether the person is in DataPit. It stores only your key and the API address on your computer.',
    primary: { label: 'Read the privacy policy', to: '/privacy' },
    secondary: { label: 'About the extension', to: '/chrome-extension' },
  },
  blocks: [
    {
      type: 'callout',
      title: 'In short',
      text: 'The extension reads five fields from LinkedIn profiles you open, and sends them to DataPit only after you connect an API key. If the person isn’t in DataPit, or their job title has changed, DataPit keeps profile details for its team to review. You can disconnect, revoke the key or remove the extension at any time.',
    },

    { type: 'h2', text: 'What does this notice cover?' },
    {
      type: 'p',
      text: `This notice covers version ${EXTENSION_VERSION} of DataPit — LinkedIn Lookup, DataPit’s extension for Google Chrome. The Chrome Web Store requires every extension that handles user data to post a privacy policy, and this is ours. The [DataPit privacy policy](/privacy) covers your account and the rest of DataPit.`,
    },

    { type: 'h2', text: 'What does the extension read on LinkedIn?' },
    {
      type: 'p',
      text: 'On a linkedin.com/in/ profile page, it reads five fields about the person whose profile you’re viewing:',
    },
    {
      type: 'list',
      items: [
        'Their name.',
        'The profile address, cut down to linkedin.com/in/ and the profile name. Anything after the profile name is dropped.',
        'Their headline, which the extension treats as the job title.',
        'Their current company’s name.',
        'Their location.',
      ],
    },
    {
      type: 'p',
      text: 'To find them, it looks at the top section of the profile and at the browser tab’s title. If it can’t find the top section, it searches the rest of the page. A field it can’t find is left out. It sends nothing else from the page.',
    },
    {
      type: 'p',
      text: 'The extension also writes what it found to your browser’s developer console. If a field is missing, it also adds the page address, the tab title and up to 60 short lines of page text. That output stays on your computer unless you choose to send it to our support team.',
    },

    { type: 'h2', text: 'Which pages does it run on?' },
    {
      type: 'p',
      text: 'Chrome loads the extension’s script on linkedin.com pages, because LinkedIn often changes pages without a full reload. The script checks the page address. On anything other than a linkedin.com/in/ profile, it hides its card and reads nothing more.',
    },
    {
      type: 'p',
      text: 'It also runs a small script on datapit.io. That script only tells the DataPit dashboard that the extension is installed, and which version. Apart from the local test addresses in the permissions table below, the extension doesn’t run on any other website.',
    },

    { type: 'h2', text: 'What does it send to DataPit, and when?' },
    {
      type: 'table',
      caption: 'Every request the extension makes',
      head: ['When', 'What it sends', 'Why'],
      rows: [
        ['You connect an API key', 'The key', 'To check the key works, so a mistyped key fails straight away.'],
        ['You open the popup', 'Your API key', 'To show your name, email address, workspace, plan and credit balance.'],
        [
          'You open a profile, or click Scan profile',
          'The five profile fields and your API key',
          'To check whether the person is in DataPit.',
        ],
        [
          'You click Reveal',
          'The contact’s DataPit ID, a one-time request ID and your API key',
          `To reveal the contact for ${CREDIT_COSTS.EXTENSION_REVEAL} credits. If the same request reaches DataPit twice, the request ID stops a second charge.`,
        ],
      ],
      note: `Every request goes over HTTPS to DataPit’s API at ${API_BASE}, unless you change the API address in the extension’s options. Your API key tells DataPit which user and workspace the request is for.`,
    },
    {
      type: 'p',
      text: 'Until you connect a key, the extension sends nothing. Once connected, it runs one lookup each time you open a profile page, including one you opened before. Lookups are limited to 60 an hour per workspace.',
    },

    { type: 'h2', text: 'What does DataPit send back?' },
    {
      type: 'p',
      text: `If the person is in DataPit, it returns their record with any email address${PHONE} partly hidden, plus the reveal price. If your workspace already revealed them, the details come back in full and the reveal is free. After a reveal, it returns the work email${PHONE}. The card shows these on the LinkedIn page, and the extension doesn’t save them.`,
    },
    {
      type: 'p',
      text: 'Clicking a revealed value copies it to your clipboard. Nothing is copied unless you click.',
    },

    { type: 'h2', text: 'What does it store on your computer?' },
    {
      type: 'p',
      text: `It keeps up to two settings in Chrome’s extension storage: your DataPit API key, and any API address you save in its options. Without one, it uses ${API_BASE}. It stores no profiles, lookup results or browsing data.`,
    },
    {
      type: 'p',
      text: 'Only the extension’s popup and background worker handle the key. The part that runs on LinkedIn never reads it, and the LinkedIn page’s own scripts can’t see it. Chrome deletes this storage when you remove the extension.',
    },

    { type: 'h2', text: 'What does DataPit store from your lookups?' },
    {
      type: 'table',
      caption: 'What DataPit keeps after a lookup or reveal',
      head: ['What happened', 'What DataPit keeps', 'Why'],
      rows: [
        ['The person is in DataPit, and no title change shows up', 'Nothing new from the profile.', 'There’s nothing to update.'],
        [
          'The person is in DataPit, but the job title differs',
          'The new job title (the first part of the headline), the company name you saw, and the profile name from its address. Also the old title, how often and when it was reported, and who reported it first.',
          'So DataPit’s team can review the change and update the record.',
        ],
        [
          'The person isn’t in DataPit',
          'The five profile fields, how often and when the profile was reported, and who reported it first. A later lookup updates the fields it found.',
          'So DataPit’s team can find the person and add them.',
        ],
        [
          'You reveal a contact',
          'A credit ledger entry and a record that your workspace revealed this contact. If the record had no email, the address DataPit works out from the name and company domain is saved to it.',
          'To charge the credits, and to make the contact free for everyone in your workspace.',
        ],
      ],
      note: '“Who reported it first” is the ID of the DataPit user whose lookup created the entry. The entry keeps it even if that account is later deleted. Entries made by extension versions before 0.3.0 can also hold the profile page’s visible text, which those versions sent.',
    },
    {
      type: 'p',
      text: 'Only DataPit’s own administrators see the queues of missing people and title changes. When they accept a title change, the record’s title changes for every workspace. If DataPit’s team later adds a queued person to the database, every DataPit workspace can search their record.',
    },
    {
      type: 'p',
      text: `DataPit’s servers also keep standard request logs, which include your IP address and browser details. DataPit keeps each reveal response, including the email${PHONE}, for 24 hours. A repeated request with the same request ID gets the same answer without a second charge.${VERIFIER}`,
    },

    { type: 'h2', text: 'How long does DataPit keep this data?' },
    {
      type: 'p',
      text: 'DataPit hasn’t published a retention period for queued profiles, reported title changes or request logs yet. It doesn’t delete queue entries automatically, even after its team resolves them. Its admin log also keeps a note of each resolved entry. Your account and billing records follow the retention section of the [privacy policy](/privacy).',
    },

    { type: 'h2', text: 'Which permissions does it ask for, and why?' },
    {
      type: 'table',
      head: ['Permission', 'Why the extension needs it'],
      rows: [
        ['Storage', 'To keep your API key and the API address on your computer.'],
        ['Access to datapit.io', 'To send lookups and reveals to DataPit’s API, and to tell the DataPit dashboard the extension is installed.'],
        ['Access to linkedin.com', 'To read the five profile fields and show the DataPit card on profile pages.'],
        [
          'Access to localhost',
          'For DataPit’s own development and testing. The extension sends requests there only if you point its API address at it. On pages at localhost:5173, it only announces that it’s installed.',
        ],
      ],
      note: 'It doesn’t ask for Chrome’s tabs, history, cookies or downloads permissions. Its options page lets developers point it at a test server, and it uses datapit.io unless you change that. If you change it, your key and lookups go to the address you set.',
    },

    { type: 'h2', text: 'What doesn’t the extension do?' },
    {
      type: 'list',
      items: [
        'It doesn’t read your browsing history. Apart from the local test addresses above, it runs only on LinkedIn and DataPit.',
        'It doesn’t open or load pages by itself. It only reads the profile you have open.',
        'It doesn’t send your LinkedIn messages, connections, feed or login details to DataPit.',
        'It sends data only to DataPit’s API, or to the API address you set in its options.',
        'It doesn’t store the contacts you reveal. They stay in your DataPit workspace.',
        'DataPit doesn’t sell your workspace’s data to third parties, as its [privacy policy](/privacy) states.',
      ],
    },

    { type: 'h2', text: 'How do you disconnect or remove the extension?' },
    {
      type: 'steps',
      items: [
        {
          title: 'Disconnect in the popup',
          text: 'Click the DataPit icon in Chrome’s toolbar, then Disconnect. This deletes the API key from the extension, and lookups stop.',
        },
        {
          title: 'Revoke the key in DataPit',
          text: 'Disconnecting doesn’t cancel the key itself. In DataPit, go to Settings → API & Extension and revoke it, so it stops working everywhere.',
        },
        {
          title: 'Remove the extension',
          text: 'Open chrome://extensions and click Remove on DataPit — LinkedIn Lookup. Chrome deletes the extension’s stored settings, including the key.',
        },
      ],
    },
    {
      type: 'p',
      text: 'Removing the extension doesn’t delete what DataPit already stored from past lookups. The next section explains how to ask about that.',
    },

    { type: 'h2', text: 'What are your data rights?' },
    {
      type: 'p',
      text: 'Depending on where you live, you may have rights to access, correct, export or delete your personal data. For your DataPit account, [contact us](/contact) and we’ll act on your request once we confirm it’s from you.',
    },
    {
      type: 'p',
      text: 'If your own details appear as a contact record in DataPit, use the opt-out form on the [privacy page](/privacy). It redacts records that match the email address you enter.',
    },
    {
      type: 'p',
      text: 'The opt-out form works by email address. It doesn’t clear queued LinkedIn profiles, which have no email address, or reported title changes. To ask about either, [contact us](/contact).',
    },

    { type: 'h2', text: 'How do you contact DataPit about privacy?' },
    {
      type: 'p',
      text: 'Use the [contact page](/contact) for any question about this notice or the extension. The last-updated date on this page shows when the notice last changed.',
    },

    {
      type: 'faq',
      items: [
        {
          q: 'Does the extension send anything before I connect it?',
          a: 'No. Until you connect an API key, every request stops inside the extension. On a profile page, the card only asks you to connect.',
        },
        {
          q: 'Is every LinkedIn profile I open sent to DataPit?',
          a: 'Yes, while the extension is connected. Each linkedin.com/in/ profile page you open triggers one lookup with the five fields. To stop it, disconnect in the popup or remove the extension.',
        },
        {
          q: 'Does DataPit keep the profiles I look up?',
          a: 'Only when the person isn’t in DataPit, or when their job title has changed. Then DataPit keeps the profile details its team needs to add or update the record.',
        },
        {
          q: 'Who can see the profiles I send?',
          a: 'DataPit’s administrators, who review the queues. Other workspaces don’t see your lookups. If DataPit’s team adds a queued person to the database, every workspace can search their record.',
        },
        {
          q: 'Does the extension know my passwords?',
          a: 'No. It never reads LinkedIn login details. It connects to DataPit with an API key instead of your DataPit password.',
        },
      ],
    },
    {
      type: 'related',
      items: [
        { label: 'Privacy policy', to: '/privacy', text: 'Your account, retention and the opt-out form.' },
        { label: 'Chrome extension', to: '/chrome-extension', text: 'How the extension works and what reveals cost.' },
        { label: 'Contact', to: '/contact', text: 'Questions about this notice or your data.' },
      ],
    },
    {
      type: 'sources',
      items: [
        {
          label: 'Chrome for Developers: chrome.storage API reference',
          url: 'https://developer.chrome.com/docs/extensions/reference/api/storage',
          checked: CHECKED,
        },
        {
          label: 'Chrome Web Store program policies: Privacy policies',
          url: 'https://developer.chrome.com/docs/webstore/program-policies/privacy',
          checked: CHECKED,
        },
      ],
    },
  ],
};
