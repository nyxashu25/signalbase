import { CREDIT_COSTS, LIVE, formatCount } from '../../../data/facts.js';
import { FREE_PLAN_MONTHLY_CREDITS, FREE_SEAT_MONTHLY_CREDITS, PLANS } from '../../../data/plans.js';

// Hidden until sequence emails are really delivered (LIVE.sequenceSending):
// today sends are simulated. Written from the sequence engine as built
// (backend sequenceService.js, sequenceValidators.js, suppressionService.js,
// webhookService.js); review the "What can't sequences do yet?" list when
// any of those limits is lifted.

const ENROLL = CREDIT_COSTS.SEQUENCE_ENROLLMENT;
const PAID_PLANS = PLANS.filter((p) => p.block);
const BASIC_PRICE = PLANS.find((p) => p.key === 'BASIC').price;
const PAID_PLAN_NAMES = `${PAID_PLANS.slice(0, -1)
  .map((p) => p.name)
  .join(', ')} and ${PAID_PLANS[PAID_PLANS.length - 1].name}`;
const enrollments = (credits) => formatCount(Math.floor(credits / ENROLL));

export default {
  meta: {
    path: '/features/sequences',
    section: 'features',
    name: 'Email sequences',
    title: 'Email Sequences for Cold Outreach | DataPit',
    description: `Build email sequences from email and wait steps, enroll contacts from your lists, and pause or resume anyone. On every paid plan, ${ENROLL} credits per contact.`,
    updated: '2026-09-28',
    published: LIVE.sequenceSending,
    station: 'lens',
  },
  hero: {
    eyebrow: 'Email sequences',
    lines: ['Email sequences', 'with wait steps'],
    sub: `A DataPit sequence is a series of email and wait steps. Build it once, activate it, then enroll the contacts on a people list. Enrolling costs ${ENROLL} credits per contact. DataPit sends each email step when it’s due and unenrolls contacts on your suppression list. Sequences come with every paid plan.`,
  },
  blocks: [
    {
      type: 'callout',
      title: 'In short',
      text: `Build a sequence of email and wait steps, activate it and enroll contacts. Each enrollment costs ${ENROLL} credits and covers every step, so the emails cost nothing more. Before each email, DataPit unenrolls contacts who are suppressed or have no email on file.`,
    },
    { type: 'h2', text: 'How do you build an email sequence in DataPit?' },
    {
      type: 'steps',
      items: [
        {
          title: 'Add your steps',
          text: 'Name the sequence and add email and wait steps in any order. An email step needs a subject and a plain-text body. A wait step needs a number of whole days.',
        },
        {
          title: 'Activate the sequence',
          text: 'A new sequence starts as a draft. Activate it before you enroll anyone.',
        },
        {
          title: 'Enroll contacts',
          text: `Pick a people list and enroll everyone on it. To enroll one person, add them to a list first. Each enrollment costs ${ENROLL} credits.`,
        },
        {
          title: 'Let it run',
          text: 'DataPit checks for due steps every minute. It sends each email when it’s due and holds each contact for the waits you set.',
        },
      ],
    },
    { type: 'h2', text: 'What steps can a sequence have?' },
    {
      type: 'table',
      head: ['Step', 'What it does', 'What you set'],
      rows: [
        ['Email', 'Sends one plain-text email to the contact.', 'A subject and a body.'],
        ['Wait', 'Holds the contact before their next step.', 'A whole number of days, 1 or more.'],
      ],
    },
    {
      type: 'p',
      text: 'A sequence needs at least one step. After an email step, the next step is due straight away. Put a wait between two emails, or they go out about a minute apart.',
    },
    { type: 'h2', text: 'How do you enroll contacts from a list?' },
    {
      type: 'p',
      text: 'Open the sequence, choose a people list and enroll it. DataPit enrolls each contact in turn and tells you how many were enrolled and how many were skipped.',
    },
    {
      type: 'p',
      text: 'If your credits run out partway, enrollment stops there. Contacts already in the sequence are skipped and not charged. Build the lists with [people search](/features/people-search).',
    },
    { type: 'h2', text: 'What does it cost to enroll a contact?' },
    {
      type: 'p',
      text: `${ENROLL} credits per contact, charged when you enroll them. That covers every step in the sequence; sending the emails costs no credits.`,
    },
    {
      type: 'p',
      text: 'A contact with no email on file is still charged. They’re unenrolled without a refund when their first email step comes due. Filter people search by email status and leave out contacts marked not found.',
    },
    { type: 'h2', text: 'Which plans include sequences?' },
    {
      type: 'table',
      head: ['Plan', 'Sequences', 'Credits per paid seat a month', 'Enrollments those credits cover'],
      rows: PLANS.map((p) =>
        p.block
          ? [p.name, 'Yes', formatCount(p.block.paidSeatCredits), enrollments(p.block.paidSeatCredits)]
          : [p.name, 'Not included', `${formatCount(FREE_PLAN_MONTHLY_CREDITS)} (one seat)`, 'None'],
      ),
      note: `Free seats on paid plans earn ${formatCount(FREE_SEAT_MONTHLY_CREDITS)} credits a month, enough for ${enrollments(FREE_SEAT_MONTHLY_CREDITS)} enrollments. The same credits pay for reveals, company profiles and exports. See [pricing](/pricing).`,
    },
    { type: 'h2', text: 'How does the suppression list work?' },
    {
      type: 'p',
      text: 'Each workspace has its own suppression list. Before every email step, DataPit checks the contact’s address against it. If the address is on the list, the contact is unenrolled instead of emailed.',
    },
    {
      type: 'p',
      text: 'Addresses join the list only when a bounce or an unsubscribe is reported back to DataPit. You can’t add or upload addresses by hand yet.',
    },
    {
      type: 'p',
      text: 'DataPit doesn’t add an unsubscribe link to sequence emails. Write an opt-out line into each email, and unenroll anyone who asks you to stop.',
    },
    { type: 'h2', text: 'What happens when a contact replies?' },
    {
      type: 'p',
      text: 'Replies go to DataPit’s sending address, not your inbox, and DataPit doesn’t read them. When a reply is reported back to DataPit, the contact is unenrolled and gets no more steps.',
    },
    {
      type: 'p',
      text: 'Otherwise the sequence carries on. Unenroll anyone who answers from the sequence page.',
    },
    { type: 'h2', text: 'Can you pause or resume a contact?' },
    {
      type: 'p',
      text: 'Yes, on every paid plan. You can pause, resume or unenroll each enrolled contact from the sequence page.',
    },
    {
      type: 'p',
      text: 'Resuming makes the contact’s next step due right away. If you paused them during a wait, the rest of that wait is skipped.',
    },
    { type: 'h2', text: 'What do sequence analytics show?' },
    {
      type: 'p',
      text: 'Each sequence shows how many contacts are active, paused, completed or unenrolled. It totals sends, opens, clicks, bounces, replies and unsubscribes, with open, click, reply and bounce rates for the sequence and for each step.',
    },
    {
      type: 'p',
      text: 'A workspace analytics tab rolls up every sequence. DataPit counts sends itself. Opens, clicks, bounces, replies and unsubscribes count only when they’re reported back to DataPit.',
    },
    { type: 'h2', text: 'What can’t sequences do yet?' },
    {
      type: 'list',
      items: [
        '**Merge fields.** Every contact gets the same subject and body, so write emails that read well without a first name.',
        '**Your own mailbox.** Emails go out as plain text from DataPit’s sending address, not from your Gmail or Outlook account. Replies go to that address too.',
        '**Reading replies.** DataPit doesn’t connect to an inbox, so it can’t spot a reply by itself.',
        '**An automatic unsubscribe link.** Add your own opt-out line to each email.',
        '**Editing after saving.** Steps are fixed once a sequence is saved. To change them, create a new sequence.',
        '**Manual suppression.** The suppression list fills only from bounces and unsubscribes the sending service reports.',
        '**Pausing a whole sequence.** Pause works per contact.',
      ],
    },
    {
      type: 'faq',
      items: [
        {
          q: 'Which DataPit plans include sequences?',
          a: `${PAID_PLAN_NAMES}. On the Free plan you can’t create, activate or enroll contacts into sequences. Pause, resume and analytics work on every paid plan.`,
        },
        {
          q: 'Do sequence emails cost credits?',
          a: `No. Only enrollment costs credits: ${ENROLL} per contact, which covers every step in the sequence.`,
        },
        {
          q: 'Can I send from my own Gmail or Outlook account?',
          a: 'Not yet. Sequence emails go out as plain text from DataPit’s sending address, and replies go to that address.',
        },
        {
          q: 'Can I enroll the same contact twice?',
          a: 'Not in the same sequence, even after they’ve been unenrolled. A second enrollment is refused and not charged. The same contact can be enrolled in a different sequence.',
        },
        {
          q: 'Can I edit a sequence after saving it?',
          a: 'No. Steps are fixed once a sequence is saved. Create a new sequence with the changes and enroll contacts into that one.',
        },
      ],
    },
    {
      type: 'related',
      items: [
        {
          label: 'People search',
          to: '/features/people-search',
          text: 'Find the people to enroll and save them to lists.',
        },
        {
          label: 'Cold email follow-ups',
          to: '/blog/cold-email-follow-ups',
          text: 'How many to send, and how far apart.',
        },
        {
          label: 'Free email verifier',
          to: '/tools/email-verifier',
          text: 'Check addresses before you enroll them.',
        },
        {
          label: 'Pricing',
          to: '/pricing',
          text: `Sequences on every paid plan, from $${BASIC_PRICE} a month.`,
        },
      ],
    },
  ],
};
