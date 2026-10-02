import { CREDIT_COSTS, EXTENSION_NAME, EXTENSION_VERSION, LIVE } from '../../../data/facts.js';

// The privacy notice the Chrome Web Store listing links to. Every statement
// describes the code as it is: extension/ (manifest.json, background.js,
// ui.js, content.js, apps.js, popup.js, options.js, announce.js) and the
// backend it calls (routes/extension.js, services/extensionService.js,
// sourcingService.js, revealService.js, apiKeyService.js). Re-check it
// whenever the extension's version, permissions, payload or storage change.
const CHECKED = '2026-10-02';
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
      'What the DataPit Chrome extension reads on LinkedIn, Gmail, Calendar, CRMs and company sites, what it sends and stores, and how to remove it.',
    updated: '2026-10-02',
    published: true,
    station: 'reveal',
  },
  hero: {
    eyebrow: 'Chrome extension',
    lines: ['Extension', 'privacy notice'],
    sub: `${EXTENSION_NAME} reads people’s names and profile fields on LinkedIn and Sales Navigator, and email addresses on Gmail, Google Calendar, HubSpot and Salesforce when you open its card. Once you connect an API key, it sends them to DataPit to check who is in DataPit. It stores only your key and the API address on your computer.`,
    primary: { label: 'Read the privacy policy', to: '/privacy' },
    secondary: { label: 'About the extension', to: '/chrome-extension' },
  },
  blocks: [
    {
      type: 'callout',
      title: 'In short',
      text: 'The extension sends nothing until you connect an API key. On LinkedIn and Sales Navigator it sends five fields about the person on the page. On Gmail, Calendar and the CRMs it sends email addresses, only when you open its card. On other websites it sends the site’s domain, only when you click its icon. It never reads email text.',
    },

    { type: 'h2', text: 'What does this notice cover?' },
    {
      type: 'p',
      text: `This notice covers version ${EXTENSION_VERSION} of ${EXTENSION_NAME}, DataPit’s extension for Google Chrome (earlier versions were called DataPit — LinkedIn Lookup and ran on LinkedIn only). The Chrome Web Store requires every extension that handles user data to post a privacy policy, and this is ours. The [DataPit privacy policy](/privacy) covers your account and the rest of DataPit.`,
    },

    { type: 'h2', text: 'What does the extension read on LinkedIn and Sales Navigator?' },
    {
      type: 'p',
      text: 'On a linkedin.com/in/ profile or a Sales Navigator lead page, it reads five fields about the person whose page you’re viewing:',
    },
    {
      type: 'list',
      items: [
        'Their name.',
        'The profile address, cut down to linkedin.com/in/ and the profile name. On a Sales Navigator lead, only if the page shows a link to the public profile.',
        'Their headline or job title.',
        'Their current company’s name.',
        'Their location.',
      ],
    },
    {
      type: 'p',
      text: 'To find them, it looks at the top section of the page and at the browser tab’s title. A field it can’t find is left out. It sends nothing else from the page. It also writes what it found to your browser’s developer console, which stays on your computer unless you choose to send it to our support team.',
    },

    { type: 'h2', text: 'What does it read on Gmail, Google Calendar, HubSpot and Salesforce?' },
    {
      type: 'list',
      items: [
        '**Gmail:** the email addresses of the people in the thread you have open, and of the recipients in an open draft. It skips your own address and automated senders such as no-reply addresses.',
        '**Google Calendar:** the email addresses of the guests of the event you have open. It skips calendar rooms and resources.',
        '**HubSpot and Salesforce:** the email addresses shown on the contact, lead, company or account record you have open.',
      ],
    },
    {
      type: 'p',
      text: 'It reads addresses only, never email text, subjects, attachments, event descriptions or CRM notes. While you browse it only counts the addresses on the page, to show that number on its launcher. It sends them to DataPit only when you open the DataPit card, at most 10 at a time.',
    },

    { type: 'h2', text: 'What does it read on other websites?' },
    {
      type: 'p',
      text: 'Nothing, until you click the DataPit icon in Chrome’s toolbar. Then Chrome lets the extension see the address of the tab you’re on, and the popup sends that site’s domain (for example acme.com) to DataPit to show the company and its people. It doesn’t read the page itself.',
    },

    { type: 'h2', text: 'Which pages does it run on?' },
    {
      type: 'p',
      text: 'Chrome loads the extension’s scripts on linkedin.com, mail.google.com, calendar.google.com, app.hubspot.com and Salesforce Lightning pages, because these apps change pages without a full reload. On LinkedIn the script acts only on profile and Sales Navigator lead pages. On HubSpot and Salesforce it acts only on record pages. Everywhere else on those sites it hides its card and reads nothing more.',
    },
    {
      type: 'p',
      text: 'It also runs a small script on datapit.io that only tells the DataPit dashboard the extension is installed, and which version. It runs on no other website.',
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
          'You open a LinkedIn profile or Sales Navigator lead, or click Scan',
          'The five profile fields and your API key. For a lead with no public profile link: the name and company only.',
          'To check whether the person is in DataPit.',
        ],
        [
          'You open the DataPit card on Gmail, Calendar, HubSpot or Salesforce, or click Refresh',
          'The email addresses on the page (up to 10) and your API key',
          'To show which of those people are in DataPit.',
        ],
        [
          'You click the DataPit icon on another website',
          'The site’s domain and your API key',
          'To show the company behind the site and its people in DataPit.',
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
      text: 'Until you connect a key, the extension sends nothing. Profile lookups are limited to 60 an hour per workspace, and Gmail, Calendar, CRM, Sales Navigator and website lookups to 300 an hour per user.',
    },

    { type: 'h2', text: 'What does DataPit send back?' },
    {
      type: 'p',
      text: `For each person in DataPit, it returns their record with any email address${PHONE} partly hidden, plus the reveal price. If your workspace already revealed them, the details come back in full and the reveal is free. After a reveal, it returns the work email${PHONE}. The card or popup shows these, and the extension doesn’t save them.`,
    },
    {
      type: 'p',
      text: 'Clicking a revealed value copies it to your clipboard. Nothing is copied unless you click.',
    },

    { type: 'h2', text: 'What does it store on your computer?' },
    {
      type: 'p',
      text: `It keeps up to two settings in Chrome’s extension storage: your DataPit API key, and any API address you save in its options. Without one, it uses ${API_BASE}. It stores no profiles, addresses, lookup results or browsing data; results it shows on a page are forgotten when you close the tab.`,
    },
    {
      type: 'p',
      text: 'Only the extension’s popup and background worker handle the key. The parts that run on LinkedIn, Gmail, Calendar and the CRMs never read it, and those pages’ own scripts can’t see it. Chrome deletes this storage when you remove the extension.',
    },

    { type: 'h2', text: 'What does DataPit store from your lookups?' },
    {
      type: 'table',
      caption: 'What DataPit keeps after a lookup or reveal',
      head: ['What happened', 'What DataPit keeps', 'Why'],
      rows: [
        ['A LinkedIn profile is in DataPit, and no title change shows up', 'Nothing new from the profile.', 'There’s nothing to update.'],
        [
          'A LinkedIn profile is in DataPit, but the job title differs',
          'The new job title (the first part of the headline), the company name you saw, and the profile name from its address. Also the old title, how often and when it was reported, and who reported it first.',
          'So DataPit’s team can review the change and update the record.',
        ],
        [
          'A LinkedIn profile isn’t in DataPit',
          'The five profile fields, how often and when the profile was reported, and who reported it first. A later lookup updates the fields it found.',
          'So DataPit’s team can find the person and add them.',
        ],
        [
          'A Gmail, Calendar, CRM, Sales Navigator (by name) or website lookup',
          'Nothing from the lookup itself. For website lookups, the domain appears in DataPit’s request logs as part of the request address.',
          'These lookups only read DataPit’s database.',
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
      text: `DataPit’s servers also keep standard request logs, which include your IP address and browser details but not the addresses or names you look up, and never your API key. DataPit keeps each reveal response, including the email${PHONE}, for 24 hours. A repeated request with the same request ID gets the same answer without a second charge.${VERIFIER}`,
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
        ['Active tab', 'To see the address of the tab you’re on when you click the DataPit icon, so the popup can look up that company’s website. Chrome grants it only after you click, only for that tab.'],
        ['Access to datapit.io', 'To send lookups and reveals to DataPit’s API, and to tell the DataPit dashboard the extension is installed.'],
        ['Access to linkedin.com', 'To read the five profile fields and show the DataPit card on profile and Sales Navigator lead pages.'],
        ['Access to mail.google.com and calendar.google.com', 'To read the email addresses of the people in an open thread, draft or event, and show the DataPit card.'],
        ['Access to app.hubspot.com and Salesforce Lightning', 'To read the email addresses on an open CRM record, and show the DataPit card.'],
        [
          'Access to localhost',
          'For DataPit’s own development and testing. The extension sends requests there only if you point its API address at it. On pages at localhost:5173, it only announces that it’s installed.',
        ],
      ],
      note: 'It doesn’t ask for Chrome’s tabs, history, cookies, downloads or all-websites permissions. Its options page lets developers point it at a test server, and it uses datapit.io unless you change that. If you change it, your key and lookups go to the address you set.',
    },

    { type: 'h2', text: 'What doesn’t the extension do?' },
    {
      type: 'list',
      items: [
        'It doesn’t read your browsing history, and it reads nothing on other websites unless you click its icon.',
        'It doesn’t read email text, subjects, attachments, calendar descriptions or CRM notes, only the addresses of the people shown.',
        'It doesn’t open or load pages by itself, or send email or change anything in Gmail, Calendar, HubSpot or Salesforce.',
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
          text: `Open chrome://extensions and click Remove on ${EXTENSION_NAME}. Chrome deletes the extension’s stored settings, including the key.`,
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
          a: 'No. Until you connect an API key, every request stops inside the extension. The card only asks you to connect.',
        },
        {
          q: 'Does it read my emails?',
          a: 'No. In Gmail it reads only the email addresses of the people in the open thread or draft, and sends them only when you open the DataPit card. It never reads message text, subjects or attachments.',
        },
        {
          q: 'Is every LinkedIn profile I open sent to DataPit?',
          a: 'Yes, while the extension is connected. Each linkedin.com/in/ profile or Sales Navigator lead you open triggers one lookup. To stop it, disconnect in the popup or remove the extension.',
        },
        {
          q: 'Does DataPit keep what I look up?',
          a: 'Only LinkedIn profiles that aren’t in DataPit, or whose job title has changed, so its team can add or update the record. Gmail, Calendar, CRM and website lookups aren’t stored.',
        },
        {
          q: 'Does the extension know my passwords?',
          a: 'No. It never reads login details on any site. It connects to DataPit with an API key instead of your DataPit password.',
        },
      ],
    },
    {
      type: 'related',
      items: [
        { label: 'Privacy policy', to: '/privacy', text: 'Your account, retention and the opt-out form.' },
        { label: 'Chrome extension', to: '/chrome-extension', text: 'Where the extension works and what reveals cost.' },
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
          label: 'Chrome for Developers: the activeTab permission',
          url: 'https://developer.chrome.com/docs/extensions/develop/concepts/activeTab',
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
