import { CREDIT_COSTS, DATAPIT_SUMMARY, LIVE, formatCount } from '../../../data/facts.js';
import { FREE_PLAN_MONTHLY_CREDITS, PLANS } from '../../../data/plans.js';

const YAHOO_SENDERS = 'https://senders.yahooinc.com/best-practices/';
const APPLE_MAIL_PRIVACY = 'https://support.apple.com/guide/mail/protect-email-privacy-mlhlp1205/mac';
const FTC_CAN_SPAM = 'https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business';
const EC_OBJECT =
  'https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/dealing-requests-individuals_en';
const ICO_EMAIL =
  'https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/electronic-and-telephone-marketing/electronic-mail-marketing/';
const CHECKED = '2026-09-28';

const LOWEST_PAID_PRICE = Math.min(...PLANS.filter((p) => p.block).map((p) => p.price));

export default {
  meta: {
    path: '/blog/cold-email-follow-ups',
    section: 'blog',
    name: 'Cold email follow-ups',
    title: 'Cold Email Follow-Ups: How Many to Send and When | DataPit',
    description:
      'How many follow-up emails to send after a cold email, how far apart, what each one should add, when to stop, and five follow-up templates to adapt.',
    updated: '2026-09-28',
    published: true,
    station: 'crystals',
  },
  hero: {
    eyebrow: 'Guide',
    lines: ['Cold email', 'follow-ups'],
    sub: 'Send three or four follow-ups after a cold email, so four or five emails in all, over three to four weeks. Space them a few days apart at first and further apart later. Each one should add something new. Stop as soon as the person replies, opts out or asks you to stop.',
  },
  blocks: [
    {
      type: 'callout',
      title: 'In short',
      text: 'Plan a first email and three or four follow-ups over about a month. Every follow-up should give the reader a new reason to answer: a detail, an angle, something useful or an easier question. End with a polite breakup email, and stop the moment anyone replies or opts out.',
    },

    { type: 'h2', text: 'How many follow-up emails should you send?' },
    {
      type: 'p',
      text: 'Three or four follow-ups is a sensible default. People miss emails for ordinary reasons: a busy week, a full inbox, a meeting that ran long. A short, well-spaced series gives them a few chances to notice you.',
    },
    {
      type: 'p',
      text: `Past four, each extra email is more likely to annoy than to help. Every email to someone who didn’t want the first is another chance to be reported as spam. Mailbox providers watch that, and [Yahoo asks senders](${YAHOO_SENDERS}) to keep their spam rate below 0.3%.`,
    },
    {
      type: 'p',
      text: 'Adjust the number to the account. A closely researched, high-value account can justify one more touch, spread over more time. A broad list deserves fewer.',
    },

    { type: 'h2', text: 'How far apart should cold email follow-ups be?' },
    {
      type: 'p',
      text: 'Start close together, then widen the gaps. The first follow-up is a light nudge a few days later, and later ones give the reader more room. Send on working days, in the reader’s time zone.',
    },
    {
      type: 'table',
      head: ['Email', 'When to send', 'What it adds'],
      rows: [
        ['First email', 'Day 1', 'Your reason for writing and one question.'],
        ['Follow-up 1', 'Day 3 or 4', 'A short bump with one new detail.'],
        ['Follow-up 2', 'Day 7 or 8', 'A different angle on the problem.'],
        ['Follow-up 3', 'Day 14', 'Something useful, with no ask attached.'],
        ['Follow-up 4', 'Day 21 to 28', 'A polite breakup that closes the loop.'],
      ],
      note: 'Days count from the first email. For senior readers or long sales cycles, stretch the whole plan to five or six weeks.',
    },

    { type: 'h2', text: 'What should each follow-up add?' },
    {
      type: 'p',
      text: 'A follow-up earns its place when it gives the reader a new reason to reply. “Just checking in” gives them nothing. Change one thing each time:',
    },
    {
      type: 'list',
      items: [
        '**A new detail.** One fact you left out, like a specific way the problem shows up in their role.',
        '**A different angle.** If the first email was about saving time, try risk, cost or a missed opportunity.',
        '**Something useful.** A checklist, a few notes on their {page or process} or an answer to a question they asked in public.',
        '**An easier question.** Swap “Can we talk?” for “Is this on your list this quarter?” or “Who owns this?”',
        '**A clean exit.** The last email says you’ll stop, and you do.',
      ],
    },
    {
      type: 'p',
      text: 'Keep each follow-up shorter than the one before. Reply in the same thread for the first follow-up or two, so your original email sits right below. When you change the angle, start a new thread with an honest new subject.',
    },

    { type: 'h2', text: 'What should you avoid in a follow-up?' },
    {
      type: 'list',
      items: [
        '**Guilt.** Lines like “I guess you’re too busy” make replying feel like an apology.',
        '**Empty bumps.** “Bumping this to the top of your inbox” asks for attention and offers nothing.',
        '**False urgency.** Invented deadlines break trust. A “Re:” on a new thread misleads, and deceptive subject lines break CAN-SPAM.',
        '**Emailing the whole team.** Several colleagues getting the same pitch feels like a campaign. Work through one person at a time.',
        '**Longer and longer emails.** If the first email didn’t land, a longer second one won’t help.',
      ],
    },

    { type: 'h2', text: 'When should you stop following up?' },
    { type: 'p', text: 'Stop the sequence for a person the moment any of these happens:' },
    {
      type: 'list',
      items: [
        '**They reply**, whatever they say. A person is now talking to you, so answer them yourself.',
        `**They opt out or object.** In the US, [CAN-SPAM](${FTC_CAN_SPAM}) gives you at most 10 business days to honor an opt-out. In the EU, [an objection to direct marketing](${EC_OBJECT}) means you must stop using their data for it.`,
        '**The email bounces.** Remove the address, and check the next one before you send. See [how to verify an email address](/blog/how-to-verify-an-email-address).',
        '**You get an out-of-office reply.** Pause until their return date, then pick up where you left off.',
        '**Someone else at the company answers.** Stop emailing their colleagues about the same thing.',
        '**You’ve sent the breakup email.** Wait at least a few months, and only come back with a new reason.',
      ],
    },

    { type: 'h2', text: 'What do you write in a cold email follow-up?' },
    {
      type: 'p',
      text: 'These five templates follow the plan above. Words in {braces} are placeholders to replace with something true. Keep your usual signature in every one, with your postal address and a line on how to opt out.',
    },

    { type: 'h3', text: 'Follow-up 1: the bump' },
    {
      type: 'p',
      text: '**Send it** three or four days after the first email, as a reply in the same thread. It adds one detail and asks the same question more simply.',
    },
    {
      type: 'callout',
      title: 'Email',
      text: 'Hi {first name}, one thing I left out: {one new detail about the problem or your offer}. Is {problem} something you’re working on this quarter?',
    },

    { type: 'h3', text: 'Follow-up 2: a new angle' },
    {
      type: 'p',
      text: '**Send it** about a week in. It changes the angle, so give it a new subject line in a new thread.',
    },
    { type: 'p', text: '**Subject:** {second outcome} at {company}' },
    {
      type: 'callout',
      title: 'Email',
      text: 'Hi {first name}, my last note was about {first angle}, but for many {role}s the bigger issue is {second angle}. We help teams {outcome for the second angle}. If that’s closer to the mark, would a short call make sense?',
    },

    { type: 'h3', text: 'Follow-up 3: something useful' },
    {
      type: 'p',
      text: '**Send it** around day 14. It gives something away with no strings, so it’s worth opening even if they never buy.',
    },
    {
      type: 'callout',
      title: 'Email',
      text: 'Hi {first name}, no ask this time. Here’s {resource} for {role}s dealing with {problem}, at {link}. It’s yours to use, whether or not we ever talk.',
    },

    { type: 'h3', text: 'Follow-up 4: the breakup' },
    {
      type: 'p',
      text: '**Send it** three to four weeks after the first email. It tells the reader you’ll stop and leaves the door open.',
    },
    { type: 'p', text: '**Subject:** closing the loop' },
    {
      type: 'callout',
      title: 'Email',
      text: 'Hi {first name}, I haven’t heard back, so I’ll take it that {problem} isn’t a priority right now, and this is my last email. If that changes, reply any time and I’ll pick it up. Thanks for reading.',
    },

    { type: 'h3', text: 'After a “not now”: the check-back' },
    {
      type: 'p',
      text: '**Send it** when they said to, or about three months later if they didn’t say. Treat it as a new conversation, tied to what they told you.',
    },
    { type: 'p', text: '**Subject:** {topic}, as promised' },
    {
      type: 'callout',
      title: 'Email',
      text: 'Hi {first name}, when we spoke in {month}, you said {topic} would be worth revisiting after {their reason}. Has that moved, or should I check back later in the year?',
    },

    { type: 'h2', text: 'How do you track replies to follow-ups?' },
    {
      type: 'p',
      text: `Track replies, not opens. Open tracking relies on a hidden image, and some mail apps load images whether or not anyone reads the email. When it’s turned on, [Apple’s Mail Privacy Protection](${APPLE_MAIL_PRIVACY}) downloads remote content in the background as a message arrives.`,
    },
    {
      type: 'p',
      text: 'So an “open” can appear for an email nobody read. Replies are the signal you can trust. Keep one row per person, in a spreadsheet or your CRM, with these fields:',
    },
    {
      type: 'list',
      items: [
        '**Status:** active, replied, opted out, bounced or finished.',
        '**Next step:** which email is due, and on what date.',
        '**Reply type:** interested, not now, wrong person, not interested or unsubscribe.',
        '**Template:** which version they got, so you can compare templates later.',
      ],
    },
    {
      type: 'p',
      text: 'Check your inbox every day while a sequence runs, and update the status by hand if your tool doesn’t detect replies. To compare templates, divide replies by emails delivered for each one. Don’t judge a template on its first few sends, since small numbers swing a lot.',
    },
    ...(LIVE.sequenceSending
      ? [
          {
            type: 'p',
            text: `DataPit sequences on paid plans run email steps and wait steps counted in whole days, so you can schedule a plan like this one. You can pause or unenroll a contact at any time, and enrolling one costs ${formatCount(CREDIT_COSTS.SEQUENCE_ENROLLMENT)} credits; see [pricing](/pricing).`,
          },
          {
            type: 'p',
            text: 'Each step is sent as written, in plain text from a DataPit sending address rather than your own mailbox. There are no merge fields or automatic unsubscribe links, so write steps that suit everyone enrolled and put your opt-out line in each.',
          },
        ]
      : []),

    {
      type: 'faq',
      items: [
        {
          q: 'Is it rude to follow up on a cold email?',
          a: 'Not if each follow-up is short, adds something and stops when asked. What feels rude is a stream of “just checking in” emails, or guilt about not replying.',
        },
        {
          q: 'Should a follow-up go in the same thread?',
          a: 'For the first one or two, yes, so the reader sees your original email below. When you change the angle, a new thread with an honest subject reads better. Never add “Re:” to a subject that isn’t a real reply.',
        },
        {
          q: 'Does every follow-up need an opt-out?',
          a: `Yes. In the US, CAN-SPAM applies to each commercial email, and each one that breaks it can bring a separate penalty. The [ICO’s checklist](${ICO_EMAIL}) also asks UK senders to offer an opt-out, by reply or an unsubscribe link.`,
        },
        {
          q: 'What if someone replies “not now”?',
          a: 'Stop the sequence, thank them and ask when to check back. Put that date in your tracker, then write a new email based on what they told you.',
        },
      ],
    },
    {
      type: 'cta',
      title: 'Follow up with the right person',
      text: `${DATAPIT_SUMMARY} Start on the Free plan with ${formatCount(FREE_PLAN_MONTHLY_CREDITS)} credits a month.`,
      primary: { label: 'Start free', to: '/login?mode=register' },
      secondary: { label: 'How email finding works', to: '/features/email-finder' },
    },
    {
      type: 'related',
      items: [
        { label: 'Cold email templates', to: '/blog/cold-email-templates', text: 'Eight first-touch templates, and the legal basics every email needs.' },
        { label: 'How to verify an email address', to: '/blog/how-to-verify-an-email-address', text: 'Check an address before you send to it.' },
        { label: 'Email finder', to: '/features/email-finder', text: 'Reveal work email addresses in DataPit.' },
        { label: 'Pricing', to: '/pricing', text: `A free plan, and seat blocks from $${LOWEST_PAID_PRICE} a month.` },
      ],
    },
    {
      type: 'sources',
      items: [
        { label: 'Yahoo Sender Hub: Sender best practices', url: YAHOO_SENDERS, checked: CHECKED },
        { label: 'Apple Support: Protect email privacy in Mail on Mac', url: APPLE_MAIL_PRIVACY, checked: CHECKED },
        { label: 'Federal Trade Commission: CAN-SPAM Act, a compliance guide for business', url: FTC_CAN_SPAM, checked: CHECKED },
        {
          label: 'European Commission: Dealing with requests from individuals (objections to processing)',
          url: EC_OBJECT,
          checked: CHECKED,
        },
        { label: 'Information Commissioner’s Office: Electronic mail marketing', url: ICO_EMAIL, checked: CHECKED },
      ],
    },
  ],
};
