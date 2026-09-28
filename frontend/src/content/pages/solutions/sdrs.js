import { CREDIT_COSTS, LIVE, formatCount } from '../../../data/facts.js';
import { FREE_SEAT_MONTHLY_CREDITS, findPlan } from '../../../data/plans.js';

// The SDR workflow ends in a sequence, so this page stays hidden (noindex, off
// the sitemap) until sequence emails are really delivered. The copy below is
// still written to be true in both states. Recheck the "limits" list when
// LIVE.sequenceSending flips: it describes the sender as it is on 2026-09-28.
const SENDING = LIVE.sequenceSending;

const BASIC = findPlan('BASIC');
const PRO = findPlan('PROFESSIONAL');
const ORG = findPlan('ORGANIZATION');
const PAID_NAMES = `${BASIC.name}, ${PRO.name} or ${ORG.name}`;
const ENROLL = CREDIT_COSTS.SEQUENCE_ENROLLMENT;
const enrollments = (credits) => formatCount(Math.floor(credits / ENROLL));

const verifiedAnswer = LIVE.emailVerification
  ? 'Guessed addresses are. When DataPit has no address on file, it builds one from the person’s name and company domain and checks it with an email verifier. A rejected guess is refunded, and each reveal shows whether the address was verified.'
  : 'Not yet. A reveal returns the email on file, or a first.last@company-domain guess when there isn’t one, marked as unverified. Check important addresses with the [free email verifier](/tools/email-verifier) before you send.';

const buildSteps = [
  {
    title: 'Filter for your target persona',
    text: 'Combine job title, seniority and department with the company’s industry and location. Searching is free, and contact details stay masked.',
  },
  {
    title: 'Save the search',
    text: 'A saved search replays your filters, so tomorrow’s session starts from the same place.',
  },
  {
    title: 'Reveal the contacts you’ll email',
    text: `A reveal costs ${CREDIT_COSTS.REVEAL} credits and shows the work email. Contacts a teammate already revealed are free.`,
  },
  {
    title: 'Add them to a list',
    text: 'Put the revealed contacts in a contacts list for the campaign.',
  },
];

const workSteps = SENDING
  ? [
      {
        title: 'Write the sequence',
        text: 'Add email steps, each with a subject and a plain-text body, and wait steps of one or more whole days. Arrange them in any order.',
      },
      {
        title: 'Enroll the list',
        text: `Enrolling costs ${ENROLL} credits per contact, charged when you enroll. DataPit enrolls the list one contact at a time and stops if you run out of credits.`,
      },
      {
        title: 'Watch the sequence and step in',
        text: 'The sequence page shows how many contacts are active, paused, completed or unenrolled. Pause, resume or unenroll anyone by hand.',
      },
    ]
  : [
      {
        title: 'Export the list',
        text: `Export the list as a CSV for ${CREDIT_COSTS.CSV_EXPORT} credits per file and load it into the tool you send from. DataPit sequences don’t deliver email yet.`,
      },
    ];

export default {
  meta: {
    path: '/solutions/sdrs',
    section: 'solutions',
    name: 'SDRs',
    title: 'Prospecting and Outreach Tool for SDRs | DataPit',
    description: SENDING
      ? `Build a prospect list, reveal work emails for ${CREDIT_COSTS.REVEAL} credits and run email sequences with wait steps from one DataPit workspace, on paid plans.`
      : `Build a prospect list and reveal work emails for ${CREDIT_COSTS.REVEAL} credits each in DataPit. Sequence sending isn’t switched on yet.`,
    updated: '2026-09-28',
    published: LIVE.sequenceSending,
    station: 'crystals',
  },
  hero: {
    eyebrow: 'For SDRs',
    lines: ['Build the list,', 'then work it'],
    sub: SENDING
      ? `DataPit gives SDRs one place to build a prospect list, reveal work emails and send a sequence. Search people for free, reveal the ones you’ll email for ${CREDIT_COSTS.REVEAL} credits each, then enroll them in a sequence of email and wait steps. Sequences are on every paid plan and cost ${ENROLL} credits per contact enrolled.`
      : `DataPit gives SDRs one place to build a prospect list and reveal work emails. Search people for free, save the search and reveal the ones you’ll contact for ${CREDIT_COSTS.REVEAL} credits each. Sequences with email and wait steps are built, but sending isn’t switched on yet, so they don’t deliver email today.`,
  },
  blocks: [
    {
      type: 'callout',
      title: 'In short',
      text: SENDING
        ? `Filter people by title, seniority and department, and save the search. Reveal the contacts you’ll email, add them to a list and enroll the list in a sequence. Enrollment costs ${ENROLL} credits per contact, so enroll only the people you’re sure about.`
        : 'Filter people by title, seniority and department, save the search, and reveal the contacts you’ll email. Keep them in a list and export it as a CSV for your sending tool. DataPit sequences don’t deliver email yet.',
    },
    { type: 'h2', text: 'How does an SDR build and work a list in DataPit?' },
    { type: 'steps', items: [...buildSteps, ...workSteps] },
    { type: 'h2', text: 'What should you know before enrolling contacts?' },
    {
      type: 'list',
      items: [
        ...(SENDING ? [] : ['**Sending isn’t on yet.** Sequence emails are not delivered today, so don’t enroll contacts you expect to reach.']),
        `**Enrollment is charged up front.** Each contact costs ${ENROLL} credits when you enroll them, whatever happens next.`,
        '**Reveal before you enroll.** A contact with no email on file is dropped at the first email step, and the enrollment isn’t refunded.',
        '**Plain text from one sender.** Emails go out as plain text from DataPit’s sending address. There’s no Gmail or Outlook mailbox connection yet.',
        '**No merge fields yet.** Every contact gets each step exactly as written, so write copy that works without a first name.',
        '**No automatic unsubscribe link.** Add your own opt-out line to each email, and unenroll anyone who asks.',
        '**DataPit doesn’t read your inbox.** When someone replies, pause or unenroll them yourself.',
      ],
    },
    { type: 'h2', text: 'What does DataPit cost for an SDR team?' },
    {
      type: 'p',
      text: `Sequences need a paid plan: ${PAID_NAMES}. Search, reveals, lists and CSV export work on the Free plan too.`,
    },
    {
      type: 'table',
      head: ['Action', 'Credits'],
      rows: [
        ['Search people and companies', 'Free'],
        ['Reveal a contact in the web app', String(CREDIT_COSTS.REVEAL)],
        ['Reveal a contact from the Chrome extension', String(CREDIT_COSTS.EXTENSION_REVEAL)],
        ['Open a contact a teammate already revealed', 'Free'],
        ['Open a company’s full profile', `${CREDIT_COSTS.COMPANY_VIEW}, the first time your workspace opens it`],
        ['Export a search or list as a CSV, up to 5,000 rows', `${CREDIT_COSTS.CSV_EXPORT} per file`],
        ['Enroll a contact in a sequence', formatCount(ENROLL)],
      ],
    },
    {
      type: 'p',
      text: `At ${ENROLL} credits per contact, a ${PRO.name} seat’s ${formatCount(PRO.block.paidSeatCredits)} monthly credits cover ${enrollments(PRO.block.paidSeatCredits)} enrollments. A free seat’s ${formatCount(FREE_SEAT_MONTHLY_CREDITS)} cover ${enrollments(FREE_SEAT_MONTHLY_CREDITS)}. Enroll the contacts you’re sure about, and buy extra credits from Billing when a campaign needs more.`,
    },
    {
      type: 'faq',
      items: [
        {
          q: 'Do I need a paid plan for sequences?',
          a: `Yes. Creating, activating and enrolling sequences needs ${PAID_NAMES}. Search, reveals, lists and CSV export work on every plan.`,
        },
        {
          q: 'Are sequence emails sent from my own mailbox?',
          a: SENDING
            ? 'No. They go out as plain text from DataPit’s sending address. Connecting Gmail or Outlook isn’t available yet.'
            : 'No, and they aren’t delivered at all yet. Sequence sending isn’t switched on, so export your contacts and send from your own tool for now.',
        },
        {
          q: 'What happens when a contact replies?',
          a: 'DataPit doesn’t read your inbox. Pause or unenroll the contact from the sequence page so they get no more steps.',
        },
        {
          q: 'Can I write the emails in DataPit?',
          a: `Yes. Each email step has a subject and a plain-text body, with no merge fields${SENDING ? ', and every contact gets it exactly as written' : ''}. For ideas, see our [cold email templates](/blog/cold-email-templates) and [follow-up guide](/blog/cold-email-follow-ups).`,
        },
        { q: 'Are revealed emails verified?', a: verifiedAnswer },
      ],
    },
    {
      type: 'related',
      items: [
        { label: 'Cold email templates', to: '/blog/cold-email-templates', text: 'First emails you can adapt for your list.' },
        { label: 'Cold email follow-ups', to: '/blog/cold-email-follow-ups', text: 'How many follow-ups to send, and when.' },
        { label: 'Account executives', to: '/solutions/account-executives', text: 'Finding the right people at one target account.' },
        { label: 'Sales leaders', to: '/solutions/sales-leaders', text: 'Seats, shared reveals and the team credit audit.' },
        { label: 'People search', to: '/features/people-search', text: 'Every filter, and what each one matches.' },
        { label: 'Pricing', to: '/pricing', text: `Seat blocks from $${BASIC.price} a month, and a free plan.` },
      ],
    },
  ],
};
