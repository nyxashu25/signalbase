import { DATAPIT_SUMMARY, formatCount } from '../../../data/facts.js';
import { FREE_PLAN_MONTHLY_CREDITS } from '../../../data/plans.js';

const CHECKED = '2026-09-28';

export default {
  meta: {
    path: '/blog/cold-email-deliverability',
    section: 'blog',
    name: 'Cold email deliverability',
    title: 'Cold Email Deliverability: SPF, DKIM, DMARC Guide | DataPit',
    description:
      'Keep cold email out of spam: what SPF, DKIM and DMARC do, Gmail and Yahoo sender requirements with dates, warm-up guidance and Postmaster Tools.',
    updated: '2026-09-28',
    published: true,
    station: 'crystals',
  },
  hero: {
    eyebrow: 'Guide',
    lines: ['Cold email', 'deliverability'],
    sub: 'Cold email is more likely to reach the inbox when mailbox providers can confirm who sent it and recipients don’t report it as spam. Set up SPF, DKIM and DMARC on your sending domain. Keep spam complaints under 0.3%, raise volume slowly and write only to people with a clear reason to hear from you.',
    primary: { label: 'Start free', to: '/login?mode=register' },
    secondary: { label: 'Check an email free', to: '/tools/email-verifier' },
  },
  blocks: [
    {
      type: 'callout',
      title: 'In short',
      text: 'Publish SPF and DKIM records for your sending domain, then add a DMARC record, starting with p=none. Make sure the From: domain aligns with the SPF or DKIM domain. Gmail and Yahoo require all of this from bulk senders, along with spam complaints below 0.3%.',
    },

    { type: 'h2', text: 'What is cold email deliverability?' },
    {
      type: 'p',
      text: 'Deliverability is whether your email reaches the inbox, not just the receiving server. A delivered message can still land in spam. Providers decide based on who sent it, how recipients react and what it looks like.',
    },
    {
      type: 'p',
      text: 'Cold email starts at a disadvantage, because the people you write to didn’t ask to hear from you. Each spam report counts against your domain.',
    },

    { type: 'h2', text: 'What do SPF, DKIM and DMARC do?' },
    {
      type: 'p',
      text: 'They’re three DNS records that let a receiving server check a message really came from your domain. DMARC ties the other two to the address people see.',
    },
    {
      type: 'table',
      caption: 'The three email authentication records',
      head: ['Record', 'What it checks', 'Where it lives', 'Watch out for'],
      rows: [
        [
          'SPF',
          'Which servers may send mail for the domain in the envelope sender, also called the Return-Path.',
          'A TXT record on the domain, starting v=spf1.',
          'Publish one SPF record per domain. RFC 7208 caps DNS lookups at 10, so too many include: entries make SPF fail.',
        ],
        [
          'DKIM',
          'A signature showing which domain signed the message (the d= tag) and that it wasn’t changed.',
          'A public key in a TXT record at selector._domainkey.yourdomain.',
          'Gmail and Yahoo require a key of at least 1024 bits and recommend 2048.',
        ],
        [
          'DMARC',
          'Whether SPF or DKIM passed for a domain that matches the From: address, and what to do if neither did.',
          'A TXT record at _dmarc.yourdomain.',
          'p=none states no preference for failing mail. Add a rua address to receive reports.',
        ],
      ],
    },
    { type: 'h3', text: 'What does DMARC alignment mean?' },
    {
      type: 'p',
      text: 'Alignment means the domain that passed SPF or DKIM matches the domain in the From: address. Relaxed alignment accepts the same organizational domain, so mail.example.com aligns with example.com. Strict alignment needs an exact match.',
    },
    {
      type: 'p',
      text: 'If a sending tool signs mail with its own domain instead of yours, SPF and DKIM can pass while DMARC fails. Ask the provider to sign with your domain, and add its servers to your SPF record.',
    },
    { type: 'h3', text: 'What do the records look like?' },
    {
      type: 'list',
      items: [
        '**SPF:** v=spf1 include:_spf.example-provider.com ~all. Your email provider gives you the include: value. Ending with ~all marks other senders as a soft fail, and -all as a fail.',
        '**DKIM:** your provider generates the key. You publish it at a name like s1._domainkey.example.com.',
        '**DMARC:** v=DMARC1; p=none; rua=mailto:dmarc@example.com, published at _dmarc.example.com. Microsoft advises moving from none to quarantine to reject once every legitimate source is aligned.',
      ],
    },

    { type: 'h2', text: 'What do Gmail and Yahoo require from senders?' },
    {
      type: 'p',
      text: 'Google announced its sender rules on October 3, 2023, and both Google and Yahoo began enforcing theirs in February 2024. Gmail’s cover mail to personal Gmail accounts. Yahoo’s cover every domain Yahoo Mail hosts, including AOL.',
    },
    {
      type: 'table',
      caption: 'Sender requirements from Google and Yahoo',
      head: ['Requirement', 'Gmail (personal accounts)', 'Yahoo and AOL'],
      rows: [
        [
          'Who counts as a bulk sender',
          'Anyone who sends close to 5,000 or more messages to personal Gmail accounts in 24 hours, counted across the primary domain. The status is permanent.',
          'A sender of “a significant volume of mail”. Yahoo doesn’t give a number.',
        ],
        ['SPF and DKIM', 'All senders: SPF or DKIM. Bulk: both.', 'All senders: SPF or DKIM. Bulk: both.'],
        ['DKIM key length', '1024 bits or longer, with 2048 recommended.', '1024 bits or longer, with 2048 recommended.'],
        [
          'DMARC',
          'Bulk: a DMARC record, with p=none as the minimum.',
          'Bulk: a valid policy of at least p=none, and DMARC must pass.',
        ],
        [
          'From: alignment',
          'Bulk: the From: domain must align with the SPF or DKIM domain.',
          'Bulk: the same. Relaxed alignment is acceptable.',
        ],
        [
          'DNS and connection',
          'All senders: valid forward and reverse DNS (PTR) for sending IPs, and a TLS connection.',
          'All senders: valid forward and reverse DNS for sending IPs.',
        ],
        ['Message format', 'All senders: RFC 5322.', 'All senders: RFC 5321 and RFC 5322.'],
        [
          'Spam complaint rate',
          'All senders: below 0.3% in Postmaster Tools. Google advises staying below 0.1%.',
          'All senders: below 0.3%, measured on mail delivered to the inbox.',
        ],
        [
          'Unsubscribe',
          'Bulk: one-click unsubscribe using RFC 8058 headers on marketing and subscribed mail, plus a visible link in the body.',
          'Bulk: a working one-click List-Unsubscribe header, plus a visible link in the body. The RFC 8058 POST method is highly recommended.',
        ],
        ['Honoring opt-outs', 'Bulk: within 48 hours.', 'Bulk: within 2 days.'],
        [
          'Key dates',
          'Rules from February 1, 2024. One-click unsubscribe by June 1, 2024 for senders who already had a link. Stronger enforcement, including rejections, from November 2025.',
          'Enforcement from February 2024, rolled out gradually. List-Unsubscribe enforcement from June 2024.',
        ],
      ],
      note: 'Gmail doesn’t count a mailto link as one-click unsubscribe, while Yahoo accepts one. Yahoo says its requirements are subject to change, and Google updates its FAQ periodically.',
    },
    {
      type: 'p',
      text: 'Microsoft added similar rules for Outlook.com, Hotmail and Live addresses. Since May 5, 2025, domains sending more than 5,000 emails a day must pass SPF and DKIM. They also need a DMARC record of at least p=none that aligns with SPF or DKIM.',
    },
    { type: 'h3', text: 'Do these rules apply to B2B cold email?' },
    {
      type: 'p',
      text: 'Partly. Google says its requirements don’t apply to mail sent to Google Workspace accounts, only to personal Gmail. Cold email to company addresses falls outside them, even when the company uses Google Workspace.',
    },
    {
      type: 'p',
      text: 'Meet them anyway. Yahoo and Microsoft ask for the same records, and Google counts all your subdomains toward one bulk-sender total. Google also leaves recipients to decide what’s promotional, so give every cold email a clear opt-out.',
    },
    {
      type: 'p',
      text: 'Gmail’s guidelines also say not to send messages to people who didn’t sign up for them. Cold email to a personal Gmail address goes against that, so write to work addresses only.',
    },

    { type: 'h2', text: 'How fast can you increase sending volume?' },
    {
      type: 'p',
      text: 'Neither Google nor Yahoo publishes a safe daily number, so treat any fixed warm-up schedule as a rule of thumb. Here’s what they advise instead:',
    },
    {
      type: 'list',
      items: [
        '**Start small and steady.** Begin with a low volume to engaged recipients, and send at a consistent rate rather than in bursts.',
        '**Avoid sudden jumps.** Google warns that doubling your volume at once can bring rate limiting or a drop in reputation. Yahoo says a spike can get you flagged as a compromised sender.',
        '**Go slower as volume grows.** The more you send, the more slowly you should increase. Sending daily lets you increase faster than sending weekly.',
        '**Back off when errors rise.** If messages bounce or are deferred, cut volume until the errors drop, then increase slowly again.',
        '**Respect rate limits.** Gmail usually answers with error 4.7.28 when you exceed its limits. Stop for at least 10 minutes, then resume on a single connection.',
      ],
    },
    {
      type: 'p',
      text: 'For cold email, a cautious approach is to start each new mailbox with a small daily number. Add volume week by week while bounces and complaints stay low.',
    },

    { type: 'h2', text: 'What else affects cold email deliverability?' },
    { type: 'h3', text: 'The message' },
    {
      type: 'list',
      items: [
        '**Keep it plain.** Write short emails with few links. Google asks that every link be visible and easy to understand.',
        '**Be honest in headers.** Google says not to start a subject with Re: or Fwd: unless the email really is a reply or forward.',
        '**Name yourself clearly.** The display name should identify the sender, without emojis, urgency or the recipient’s name.',
        '**Don’t hide content.** Google says hiding text with HTML or CSS can get mail marked as spam.',
        '**Accept replies.** Microsoft asks for a From: or Reply-To: address that’s valid and can receive mail.',
      ],
    },
    { type: 'h3', text: 'The list' },
    {
      type: 'list',
      items: [
        '**Write to the right people.** Pick contacts with a clear business reason to hear from you; see [how to build a B2B prospect list](/blog/how-to-build-a-b2b-prospect-list).',
        '**Don’t buy lists.** Google and Yahoo both tell senders not to purchase addresses.',
        '**Check addresses first.** Use the [free email verifier](/tools/email-verifier) and keep your [bounce rate](/blog/email-bounce-rate) under 2%.',
        '**Honor every opt-out.** Remove people who opt out or complain, and never add them back.',
      ],
    },
    { type: 'h3', text: 'The sending setup' },
    {
      type: 'p',
      text: 'Keep cold outreach apart from your company’s everyday mail. Yahoo advises separating mail types by IP or DKIM domain, and Google suggests one From: address per type of message. A subdomain with its own SPF, DKIM and DMARC records keeps them apart.',
    },

    { type: 'h2', text: 'How do you monitor cold email deliverability?' },
    {
      type: 'list',
      items: [
        '**Google Postmaster Tools.** Add your DKIM (d=) or SPF (Return-Path) domain and verify it in DNS. Dashboards cover spam rate, reputation, authentication, delivery errors and compliance status.',
        '**Its limits.** It covers only mail to personal Gmail accounts. Google’s API guide says only domains sending to at least 50 users a day get statistics.',
        '**DMARC reports.** The rua address receives aggregate reports showing who sent mail as your domain and whether it passed.',
        '**Yahoo’s Complaint Feedback Loop.** Enroll your DKIM domain in Yahoo Sender Hub to get a report each time a Yahoo user marks your mail as spam.',
        '**Your own numbers.** Track bounces, replies, opt-outs and SMTP errors. Rising 4.7.x deferrals or 5.7.x rejections usually mean a provider is pushing back on policy grounds.',
      ],
    },
    {
      type: 'p',
      text: 'Don’t judge deliverability by open rates. Google says it doesn’t track them, and that low open rates aren’t necessarily a sign of spam problems.',
    },

    {
      type: 'faq',
      items: [
        {
          q: 'Do I need DMARC if I send fewer than 5,000 emails a day?',
          a: 'Gmail doesn’t require it below that volume, but set it up anyway. Google recommends SPF, DKIM and DMARC for every domain, and Yahoo strongly urges all senders to publish DMARC. A p=none record with a rua address starts your reports without changing how mail is handled.',
        },
        {
          q: 'Which DMARC policy should I use for cold email?',
          a: 'Start with p=none and a rua address, and read the reports. Once every legitimate source passes, move to quarantine and then reject, the gradual path Microsoft recommends.',
        },
        {
          q: 'Why does my cold email go to spam when SPF, DKIM and DMARC pass?',
          a: 'Authentication proves the email came from you, not that people want it. Spam reports, sudden volume jumps and misleading subject lines can still send it to spam.',
        },
        {
          q: 'How long should I warm up a new domain?',
          a: 'Neither Google nor Yahoo sets a period. Raise volume gradually, watch bounces, deferrals and spam reports, and slow down when any of them rise.',
        },
      ],
    },
    {
      type: 'cta',
      title: 'Start with the right contacts',
      text: `${DATAPIT_SUMMARY} The Free plan includes ${formatCount(FREE_PLAN_MONTHLY_CREDITS)} credits a month.`,
      primary: { label: 'Start free', to: '/login?mode=register' },
      secondary: { label: 'Check an email free', to: '/tools/email-verifier' },
    },
    {
      type: 'related',
      items: [
        {
          label: 'Email bounce rate',
          to: '/blog/email-bounce-rate',
          text: 'What’s good, and how to lower yours.',
        },
        {
          label: 'Cold email templates',
          to: '/blog/cold-email-templates',
          text: 'Eight templates, with the legal basics.',
        },
        {
          label: 'Cold email follow-ups',
          to: '/blog/cold-email-follow-ups',
          text: 'How many to send, and when to stop.',
        },
        {
          label: 'How to verify an email address',
          to: '/blog/how-to-verify-an-email-address',
          text: 'Six checks to run before you send.',
        },
      ],
    },
    {
      type: 'sources',
      items: [
        {
          label: 'Gmail Help: Email sender guidelines',
          url: 'https://support.google.com/mail/answer/81126?hl=en',
          checked: CHECKED,
        },
        {
          label: 'Gmail Help: Email sender guidelines FAQ',
          url: 'https://support.google.com/mail/answer/14229414?hl=en',
          checked: CHECKED,
        },
        {
          label: 'Gmail Help: Set up Postmaster Tools',
          url: 'https://support.google.com/mail/answer/9981691?hl=en',
          checked: CHECKED,
        },
        {
          label: 'Google for Developers: Postmaster Tools API, retrieve email statistics',
          url: 'https://developers.google.com/workspace/gmail/postmaster/guides/retrieve-metrics',
          checked: CHECKED,
        },
        {
          label: 'Google: New Gmail protections for a safer, less spammy inbox (October 3, 2023)',
          url: 'https://blog.google/products/gmail/gmail-security-authentication-spam-protection/',
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
          label: 'RFC 7208: Sender Policy Framework (SPF)',
          url: 'https://www.rfc-editor.org/rfc/rfc7208.html',
          checked: CHECKED,
        },
        {
          label: 'RFC 6376: DomainKeys Identified Mail (DKIM) Signatures',
          url: 'https://www.rfc-editor.org/rfc/rfc6376.html',
          checked: CHECKED,
        },
        {
          label: 'RFC 9989: Domain-Based Message Authentication, Reporting, and Conformance (DMARC)',
          url: 'https://www.rfc-editor.org/rfc/rfc9989.html',
          checked: CHECKED,
        },
        {
          label: 'RFC 8058: Signaling One-Click Functionality for List Email Headers',
          url: 'https://www.rfc-editor.org/rfc/rfc8058.html',
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
