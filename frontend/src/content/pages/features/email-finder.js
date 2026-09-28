import { CREDIT_COSTS, EXTENSION_STORE_URL, LIVE, formatCount } from '../../../data/facts.js';
import { FREE_PLAN_MONTHLY_CREDITS, PLANS } from '../../../data/plans.js';

const BASIC_PRICE = PLANS.find((p) => p.key === 'BASIC').price;

// How a reveal gets an address (backend revealService.js): the email on file,
// or one first.last@company-domain guess when none is on file. The guess is
// only checked by a verifier when LIVE.emailVerification is on.
const GUESS = LIVE.emailVerification
  ? 'If none is on file, DataPit checks one first.last@company-domain guess with a verifier.'
  : 'If none is on file, DataPit makes one first.last@company-domain guess, marked unverified.';

export default {
  meta: {
    path: '/features/email-finder',
    section: 'features',
    name: 'Email finder',
    title: 'Email Finder: Find a Work Email Address | DataPit',
    description: `Find a contact's work email in DataPit: search, then reveal it for ${CREDIT_COSTS.REVEAL} credits, or ${CREDIT_COSTS.EXTENSION_REVEAL} from the Chrome extension. Then it's free for your team.`,
    updated: '2026-09-28',
    published: true,
    station: 'reveal',
  },
  hero: {
    eyebrow: 'Email finder',
    lines: ['Find a work', 'email address'],
    sub: `Find the person in DataPit by name, job title or company, then reveal them. You get the work email DataPit has on file. ${GUESS} A reveal costs ${CREDIT_COSTS.REVEAL} credits in the app or ${CREDIT_COSTS.EXTENSION_REVEAL} from the Chrome extension. Then it’s free for your whole workspace.`,
  },
  blocks: [
    {
      type: 'callout',
      title: 'In short',
      text: `Find the person in [people search](/features/people-search) and select reveal. DataPit returns the address on file or, when there isn’t one, a single first.last@domain guess, and says whether it’s verified. Once anyone on your team reveals a contact, it’s free for everyone else.`,
    },
    { type: 'h2', text: 'How do you find someone’s work email in DataPit?' },
    {
      type: 'steps',
      items: [
        {
          title: 'Search for the person',
          text: 'Filter [people search](/features/people-search) by name, job title, company, seniority or department. Results show emails masked, like a****@n****.com, and searching is free.',
        },
        {
          title: 'Reveal the contact',
          text: `Select reveal on the result. It costs ${CREDIT_COSTS.REVEAL} credits in the web app, or ${CREDIT_COSTS.EXTENSION_REVEAL} from the Chrome extension.`,
        },
        {
          title: 'Read the result',
          text: 'You see the full address and whether it’s verified. The contact is now unlocked for your whole workspace, in search, lists, company profiles and CSV exports.',
        },
        {
          title: 'Check the address before you send',
          text: LIVE.emailVerification
            ? 'If it isn’t marked verified, run it through the [free email verifier](/tools/email-verifier) first.'
            : 'Reveals come back unverified today, so run the address through the [free email verifier](/tools/email-verifier) first.',
        },
      ],
    },
    { type: 'h2', text: 'Where does the email address come from?' },
    {
      type: 'p',
      text: 'From DataPit’s own contact records, which the DataPit team imports. When a record has no email, DataPit makes one guess from the person’s name and company domain.',
    },
    { type: 'dataCoverage' },
    {
      type: 'table',
      head: ['What DataPit holds', 'What the reveal returns', 'Are you charged?'],
      rows: [
        [
          'An email on file',
          'That address, with the verified flag it already carries.',
          `Yes: ${CREDIT_COSTS.REVEAL} credits in the app, ${CREDIT_COSTS.EXTENSION_REVEAL} from the extension.`,
        ],
        [
          'No email on file',
          LIVE.emailVerification
            ? 'One first.last@company-domain guess, checked by an email verification service.'
            : 'One first.last@company-domain guess, marked unverified.',
          LIVE.emailVerification
            ? 'Only if the verification service rates the guess deliverable.'
            : 'Yes, unless the guessed address is on the opt-out list.',
        ],
        [
          'A contact removed after an opt-out request',
          'Nothing. The reveal fails.',
          'No. The credits go back.',
        ],
        [
          'A contact your team already revealed',
          'The same address, straight away.',
          'No. It’s free.',
        ],
      ],
    },
    {
      type: 'p',
      text: 'For Jane Doe at acme.com, the guess is jane.doe@acme.com. DataPit tries only this one pattern. If the company uses another format, like jdoe@ or jane@, the guess will be wrong.',
    },
    { type: 'h2', text: 'What does the Verified badge mean?' },
    {
      type: 'p',
      text: 'Every reveal carries a verified flag. When it’s set, a Verified badge appears next to the address. The flag means an email verification service rated the address deliverable; imported records always arrive unverified.',
    },
    LIVE.emailVerification
      ? {
          type: 'p',
          text: 'DataPit checks a guessed address before it charges you. A guess the service rates deliverable gets the badge; any other result fails the reveal and returns your credits. Addresses already on file aren’t re-checked when you reveal them.',
        }
      : {
          type: 'p',
          text: 'Verification isn’t switched on in DataPit yet, so reveals currently come back unverified. Treat every revealed address as unchecked until you check it yourself.',
        },
    { type: 'h2', text: 'When do you get your credits back?' },
    {
      type: 'list',
      items: [
        'The contact no longer exists, or was redacted after an opt-out request.',
        'The guessed address is on DataPit’s opt-out list.',
        ...(LIVE.emailVerification
          ? ['The verification service doesn’t rate the guessed address deliverable.']
          : []),
        'The reveal fails with an error. If the server stops partway, the held credits return automatically within a few minutes.',
        'Two teammates reveal the same contact at the same moment. Only one reveal is charged.',
      ],
    },
    {
      type: 'p',
      text: 'An address that bounces later isn’t refunded. Check addresses before you send to them.',
    },
    { type: 'h2', text: 'How much does it cost to find an email?' },
    {
      type: 'table',
      head: ['Action', 'Credits'],
      rows: [
        ['Search and see masked results', 'Free'],
        ['Reveal a contact in the web app', String(CREDIT_COSTS.REVEAL)],
        ['Reveal a contact from the Chrome extension', String(CREDIT_COSTS.EXTENSION_REVEAL)],
        ['See a contact anyone on your team already revealed', 'Free'],
      ],
      note: `Credits come from your plan. The Free plan includes ${formatCount(FREE_PLAN_MONTHLY_CREDITS)} credits a month, enough for ${formatCount(Math.floor(FREE_PLAN_MONTHLY_CREDITS / CREDIT_COSTS.REVEAL))} reveals in the app. See [pricing](/pricing) for paid plans.`,
    },
    { type: 'h2', text: 'Does one reveal unlock the email for your whole team?' },
    {
      type: 'p',
      text: 'Yes. When anyone in your workspace reveals a contact, it’s unlocked for everyone on the team, in the app and the extension. Nobody pays for that contact again.',
    },
    {
      type: 'p',
      text: 'Credits are personal, so the reveal comes out of the balance of the teammate who made it.',
    },
    { type: 'h2', text: 'Can you find an email from a LinkedIn profile?' },
    {
      type: 'p',
      text: `Yes, with the free [DataPit — LinkedIn Lookup](${EXTENSION_STORE_URL}) Chrome extension. Open a linkedin.com/in/ profile and it checks the person against DataPit. If they’re in the database, reveal their email for ${CREDIT_COSTS.EXTENSION_REVEAL} credits, or for free if your team already has.`,
    },
    {
      type: 'p',
      text: 'If the person isn’t in DataPit, the profile is queued for the DataPit team to add. See [how the Chrome extension works](/chrome-extension).',
    },
    { type: 'h2', text: 'How do you check an email address before you send?' },
    {
      type: 'p',
      text: 'Use the [free email verifier](/tools/email-verifier). It checks the format, whether the domain exists and has mail servers, and whether the address is disposable or a role inbox like info@. It can’t confirm that the mailbox itself exists.',
    },
    {
      type: 'p',
      text: 'Remove invalid addresses and review risky ones before you send. Read [how to verify an email address](/blog/how-to-verify-an-email-address) for the full method.',
    },
    {
      type: 'faq',
      items: [
        {
          q: 'Is DataPit’s email finder free?',
          a: `Searching is free on every plan. Revealing an email costs ${CREDIT_COSTS.REVEAL} credits in the app or ${CREDIT_COSTS.EXTENSION_REVEAL} from the Chrome extension. The Free plan includes ${formatCount(FREE_PLAN_MONTHLY_CREDITS)} credits a month; [create a free account](/login?mode=register) to start.`,
        },
        {
          q: 'Does DataPit guess email addresses?',
          a: LIVE.emailVerification
            ? 'Only when it has no address on file. It then makes one first.last@company-domain guess and checks it with a verification service. If the service doesn’t rate it deliverable, the reveal fails and you aren’t charged.'
            : 'Only when it has no address on file. It then makes one first.last@company-domain guess, like jane.doe@acme.com, and tries no other patterns. The guess is marked unverified, and you’re charged for it unless it’s on the opt-out list.',
        },
        {
          q: 'Are the emails verified?',
          a: LIVE.emailVerification
            ? 'Guessed addresses are checked before you’re charged, and the result shows a Verified badge when the check passed. Addresses already on file keep the flag they came with.'
            : 'Not yet. Verification isn’t switched on, so reveals come back unverified. Check addresses with the [free email verifier](/tools/email-verifier) before you send.',
        },
        {
          q: 'Does a reveal include a phone number?',
          a: LIVE.phoneData
            ? 'Yes, when the contact’s record has one. The same reveal unlocks the email and the phone number. DataPit doesn’t search for phone numbers anywhere else.'
            : 'Not today. A reveal would unlock a phone number if the contact’s record had one, but DataPit’s records don’t include phone numbers yet.',
        },
        {
          q: 'What if the person isn’t in DataPit?',
          a: 'Search won’t find them, so there’s nothing to reveal. If you’re on their LinkedIn profile, the [Chrome extension](/chrome-extension) queues them for the DataPit team to add.',
        },
      ],
    },
    {
      type: 'related',
      items: [
        {
          label: 'People search',
          to: '/features/people-search',
          text: 'The filters, lists and CSV export.',
        },
        {
          label: 'Free email verifier',
          to: '/tools/email-verifier',
          text: 'Check an address before you send.',
        },
        {
          label: 'How to find someone’s email address',
          to: '/blog/how-to-find-someones-email-address',
          text: 'The methods, and what each one is good for.',
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
