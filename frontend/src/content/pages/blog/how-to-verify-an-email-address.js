const CHECKED = '2026-09-28';

export default {
  meta: {
    path: '/blog/how-to-verify-an-email-address',
    section: 'blog',
    name: 'How to verify an email address',
    title: 'How to Verify an Email Address: 6 Checks | DataPit',
    description:
      'Check if an email is valid: syntax, domain, MX records, disposable and role addresses, SMTP mailbox checks and their limits, and what bounces tell you.',
    updated: '2026-09-28',
    published: true,
    station: 'crystals',
  },
  hero: {
    eyebrow: 'Guide',
    lines: ['How to verify', 'an email address'],
    sub: 'To check if an email address is valid, confirm it’s written correctly, its domain exists and it has MX records to accept mail. Then flag disposable and role addresses. No outside check can prove the mailbox exists, because catch-all servers and greylisting hide the answer, so only a real send settles it.',
    primary: { label: 'Check an email free', to: '/tools/email-verifier' },
    secondary: { label: 'Start free', to: '/login?mode=register' },
  },
  blocks: [
    {
      type: 'callout',
      title: 'In short',
      text: 'Paste the address into the [free DataPit email verifier](/tools/email-verifier). It checks the format, the domain, its MX records, and whether the address is disposable or a role inbox. A pass means the domain can receive mail, not that this mailbox exists, so send in small batches and remove hard bounces.',
    },

    { type: 'h2', text: 'What does verifying an email address actually check?' },
    {
      type: 'p',
      text: 'Verification answers three questions: is the address written correctly, can its domain receive email, and does this exact mailbox exist? The address itself and public DNS records answer the first two. Only the receiving mail server knows the third, and many won’t say.',
    },
    {
      type: 'table',
      caption: 'What each check can and can’t tell you',
      head: ['Check', 'What it tells you', 'How far to trust it'],
      rows: [
        ['Syntax', 'The address is written correctly and could exist.', 'Fully. A malformed address can’t receive mail.'],
        ['Domain', 'The domain after the @ exists in DNS.', 'Fully, unless the lookup times out.'],
        ['MX records', 'The domain names the servers that accept its email.', 'Highly. Without them, delivery is unlikely.'],
        ['Disposable', 'The domain is a throwaway inbox service.', 'Well, as long as the list is kept current.'],
        ['Role address', 'The address reaches a team, like sales@, not a person.', 'Highly. It’s read from the name itself.'],
        ['Mailbox (SMTP)', 'The mail server accepts this exact recipient.', 'Often inconclusive, for the reasons below.'],
        ['A real send', 'The message was delivered or bounced.', 'The final word on delivery, not on who reads it.'],
      ],
      note: 'The [free email verifier](/tools/email-verifier) runs the first five checks. It deliberately doesn’t probe mail servers, so it can’t confirm that a mailbox exists.',
    },

    { type: 'h2', text: 'How do you check if an email address is valid?' },
    {
      type: 'steps',
      items: [
        {
          title: 'Check the syntax',
          text: 'A valid address has one @, a name before it and a domain after it. Under RFC 5321, the part before the @ can be up to 64 characters. Look for spaces, two dots in a row and typos like gmial.com or .con.',
        },
        {
          title: 'Confirm the domain exists',
          text: 'Look the domain up in DNS. If it doesn’t resolve, it’s misspelled, expired or never existed, and nothing can be delivered to it.',
        },
        {
          title: 'Look up the MX records',
          text: 'MX records name the servers that accept mail for the domain. A domain with a “null MX” record, defined in RFC 7505, is declaring that it accepts no email at all.',
        },
        {
          title: 'Flag disposable addresses',
          text: 'Temporary inbox services hand out addresses that expire after minutes or days. Compare the domain against a maintained list of disposable providers, and drop matches from sales lists.',
        },
        {
          title: 'Flag role addresses',
          text: 'Names like info@, sales@ and support@ reach a shared inbox, not one person. RFC 2142 defines several of them, including postmaster@ and abuse@, which exist for operations and complaints.',
        },
        {
          title: 'Decide how to test the mailbox',
          text: 'You can ask the mail server directly with an SMTP check, or send a real message and watch for a bounce. Both have limits, covered below.',
        },
      ],
    },

    { type: 'h2', text: 'How do you look up a domain’s MX records?' },
    {
      type: 'p',
      text: 'You don’t need a tool. On Windows, open a command prompt and run **nslookup -type=mx example.com**. On macOS or Linux, run **dig example.com MX +short**.',
    },
    {
      type: 'p',
      text: 'Each result is a mail server with a priority number, and senders try the lowest number first. The host names often show the provider. Servers ending in google.com mean Google Workspace, and mail.protection.outlook.com means Microsoft 365.',
    },
    {
      type: 'p',
      text: 'No MX records at all is a warning sign. RFC 5321 lets senders fall back to the domain’s own address, but a domain set up for email normally publishes MX records. The DataPit verifier marks these addresses risky.',
    },

    { type: 'h2', text: 'What are disposable and role email addresses?' },
    {
      type: 'p',
      text: 'A disposable address comes from a service that creates temporary inboxes, often for a single sign-up. It may stop working within hours, and nobody is waiting to read your message. In a sales list, it usually marks a fake or throwaway entry.',
    },
    {
      type: 'p',
      text: 'A role address belongs to a function rather than a person: info@, sales@, support@, billing@. It can be a good place to ask a question. For one-to-one outreach it’s a weak target, because it lands in a shared queue.',
    },
    {
      type: 'p',
      text: 'Addresses at free providers such as Gmail or Outlook.com are real and can be perfectly valid. For B2B outreach, they tell you the address is personal rather than tied to a company.',
    },

    { type: 'h2', text: 'Can you verify an email address without sending an email?' },
    {
      type: 'p',
      text: 'Partly. Beyond DNS, the only way to test a mailbox is to ask its mail server. An SMTP check connects to the domain’s MX server, starts a message to the address, then hangs up before sending anything.',
    },
    {
      type: 'p',
      text: 'If the server answers with a 250 code, it accepted the recipient. A 550 reply means the mailbox is unavailable. SMTP also has a VRFY command for this, but sites may disable it, and a disabled server must answer 252, which confirms nothing.',
    },
    { type: 'h3', text: 'Why are SMTP mailbox checks unreliable?' },
    {
      type: 'list',
      items: [
        '**Catch-all servers.** Some domains accept mail for any name, real or not. The server says yes to every address, so the check proves nothing.',
        '**Greylisting.** Some servers turn away unfamiliar senders with a temporary 4xx error and wait for them to retry, as RFC 6647 describes. A one-off check gets a refusal, not an answer.',
        '**Late rejections.** Some servers accept every recipient during the SMTP conversation and reject the message only after it arrives. A check that hangs up early never learns the result.',
        '**Blocking.** Mail servers notice connections that test many addresses and never send. They may slow down or block the checking server.',
        '**A mailbox isn’t a person.** An address can keep working long after its owner has left, and some forward to a shared inbox.',
      ],
    },
    {
      type: 'p',
      text: 'That’s why the [DataPit email verifier](/tools/email-verifier) doesn’t probe mail servers. It reports what DNS and its lists can establish, and it says plainly that it can’t confirm the mailbox.',
    },

    { type: 'h2', text: 'What’s the difference between a hard bounce and a soft bounce?' },
    {
      type: 'p',
      text: 'A bounce is the receiving server’s refusal, sent back to you as a message. Its SMTP reply code tells you which kind it is. RFC 5321 treats 5xx codes as permanent failures and 4xx codes as temporary ones.',
    },
    {
      type: 'table',
      head: ['Bounce', 'Reply code', 'Typical causes', 'What to do'],
      rows: [
        [
          'Hard bounce',
          '5xx, such as 550',
          'The mailbox doesn’t exist, or the domain accepts no mail.',
          'Remove the address now. Don’t retry it.',
        ],
        [
          'Soft bounce',
          '4xx, such as 421 or 450',
          'Greylisting, a busy server or another temporary problem.',
          'Let your sending tool retry. Remove the address if it keeps failing.',
        ],
      ],
    },
    {
      type: 'p',
      text: 'Mailbox providers watch how you handle bounces. Yahoo’s sender guidance tells senders to monitor hard and soft bounces and to remove invalid recipients promptly. It also asks senders to keep their spam rate below 0.3%.',
    },

    { type: 'h2', text: 'How do you clean an email list before sending?' },
    {
      type: 'steps',
      items: [
        {
          title: 'Remove duplicates and fix typos',
          text: 'Merge duplicate contacts, trim stray spaces and fix obvious domain typos like gmial.com.',
        },
        {
          title: 'Run every address through a verifier',
          text: 'Remove the invalid ones. They will bounce, and bounces cost you sender reputation.',
        },
        {
          title: 'Review the risky ones',
          text: 'Drop disposable addresses. Swap role addresses for a named person where you can, and recheck domains that timed out.',
        },
        {
          title: 'Send a small first batch',
          text: 'Watch the bounce rate before you send the rest, and pause if it climbs. A catch-all domain can pass every check and still bounce.',
        },
        {
          title: 'Suppress bounces and opt-outs for good',
          text: 'Never re-add an address that hard-bounced or asked to stop. In the US, CAN-SPAM requires you to honor opt-out requests within 10 business days.',
        },
        {
          title: 'Re-check old lists',
          text: 'People change jobs and domains lapse. Verify a list again before you reuse it after a long gap.',
        },
      ],
    },
    {
      type: 'p',
      text: 'Still looking for the address in the first place? See [how to find someone’s email address](/blog/how-to-find-someones-email-address).',
    },

    {
      type: 'faq',
      items: [
        {
          q: 'How can I check if an email address is valid for free?',
          a: 'Use the [free email verifier](/tools/email-verifier), with no sign-up. Or check it yourself: read the syntax, then run **nslookup -type=mx** on the domain to see whether it accepts mail.',
        },
        {
          q: 'Can you verify an email address without sending an email?',
          a: 'You can confirm the format, the domain and its mail servers without sending anything. Confirming the mailbox itself needs an SMTP check, and catch-all servers and greylisting often make that inconclusive.',
        },
        {
          q: 'What is a catch-all email domain?',
          a: 'A domain whose mail server accepts mail for any address, real or not. Checks can’t tell a real mailbox from a made-up one there, so treat those addresses as unconfirmed.',
        },
        {
          q: 'Why did an address that passed verification bounce?',
          a: 'A pass means the domain can receive mail. The mailbox itself can still be missing, full or closed since the person left. Remove it after a hard bounce.',
        },
        {
          q: 'Does verifying an email address notify the person?',
          a: 'No. DNS checks never touch the mailbox. An SMTP check stops before a message is sent, though the mail server may log the connection.',
        },
      ],
    },
    {
      type: 'cta',
      title: 'Check an email address now',
      text: 'The DataPit email verifier is free, needs no sign-up and doesn’t store what you check.',
      primary: { label: 'Check an email free', to: '/tools/email-verifier' },
      secondary: { label: 'Start free', to: '/login?mode=register' },
    },
    {
      type: 'related',
      items: [
        {
          label: 'Free email verifier',
          to: '/tools/email-verifier',
          text: 'Syntax, domain, MX, disposable and role checks.',
        },
        {
          label: 'How to find someone’s email address',
          to: '/blog/how-to-find-someones-email-address',
          text: 'Six ways to find a work address, and how to check it.',
        },
        {
          label: 'Email finder',
          to: '/features/email-finder',
          text: 'Find a person’s work email in DataPit.',
        },
        {
          label: 'Cold email templates',
          to: '/blog/cold-email-templates',
          text: 'What to send once your list is clean.',
        },
      ],
    },
    {
      type: 'sources',
      items: [
        {
          label: 'RFC 5321: Simple Mail Transfer Protocol',
          url: 'https://www.rfc-editor.org/rfc/rfc5321.html',
          checked: CHECKED,
        },
        {
          label: 'RFC 7505: A "Null MX" No Service Resource Record for Domains That Accept No Mail',
          url: 'https://www.rfc-editor.org/rfc/rfc7505.html',
          checked: CHECKED,
        },
        {
          label: 'RFC 6647: Email Greylisting: An Applicability Statement for SMTP',
          url: 'https://www.rfc-editor.org/rfc/rfc6647.html',
          checked: CHECKED,
        },
        {
          label: 'RFC 2142: Mailbox Names for Common Services, Roles and Functions',
          url: 'https://www.rfc-editor.org/rfc/rfc2142.html',
          checked: CHECKED,
        },
        {
          label: 'Yahoo Sender Hub: Sender best practices',
          url: 'https://senders.yahooinc.com/best-practices/',
          checked: CHECKED,
        },
        {
          label: 'FTC: CAN-SPAM Act: A Compliance Guide for Business',
          url: 'https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business',
          checked: CHECKED,
        },
      ],
    },
  ],
};
