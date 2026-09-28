import { FREE_PLAN_MONTHLY_CREDITS } from '../../../data/plans.js';
import { formatCount } from '../../../data/facts.js';

// Mirrors the rate limit on POST /api/v1/public/tools/verify-email
// (backend/src/routes/publicTools.js).
const CHECKS_PER_HOUR = 20;

export default {
  meta: {
    path: '/tools/email-verifier',
    section: 'tools',
    name: 'Free email verifier',
    title: 'Free Email Verifier and Email Checker | DataPit',
    description:
      'Check any email address for free: format, domain, mail server, disposable and role addresses. No sign-up, and we don’t store what you check.',
    updated: '2026-09-28',
    published: true,
    station: 'reveal',
  },
  tool: 'email-verifier',
  hero: {
    eyebrow: 'Free tool',
    lines: ['Free email', 'verifier'],
    sub: 'Check any email address for free, with no sign-up. The verifier checks the format, the domain and its mail server. It also flags disposable addresses and role addresses like info@. It can’t confirm that the mailbox itself exists. We don’t store the addresses you check.',
  },
  blocks: [
    {
      type: 'callout',
      title: 'In short',
      text: `Enter an address and select **Check email**. You get a verdict of valid, risky or invalid, the six checks behind it and the domain’s mail servers. You can run ${CHECKS_PER_HOUR} checks an hour for free.`,
    },
    { type: 'h2', text: 'What does each check mean?' },
    {
      type: 'table',
      head: ['Check', 'What it tests', 'Effect on the verdict'],
      rows: [
        [
          'Format',
          'The address is written correctly: a name, one @ and a domain.',
          'Invalid if it fails. Nothing can be delivered to it.',
        ],
        [
          'Domain',
          'The domain after the @ exists in DNS.',
          'Invalid if it fails. The domain is misspelled or no longer registered.',
        ],
        [
          'Mail server',
          'The domain publishes MX records, the servers that accept its email.',
          'Risky if it fails: the domain exists but isn’t set up to receive email. Invalid if the domain publishes a record saying it accepts no email.',
        ],
        [
          'Disposable',
          'The domain belongs to a throwaway email service.',
          'Risky if it matches. These inboxes are temporary and rarely read.',
        ],
        [
          'Role address',
          'The name before the @ is a shared inbox, like info@, sales@ or support@.',
          'Risky if it matches. It reaches a team or a queue, not one person.',
        ],
        [
          'Free provider',
          'The domain is a free provider, like Gmail, Outlook or Yahoo.',
          'A note only. It doesn’t change the verdict.',
        ],
      ],
      note: 'An address is **valid** when it passes every check. If the domain can’t be looked up in time, the result is **risky** and the note says so.',
    },
    { type: 'h2', text: 'What can’t the verifier tell you?' },
    {
      type: 'list',
      items: [
        '**Whether the mailbox exists.** Only the receiving mail server knows. Asking it means opening an SMTP connection, and many servers refuse to answer or accept every address. We don’t probe mail servers.',
        '**Whether a catch-all domain will deliver.** Some domains accept mail for any name, real or not. An address there can pass every check and still never reach a person.',
        '**Whether the person still works there.** A valid result means the domain accepts email, not that the address belongs to the person you want.',
      ],
    },
    { type: 'h2', text: 'How should you use the results before sending cold email?' },
    {
      type: 'steps',
      items: [
        {
          title: 'Remove the invalid addresses',
          text: 'They will bounce, and a high bounce rate hurts your sending reputation with mailbox providers.',
        },
        {
          title: 'Review the risky ones',
          text: 'Leave out disposable addresses. Swap role addresses for a named person where you can. Check domains that timed out again later.',
        },
        {
          title: 'Send to valid addresses in small batches',
          text: 'Valid still isn’t proof the mailbox exists. Start small, watch your bounce rate and pause if it climbs.',
        },
        {
          title: 'Prefer addresses with a known source',
          text: 'A guessed address is the riskiest kind. [Find contacts in DataPit](/features/email-finder) instead of guessing from a pattern.',
        },
      ],
    },
    {
      type: 'faq',
      items: [
        {
          q: 'Is the email verifier free?',
          a: `Yes. You can check ${CHECKS_PER_HOUR} addresses an hour for free, with no account. To find and reveal contacts, [create a free DataPit account](/login?mode=register); the Free plan includes ${formatCount(FREE_PLAN_MONTHLY_CREDITS)} credits a month.`,
        },
        {
          q: 'Do you store the email addresses I check?',
          a: 'No. We look up the domain’s DNS records and send you the result. The address isn’t saved, logged or added to DataPit.',
        },
        {
          q: 'Why is my address marked risky?',
          a: 'Risky means the address might receive mail, but sending to it is a gamble. The domain has no mail server, the address is disposable or a role inbox, or the domain couldn’t be checked in time. The result card says which.',
        },
        {
          q: 'Can the verifier confirm that a mailbox exists?',
          a: 'No. Only the receiving mail server knows that, and many servers block the checks or accept every address. We don’t probe mail servers at all. A valid result means the domain can receive email, not that this inbox exists.',
        },
        {
          q: 'How many addresses can I check?',
          a: `${CHECKS_PER_HOUR} an hour from one connection. After that, the tool tells you how long to wait before the next check.`,
        },
      ],
    },
    {
      type: 'related',
      items: [
        {
          label: 'Email finder',
          to: '/features/email-finder',
          text: 'Find a person’s work email in DataPit.',
        },
        {
          label: 'How to verify an email address',
          to: '/blog/how-to-verify-an-email-address',
          text: 'The checks, their limits and what to do with the results.',
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
