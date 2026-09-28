import { DATAPIT_SUMMARY, LIVE, formatCount } from '../../../data/facts.js';
import { FREE_PLAN_MONTHLY_CREDITS } from '../../../data/plans.js';

const CHECKED = '2026-09-28';

// What DataPit's own reveals give you, so the advice below covers them too.
// With the verifier key set, only pattern guesses are checked at reveal
// (backend/src/services/revealService.js); emails already on file are not.
const DATAPIT_REVEALS = LIVE.emailVerification
  ? 'That includes DataPit: guessed addresses are checked by a verification service, but emails already on file aren’t re-checked when you reveal them.'
  : 'That includes DataPit: reveals come back unverified today, and some are a single first.last@ guess.';

export default {
  meta: {
    path: '/blog/email-bounce-rate',
    section: 'blog',
    name: 'Email bounce rate',
    title: 'Email Bounce Rate: What’s Good and How to Lower It | DataPit',
    description:
      'What a good email bounce rate is, how to calculate it, hard vs soft bounces, what pushes bounces up and how to lower yours with checks and list hygiene.',
    updated: '2026-09-28',
    published: true,
    station: 'crystals',
  },
  hero: {
    eyebrow: 'Guide',
    lines: ['Email bounce rate,', 'and how to lower it'],
    sub: 'Email bounce rate is the share of sent emails that come back undelivered: bounces divided by emails sent, times 100. Amazon SES advises keeping it below 2%, and Microsoft says no higher than 2%. Remove hard bounces at once, retry soft ones a few times, and check every address before you send.',
    primary: { label: 'Check an email free', to: '/tools/email-verifier' },
    secondary: { label: 'Start free', to: '/login?mode=register' },
  },
  blocks: [
    {
      type: 'callout',
      title: 'In short',
      text: 'Bounce rate is bounced emails divided by emails sent, times 100. The common target is under 2%, though providers count bounces differently. To lower yours, check addresses with the [free email verifier](/tools/email-verifier), send a small first batch and remove every hard bounce right away.',
    },

    { type: 'h2', text: 'What is an email bounce rate?' },
    {
      type: 'p',
      text: 'A bounce is an email the receiving server refused. It usually sends back a message with a reply code that says why. Your bounce rate is the share of a send that came back this way.',
    },
    {
      type: 'p',
      text: 'Bounce rate measures delivery, not inbox placement. An email that didn’t bounce may still have landed in spam. That’s why bounce rate is one signal among several, next to spam complaints and replies.',
    },

    { type: 'h2', text: 'What’s the difference between a hard bounce and a soft bounce?' },
    {
      type: 'p',
      text: 'The reply code tells you. RFC 5321 treats 5xx codes as permanent failures and 4xx codes as temporary ones. RFC 3463 adds detail codes, such as 5.1.1 for a mailbox that doesn’t exist.',
    },
    {
      type: 'table',
      caption: 'The three kinds of bounce, and what to do about each',
      head: ['Bounce', 'Typical code', 'Common causes', 'What to do'],
      rows: [
        [
          'Hard bounce',
          '5xx, such as 550 5.1.1',
          'The mailbox doesn’t exist, or the domain can’t accept mail.',
          'Remove the address now and never send to it again.',
        ],
        [
          'Soft bounce',
          '4xx, such as 421 or 452 4.2.2',
          'A full mailbox, a busy or offline server, or too many emails sent to that server in a short time.',
          'Let your tool retry. Remove the address if it keeps failing.',
        ],
        [
          'Block or policy bounce',
          'Often 5.7.x, such as 550 5.7.515',
          'Failed authentication, a poor sender reputation or content the server rejects.',
          'The address may be fine. Fix the cause before you send again.',
        ],
      ],
      note: 'Microsoft names 550 5.7.515 as its rejection code for high-volume mail to Outlook.com that fails its SPF, DKIM and DMARC requirements.',
    },
    {
      type: 'p',
      text: 'Providers don’t sort bounces the same way. Mailchimp counts a failed DMARC check and a domain that doesn’t exist as soft bounces. It treats an address as hard-bounced after 7 soft bounces, or up to 15 if the contact has engaged before.',
    },

    { type: 'h2', text: 'How do you calculate bounce rate?' },
    {
      type: 'p',
      text: 'Divide the emails that bounced by the emails you sent, then multiply by 100. Work out hard and soft bounces separately too, because they call for different fixes.',
    },
    {
      type: 'table',
      caption: 'Worked example: one send of 1,000 emails',
      head: ['Metric', 'Formula', 'Example'],
      rows: [
        ['Bounce rate', 'Bounced ÷ sent × 100', '20 bounces ÷ 1,000 × 100 = 2.0%'],
        ['Hard bounce rate', 'Hard bounces ÷ sent × 100', '12 ÷ 1,000 × 100 = 1.2%'],
        ['Soft bounce rate', 'Soft bounces ÷ sent × 100', '8 ÷ 1,000 × 100 = 0.8%'],
        ['Delivery rate', '(Sent − bounced) ÷ sent × 100', '980 ÷ 1,000 × 100 = 98.0%'],
      ],
      note: 'Tools differ on the details. Amazon SES counts only hard bounces toward the rate it enforces. It measures that rate over a “representative volume” of your mail, not a fixed period. Compare numbers from the same tool over time.',
    },

    { type: 'h2', text: 'What is a good email bounce rate?' },
    {
      type: 'p',
      text: 'There’s no single industry standard, and the published numbers don’t measure the same thing. Here’s what three sending platforms and one mailbox provider say.',
    },
    {
      type: 'table',
      head: ['Source', 'What it says', 'What it counts'],
      rows: [
        [
          'Amazon SES',
          'Keep it below 2%. At 5% or more, SES puts your account under review. At 10% or more, it may pause your sending.',
          'Hard bounces only, to domains you haven’t verified with SES.',
        ],
        [
          'Microsoft Dynamics 365',
          'In most cases, no higher than 2%. Its own platform’s acceptable threshold is up to 8%.',
          'Bounced emails divided by sent emails.',
        ],
        [
          'Mailchimp',
          'Suspends an account when a single send passes “industry thresholds”, but its help page gives no numbers.',
          'Bounces, unsubscribes and abuse complaints per send.',
        ],
        [
          'Yahoo',
          'Its sender pages give no bounce limit. They ask senders to monitor hard and soft bounces and remove invalid recipients promptly.',
          'Not stated.',
        ],
      ],
    },
    {
      type: 'p',
      text: 'The two sources that publish a target both put it at 2%, but they count differently and act at different levels. For cold email, aim lower still. Nobody on a cold list has confirmed their address with you.',
    },
    {
      type: 'p',
      text: 'Bounces aren’t the only number that matters. Gmail and Yahoo both require senders to keep spam complaints below 0.3%, and Google advises staying under 0.1%. See [cold email deliverability](/blog/cold-email-deliverability) for the full requirements.',
    },

    { type: 'h2', text: 'What causes a high bounce rate?' },
    {
      type: 'list',
      items: [
        '**Old data.** People change jobs, and companies rename or close domains. An address that worked last year can hard-bounce today.',
        '**Guessed addresses.** An address built from a name pattern, like first.last@company.com, can be wrong. Treat it as unconfirmed until it delivers.',
        '**Typos and fake entries.** A misspelled domain like gmial.com, a stray character or a throwaway inbox can bounce or go unread.',
        '**Bought or shared lists.** Amazon SES and Yahoo both tell senders not to buy lists. Nobody on them asked to hear from you, and Microsoft names bought lists as a cause of hard bounces.',
        '**Catch-all domains.** Some servers accept every address at first. The message may bounce later or never reach a person.',
        '**Sender problems.** Missing authentication, a poor reputation or a sudden jump in volume can get your mail blocked. Those bounces say nothing about the address.',
      ],
    },

    { type: 'h2', text: 'How do you lower your bounce rate?' },
    {
      type: 'steps',
      items: [
        {
          title: 'Check every address before you send',
          text: 'Check addresses one at a time with the [free email verifier](/tools/email-verifier). It checks the format, the domain, its MX records, and flags disposable and role addresses. It can’t confirm the mailbox exists, so a pass isn’t a promise.',
        },
        {
          title: 'Drop disposable addresses and replace role inboxes',
          text: 'Throwaway inboxes are temporary and rarely read. Swap addresses like info@ or sales@ for a named person where you can.',
        },
        {
          title: 'Send a small first batch',
          text: 'Send to part of a new or old list first and watch the bounces before you send the rest. Amazon SES advises mailing addresses you haven’t used lately only as a small portion of your sending.',
        },
        {
          title: 'Suppress hard bounces at once',
          text: 'Put every hard-bounced address on a suppression list so no tool sends to it again. Amazon SES tells senders to stop sending to bounced addresses immediately.',
        },
        {
          title: 'Limit soft-bounce retries',
          text: 'Give a soft bounce a few chances, since the cause is often temporary. Google suggests automatically unsubscribing recipients whose messages bounce repeatedly.',
        },
        {
          title: 'Authenticate your domain',
          text: 'Set up SPF, DKIM and DMARC so servers don’t block you for failing them. The [cold email deliverability guide](/blog/cold-email-deliverability) explains each record.',
        },
        {
          title: 'Keep your volume steady',
          text: 'Yahoo warns that a sudden spike in sending can get you flagged as a compromised sender. Microsoft advises sending regularly to groups of about the same size.',
        },
      ],
    },

    { type: 'h2', text: 'What does good list hygiene look like?' },
    {
      type: 'p',
      text: 'List hygiene is the routine that keeps bad addresses out before they bounce. It works best as a schedule, not a one-off clean-up.',
    },
    {
      type: 'list',
      items: [
        '**When an address comes in:** check the format and domain. On sign-up forms, Amazon SES suggests asking for the address twice and confirming it by email.',
        '**Before each send:** re-check addresses you haven’t mailed recently, and any that came from a new source.',
        '**After each send:** remove hard bounces and opt-outs, and review addresses that soft-bounced again.',
        '**Every month or quarter:** remove inactive and invalid addresses. Microsoft gives this interval in its advice to high-volume Outlook.com senders.',
        '**For cold lists:** note where each address came from and when you last checked it, so you know what to re-verify.',
      ],
    },
    {
      type: 'p',
      text: `Addresses from any data provider can be wrong or out of date. ${DATAPIT_REVEALS} Check them before you send.`,
    },
    {
      type: 'p',
      text: 'The cleanest lists start with the right people. See [how to build a B2B prospect list](/blog/how-to-build-a-b2b-prospect-list) and [how to verify an email address](/blog/how-to-verify-an-email-address).',
    },

    {
      type: 'faq',
      items: [
        {
          q: 'What is a good bounce rate for cold email?',
          a: 'Under 2%, the level Amazon SES and Microsoft both publish, and lower if you can. Cold lists haven’t been confirmed by the people on them, so check every address and send a test batch first.',
        },
        {
          q: 'Is a 5% bounce rate bad?',
          a: 'Yes. It’s well above the 2% Amazon SES and Microsoft advise, and Amazon SES puts an account under review at 5%. Pause sending, find where the bad addresses came from and clean the list before you continue.',
        },
        {
          q: 'Should I remove an address after one soft bounce?',
          a: 'No. The cause is often temporary, like a full mailbox or a busy server, so let your tool retry. Remove the address if it keeps soft-bouncing across several sends.',
        },
        {
          q: 'Does verifying my list stop all bounces?',
          a: 'No. A verifier like ours confirms the format, the domain and its mail servers, but not that the mailbox exists. Catch-all domains and people who have left their jobs can still bounce.',
        },
        {
          q: 'Do bounces hurt sender reputation?',
          a: 'Yes. Amazon SES notes that mailbox providers and anti-spam groups use high bounce rates to spot bad sending practices. That can send your mail to spam rather than the inbox.',
        },
      ],
    },
    {
      type: 'cta',
      title: 'Check addresses before you send',
      text: `The free email verifier needs no sign-up. ${DATAPIT_SUMMARY} The Free plan includes ${formatCount(FREE_PLAN_MONTHLY_CREDITS)} credits a month.`,
      primary: { label: 'Check an email free', to: '/tools/email-verifier' },
      secondary: { label: 'Start free', to: '/login?mode=register' },
    },
    {
      type: 'related',
      items: [
        {
          label: 'Free email verifier',
          to: '/tools/email-verifier',
          text: 'Format, domain, MX, disposable and role checks.',
        },
        {
          label: 'How to verify an email address',
          to: '/blog/how-to-verify-an-email-address',
          text: 'Six checks, and what each one can’t tell you.',
        },
        {
          label: 'Cold email deliverability',
          to: '/blog/cold-email-deliverability',
          text: 'SPF, DKIM, DMARC and the Gmail and Yahoo rules.',
        },
        {
          label: 'How to build a B2B prospect list',
          to: '/blog/how-to-build-a-b2b-prospect-list',
          text: 'Start from the right people, then check the addresses.',
        },
      ],
    },
    {
      type: 'sources',
      items: [
        {
          label: 'Amazon SES Developer Guide: Enforcement FAQs (bounce FAQ)',
          url: 'https://docs.aws.amazon.com/ses/latest/dg/faqs-enforcement.html',
          checked: CHECKED,
        },
        {
          label: 'Microsoft Learn: Fix a high email bounce rate (Dynamics 365 Customer Insights)',
          url: 'https://learn.microsoft.com/en-us/dynamics365/customer-insights/journeys/fix-high-bounce-rate',
          checked: CHECKED,
        },
        {
          label: 'Mailchimp: Soft vs. Hard Bounces',
          url: 'https://mailchimp.com/help/soft-vs-hard-bounces/',
          checked: CHECKED,
        },
        {
          label: 'Mailchimp: About Bounce Suspension',
          url: 'https://mailchimp.com/help/about-bounce-suspension/',
          checked: CHECKED,
        },
        {
          label: 'Gmail Help: Email sender guidelines',
          url: 'https://support.google.com/mail/answer/81126?hl=en',
          checked: CHECKED,
        },
        {
          label: 'Yahoo Sender Hub: Sender Requirements & Recommendations',
          url: 'https://senders.yahooinc.com/best-practices/',
          checked: CHECKED,
        },
        {
          label: 'Yahoo Sender Hub: FAQs',
          url: 'https://senders.yahooinc.com/faqs/',
          checked: CHECKED,
        },
        {
          label: 'Microsoft: Outlook’s new requirements for high-volume senders',
          url: 'https://techcommunity.microsoft.com/blog/microsoftdefenderforoffice365blog/strengthening-email-ecosystem-outlook%E2%80%99s-new-requirements-for-high%E2%80%90volume-senders/4399730',
          checked: CHECKED,
        },
        {
          label: 'RFC 5321: Simple Mail Transfer Protocol',
          url: 'https://www.rfc-editor.org/rfc/rfc5321.html',
          checked: CHECKED,
        },
        {
          label: 'RFC 3463: Enhanced Mail System Status Codes',
          url: 'https://www.rfc-editor.org/rfc/rfc3463.html',
          checked: CHECKED,
        },
      ],
    },
  ],
};
