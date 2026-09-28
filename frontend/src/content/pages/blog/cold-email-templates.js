import { DATAPIT_SUMMARY, formatCount } from '../../../data/facts.js';
import { FREE_PLAN_MONTHLY_CREDITS } from '../../../data/plans.js';

const FTC_CAN_SPAM = 'https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business';
const EC_THIRD_PARTY =
  'https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/legal-grounds-processing-data/can-data-received-third-party-be-used-marketing_en';
const EC_OBJECT =
  'https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/dealing-requests-individuals_en';
const EC_GDPR_SCOPE =
  'https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/application-gdpr_en';
const ICO_EMAIL =
  'https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/electronic-and-telephone-marketing/electronic-mail-marketing/';
const CHECKED = '2026-09-28';

export default {
  meta: {
    path: '/blog/cold-email-templates',
    section: 'blog',
    name: 'Cold email templates',
    title: '8 B2B Cold Email Templates and Why They Work | DataPit',
    description:
      'Eight original B2B cold email templates, from first touch to breakup, with when to use each, subject line tips, personalization and the legal basics.',
    updated: '2026-09-28',
    published: true,
    station: 'crystals',
  },
  hero: {
    eyebrow: 'Guide',
    lines: ['B2B cold email', 'templates'],
    sub: 'A good B2B cold email is short, specific to one person’s situation and ends with one easy question. Below are eight original templates you can adapt: first touch, referral, right person, trigger event, value offer, their own work, breakup and re-engagement. Each comes with when to use it and why it works, followed by the legal basics.',
  },
  blocks: [
    {
      type: 'callout',
      title: 'In short',
      text: 'Pick the template that matches your reason for writing, then replace every {placeholder} with something true about the reader. Keep the email short enough to read on a phone without scrolling, and ask one question that’s easy to answer. Every commercial email also needs an honest subject line, who you are and a clear way to opt out.',
    },

    { type: 'h2', text: 'What makes a B2B cold email work?' },
    {
      type: 'p',
      text: 'A cold email works when the reader can tell in seconds why it’s for them: one reader, one problem, one ask. Every template below uses the same six parts:',
    },
    {
      type: 'list',
      items: [
        '**Subject line:** a few plain words saying what it’s about.',
        '**First line:** why you’re writing to this person now.',
        '**The problem:** one issue common in their role, in their words.',
        '**The offer:** what you do about it, in one plain sentence.',
        '**The ask:** one question they can answer in a line.',
        '**Signature:** your name, company, postal address and a way to opt out.',
      ],
    },
    {
      type: 'p',
      text: 'Write in plain text, the way you’d email a colleague, and leave out images and attachments.',
    },

    { type: 'h2', text: 'How do you use these templates?' },
    {
      type: 'p',
      text: 'Words in {braces} are placeholders: replace every one with something specific to the reader. If you can’t fill one truthfully, use a different template for that person.',
    },
    {
      type: 'p',
      text: 'End every email with a signature like this one, which identifies you and gives a postal address and an opt-out:',
    },
    {
      type: 'callout',
      title: 'Signature',
      text: '{Your name}, {role} at {company}, {street address, city, postcode}. Not relevant? Reply “no thanks” and I won’t email you again.',
    },

    { type: 'h2', text: 'What are good B2B cold email templates?' },

    { type: 'h3', text: '1. First touch' },
    {
      type: 'p',
      text: '**Use it when** they likely have the problem you solve. **Why it works:** it opens with their situation, not your product, and the ask leaves room to say no.',
    },
    { type: 'p', text: '**Subject:** {problem} at {company}' },
    {
      type: 'callout',
      title: 'Email',
      text: 'Hi {first name}, I noticed {specific observation}, which often means {problem} takes more time than it should. We help {role}s at companies like {company} {outcome} by {how, in a few words}. Worth a short call, or is it not a priority right now?',
    },

    { type: 'h3', text: '2. Mutual referral' },
    {
      type: 'p',
      text: '**Use it when** a mutual contact has agreed to be named, so ask them first. **Why it works:** a name they trust gets the email read, and the ask stays small.',
    },
    { type: 'p', text: '**Subject:** {referrer’s name} suggested I get in touch' },
    {
      type: 'callout',
      title: 'Email',
      text: 'Hi {first name}, {referrer’s name} and I were talking about {topic}, and they suggested you’d be the right person to speak to. We help {team type} {outcome}, and {referrer’s first name} thought it might fit what you’re working on. Would you be open to a 15-minute call next week?',
    },

    { type: 'h3', text: '3. Right person' },
    {
      type: 'p',
      text: '**Use it when** the company fits but you don’t know who owns the problem. **Why it works:** pointing you to a colleague takes seconds. Send it to one person at a time.',
    },
    { type: 'p', text: '**Subject:** who looks after {area} at {company}?' },
    {
      type: 'callout',
      title: 'Email',
      text: 'Hi {first name}, I’m trying to find the person who looks after {area} at {company}, and I think it might be you. If it isn’t, could you point me to the right colleague? In short, we help {team type} {outcome}, and one line back is plenty.',
    },

    { type: 'h3', text: '4. Trigger event' },
    {
      type: 'p',
      text: '**Use it when** something public just changed, like a new role, a hiring push or a launch. **Why it works:** change creates new problems, and good timing shows you paid attention.',
    },
    { type: 'p', text: '**Subject:** {event} and {problem}' },
    {
      type: 'callout',
      title: 'Email',
      text: 'Hi {first name}, congratulations on {event}. Changes like that often make {problem} harder before it gets easier. We help {team type} {outcome}, so would a short call in the next few weeks be useful?',
    },

    { type: 'h3', text: '5. Value offer' },
    {
      type: 'p',
      text: '**Use it when** you have no case study yet but can offer something useful. **Why it works:** saying yes costs the reader nothing. Make the offer real and specific, like notes on their {pricing page or onboarding}.',
    },
    { type: 'p', text: '**Subject:** a few notes on {company}’s {thing}' },
    {
      type: 'callout',
      title: 'Email',
      text: 'Hi {first name}, I looked at {company}’s {thing} and noted three small changes that could help with {outcome}. It’s a one-page list, not a pitch. Want me to send it over?',
    },

    { type: 'h3', text: '6. Their own work' },
    {
      type: 'p',
      text: '**Use it when** they wrote, spoke or posted about the problem you solve. **Why it works:** it answers something they chose to say in public. Only mention work you’ve actually read.',
    },
    { type: 'p', text: '**Subject:** your {post or talk} on {topic}' },
    {
      type: 'callout',
      title: 'Email',
      text: 'Hi {first name}, I read your {post} on {topic}, and your point about {specific point} matches what we hear from {team type}. We built {product} for exactly that, and I’d value your view on whether it fits. Open to a short call, or should I send a two-minute overview instead?',
    },

    { type: 'h3', text: '7. Breakup' },
    {
      type: 'p',
      text: '**Use it when** your follow-ups got no reply. **Why it works:** it closes the loop politely and gives the reader an easy way to answer. Mean it: if they don’t reply, stop.',
    },
    { type: 'p', text: '**Subject:** should I close this out?' },
    {
      type: 'callout',
      title: 'Email',
      text: 'Hi {first name}, I haven’t heard back, so I’ll assume {problem} isn’t a priority right now and stop emailing. If that changes, reply to this email and I’ll pick it up. Thanks for your time, and good luck with {current project}.',
    },

    { type: 'h3', text: '8. Re-engagement' },
    {
      type: 'p',
      text: '**Use it when** a conversation went quiet a few months ago. **Why it works:** you already know each other, and a new reason makes the email about them, not your pipeline.',
    },
    { type: 'p', text: '**Subject:** {topic} since we last spoke' },
    {
      type: 'callout',
      title: 'Email',
      text: 'Hi {first name}, we spoke in {month} about {problem}, and you mentioned {their reason for waiting}. Since then, {what changed on your side or theirs}. Is it worth picking the conversation back up, or has the priority moved on?',
    },

    { type: 'h2', text: 'How do you write a cold email subject line?' },
    {
      type: 'p',
      text: 'A subject line has one job: tell the reader honestly what the email is about. Short and specific beats clever.',
    },
    {
      type: 'list',
      items: [
        '**Keep it short:** a few words that fit on a phone screen.',
        '**Name the topic, not the pitch.** “Onboarding at {company}” tells the reader more than “Quick question.”',
        '**Write it like a colleague would.** Sentence case, no capitals for emphasis, no emoji.',
        '**Never fake a thread.** Adding “Re:” or “Fwd:” to a first email misleads the reader, and CAN-SPAM bans deceptive subject lines.',
        '**Drop the sales voice.** Skip “urgent,” stacked punctuation and promised results.',
      ],
    },

    { type: 'h2', text: 'How much should you personalize a cold email?' },
    {
      type: 'p',
      text: 'Enough to show why you picked this person, and no more. One true observation tied to the problem beats three compliments.',
    },
    {
      type: 'list',
      items: [
        '**Role level:** problems common to their job. Use it in every email.',
        '**Company level:** news, hiring or a launch. Use it for trigger-event emails.',
        '**Person level:** something they wrote, said or built. Save it for your top accounts.',
      ],
    },
    {
      type: 'p',
      text: 'Use only work information people made public, like job posts or press releases. Never mention personal details, or claim to have read something you haven’t.',
    },
    {
      type: 'p',
      text: 'Personalization is wasted if the address is wrong. Our guides to [finding someone’s email address](/blog/how-to-find-someones-email-address) and [verifying an email address](/blog/how-to-verify-an-email-address) cover both steps. The free [email verifier](/tools/email-verifier) checks an address’s format, its domain and the domain’s MX records.',
    },

    { type: 'h2', text: 'What must every cold email include to stay legal?' },
    {
      type: 'p',
      text: 'Which rules apply depends mostly on where your readers are, and sometimes on where you are. Here are the basics for the US, the EU and the UK, as general information rather than legal advice.',
    },
    { type: 'h3', text: 'United States: CAN-SPAM' },
    {
      type: 'p',
      text: `CAN-SPAM covers commercial email, and the [FTC’s compliance guide](${FTC_CAN_SPAM}) says it makes no exception for business-to-business email. Each message must:`,
    },
    {
      type: 'list',
      items: [
        'Use accurate “From,” “Reply-To” and routing details that identify you or your business.',
        'Have a subject line that reflects what the email is about.',
        'Be identified as an ad, clearly and conspicuously.',
        'Include a valid postal address: a street address, a registered PO box or a registered private mailbox.',
        'Explain clearly how to opt out, for example by replying. The opt-out must keep working for at least 30 days after you send.',
      ],
    },
    {
      type: 'p',
      text: 'Honor opt-outs within 10 business days, without charging a fee or asking for more than an email address. Hiring another company to send your email doesn’t move the responsibility off you. The FTC says each violating email can cost up to $53,088.',
    },
    { type: 'h3', text: 'European Union: GDPR' },
    {
      type: 'p',
      text: `A named person’s work email, like forename.surname@company.eu, is personal data. The [European Commission says](${EC_GDPR_SCOPE}) GDPR applies to companies in the EU, and to those outside it offering goods or services to people there.`,
    },
    {
      type: 'p',
      text: `The Commission says a [contact list from another organisation](${EC_THIRD_PARTY}) is processed on grounds of legitimate interests, and people can object. That organisation must be able to show it collected the data lawfully.`,
    },
    {
      type: 'list',
      items: [
        'If someone else collected their details, tell them in your first email that you have them and will use them for marketing.',
        `Stop when someone objects. The Commission says that [once someone objects](${EC_OBJECT}), you may no longer use their data for direct marketing, and objecting must be free.`,
        'Keep your list up to date, and make sure no one who objected gets another email.',
      ],
    },
    {
      type: 'p',
      text: 'The Commission adds that email marketing must also follow the rules in the ePrivacy Directive. Check the national rules in the countries where your readers are.',
    },
    { type: 'h3', text: 'United Kingdom: PECR and UK GDPR' },
    {
      type: 'p',
      text: `The [ICO says](${ICO_EMAIL}) you can email any corporate body, such as a company or an LLP, without consent. Sole traders and some partnerships are treated as individuals: you need their consent, unless they bought something similar from you and didn’t opt out.`,
    },
    {
      type: 'p',
      text: 'Either way, don’t hide who you are, and offer an opt-out by reply or an unsubscribe link, as the ICO’s checklist asks. The ICO adds that emailing employees at their own work addresses can have data protection implications.',
    },
    {
      type: 'p',
      text: 'Other countries, such as Canada and Australia, have their own rules. Check them before you add readers there.',
    },

    {
      type: 'faq',
      items: [
        {
          q: 'How long should a cold email be?',
          a: 'Three to five sentences plus a signature is enough for most. If an email needs more, it’s probably trying to do two jobs.',
        },
        {
          q: 'How many follow-ups should you send after a cold email?',
          a: 'Usually three or four, spaced further apart each time, and each adding something new. Our guide to [cold email follow-ups](/blog/cold-email-follow-ups) covers timing, templates and when to stop.',
        },
      ],
    },
    {
      type: 'cta',
      title: 'Start with the right person',
      text: `${DATAPIT_SUMMARY} The Free plan includes ${formatCount(FREE_PLAN_MONTHLY_CREDITS)} credits a month.`,
      primary: { label: 'Start free', to: '/login?mode=register' },
      secondary: { label: 'How email finding works', to: '/features/email-finder' },
    },
    {
      type: 'related',
      items: [
        { label: 'Cold email follow-ups', to: '/blog/cold-email-follow-ups', text: 'How many to send, how far apart and what to say.' },
        {
          label: 'How to find someone’s email address',
          to: '/blog/how-to-find-someones-email-address',
          text: 'Ways to find a work email before you write.',
        },
        { label: 'How to verify an email address', to: '/blog/how-to-verify-an-email-address', text: 'Check an address before you send to it.' },
        { label: 'Free email verifier', to: '/tools/email-verifier', text: 'Check an address’s format, domain and MX records.' },
      ],
    },
    {
      type: 'sources',
      items: [
        { label: 'Federal Trade Commission: CAN-SPAM Act, a compliance guide for business', url: FTC_CAN_SPAM, checked: CHECKED },
        { label: 'European Commission: Application of the GDPR', url: EC_GDPR_SCOPE, checked: CHECKED },
        { label: 'European Commission: Can data received from a third party be used for marketing?', url: EC_THIRD_PARTY, checked: CHECKED },
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
