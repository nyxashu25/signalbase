import { CREDIT_COSTS, LIVE, formatCount } from '../../../data/facts.js';
import { FREE_PLAN_MONTHLY_CREDITS } from '../../../data/plans.js';

const CHECKED = '2026-09-28';

// What a reveal gives you when DataPit has no address on file: a single
// first.last@domain guess, checked by a verifier only when one is configured
// (backend revealService.js / emailVerifierService.js).
const GUESS_SENTENCE = LIVE.emailVerification
  ? 'When DataPit has no address on file, it applies the first.last pattern and checks the result with a verifier. If the verifier rejects it, your credits are refunded.'
  : 'When DataPit has no address on file, the reveal gives you a first.last guess at the company’s domain, charged as a normal reveal. The guess carries no Verified badge, so check it before you send.';

export default {
  meta: {
    path: '/blog/how-to-find-someones-email-address',
    section: 'blog',
    name: 'How to find someone’s email address',
    title: "How to Find Someone's Email Address: 6 Ways | DataPit",
    description:
      "Six ways to find someone's work email address, from company websites and email patterns to finder tools, plus how to check it and the cold email rules.",
    updated: '2026-09-28',
    published: true,
    station: 'crystals',
  },
  hero: {
    eyebrow: 'Guide',
    lines: ['How to find', 'someone’s email'],
    sub: 'Start with the company website, then work out the company’s email pattern, like first.last@company.com, and apply it to the person’s name. If that fails, check LinkedIn and other public profiles, use an email finder or ask a mutual contact. Check the address before you send, and follow the cold email rules where your recipient lives.',
    primary: { label: 'Start free', to: '/login?mode=register' },
    secondary: { label: 'Check an email free', to: '/tools/email-verifier' },
  },
  blocks: [
    {
      type: 'callout',
      title: 'In short',
      text: 'Most companies build every address the same way. Find one real address at the company, apply its pattern to your person’s name and check the result with a [free email verifier](/tools/email-verifier). When there’s no pattern to copy, try public profiles, an email finder or a mutual contact.',
    },

    { type: 'h2', text: 'What are the ways to find someone’s email address?' },
    {
      type: 'table',
      head: ['Method', 'Works best when', 'Watch out for'],
      rows: [
        [
          'Company website',
          'The company lists its team, authors or press contacts.',
          'Small sites often list only a general inbox.',
        ],
        [
          'Email pattern',
          'You can find one real address at the same company.',
          'Nicknames, shared names and older formats.',
        ],
        [
          'LinkedIn and profiles',
          'You’re connected, or the person links to their own website.',
          'Most viewers can’t see a member’s email by default.',
        ],
        [
          'Email finder tool',
          'You need contacts at many companies at once.',
          'Guessed addresses mixed in with confirmed ones.',
        ],
        [
          'Public sources',
          'The person writes, speaks or publishes.',
          'Addresses shared for one purpose, like press questions.',
        ],
        [
          'Mutual contact',
          'You share a colleague, customer or investor.',
          'It’s slower, and it costs your contact a favor.',
        ],
      ],
      note: 'Whichever method you use, [check the address](/blog/how-to-verify-an-email-address) before you send.',
    },

    { type: 'h2', text: 'How do you find an email address on a company website?' },
    {
      type: 'p',
      text: 'Start on the company’s own site, because an address found there is one the company chose to publish. Look beyond the contact page.',
    },
    {
      type: 'list',
      items: [
        '**Team, about and leadership pages.** Some list an email under each name, or link to a profile that does.',
        '**Blog author bios.** Writers often include an address so readers can reply.',
        '**Press and newsroom pages.** Media contacts are listed by name, which also shows you the company’s pattern.',
        '**Job postings.** Some ask applicants to email a named recruiter or hiring manager.',
        '**PDFs.** Reports, brochures and price lists often carry a named sales contact.',
      ],
    },
    {
      type: 'p',
      text: 'A search engine can do the digging for you. Search **site:company.com "@company.com"** to find pages on the site that mention an address. Or search the person’s full name together with **"@company.com"**.',
    },

    { type: 'h2', text: 'How do you work out a company’s email format?' },
    {
      type: 'p',
      text: 'Most organizations give everyone an address in the same format. Find any one real address at the company, from its website, a press release or an email you’ve received. Match it to its owner’s name, and you have the pattern.',
    },
    {
      type: 'table',
      caption: 'Common email formats',
      head: ['Pattern', 'Example for Jane Doe'],
      rows: [
        ['first.last', 'jane.doe@company.com'],
        ['first', 'jane@company.com'],
        ['firstlast', 'janedoe@company.com'],
        ['flast', 'jdoe@company.com'],
        ['f.last', 'j.doe@company.com'],
        ['firstl', 'janed@company.com'],
        ['first_last', 'jane_doe@company.com'],
        ['last.first', 'doe.jane@company.com'],
      ],
    },
    {
      type: 'p',
      text: 'A pattern is a strong clue, not proof. Two people with the same name can’t share an address, so one of them gets a middle initial or a number. People also go by nicknames, and long-serving staff sometimes keep an address in an older format.',
    },
    {
      type: 'p',
      text: 'Check the domain as well. Some companies send email from a different domain than their website uses, and subsidiaries often keep their own.',
    },

    { type: 'h2', text: 'How do you check a guessed email address?' },
    {
      type: 'steps',
      items: [
        {
          title: 'Run it through an email verifier',
          text: 'The [free DataPit email verifier](/tools/email-verifier) checks the format, the domain and its mail servers. It also flags disposable addresses and role addresses like info@. It doesn’t store what you check.',
        },
        {
          title: 'Search for the exact address',
          text: 'Put the address in quotes in a search engine. A match on a real page, like a conference agenda or a public document, is good evidence.',
        },
        {
          title: 'Know what a check can’t prove',
          text: 'No outside tool can confirm that a mailbox exists. Some domains accept mail for any name, so a guess can pass every check and still never reach a person.',
        },
        {
          title: 'Send one careful email first',
          text: 'If the mail server rejects the address, a bounce message comes back to you. Don’t email a batch of guessed variations: wrong guesses bounce, and bounces hurt your sender reputation.',
        },
      ],
    },

    { type: 'h2', text: 'Can you find someone’s email address on LinkedIn?' },
    {
      type: 'p',
      text: 'Sometimes. By default, LinkedIn shows a member’s primary email address only to their direct connections. It’s the address they registered with, so it may be personal rather than work.',
    },
    {
      type: 'p',
      text: 'A profile is still useful. It confirms the person’s exact name and current employer, which are the inputs for the pattern method. Many profiles also link to a personal website with a contact page.',
    },
    {
      type: 'p',
      text: `If you use DataPit, the free [Chrome extension](/chrome-extension) checks the LinkedIn profile you’re viewing against DataPit. If the person is in the database, you can reveal their work email for ${CREDIT_COSTS.EXTENSION_REVEAL} credits. Or skip email altogether: a short LinkedIn message reaches the same person.`,
    },

    { type: 'h2', text: 'Do email finder tools work?' },
    {
      type: 'p',
      text: 'An email finder takes a name and a company and returns an address. It either looks the person up in its own contact database or applies the company’s pattern to the name. Results depend on the size and upkeep of that database, so ask each tool how it sources and checks its data.',
    },
    {
      type: 'p',
      text: 'A useful tool tells you which addresses were confirmed and which were guessed. Check a guessed address before you send, as you would your own.',
    },
    {
      type: 'p',
      text: `In [DataPit](/features/email-finder), searching people by name, job title and company is free. Results show masked emails, and revealing one costs ${CREDIT_COSTS.REVEAL} credits. Once anyone on your team reveals a contact, it’s free for the whole workspace.`,
    },
    { type: 'dataCoverage' },
    { type: 'p', text: GUESS_SENTENCE },

    { type: 'h2', text: 'Where else can you find someone’s email address?' },
    {
      type: 'list',
      items: [
        '**A personal website or newsletter.** Consultants, founders and writers often publish a contact address.',
        '**Articles and research papers.** Academic papers usually name a corresponding author with an email address.',
        '**Press releases.** The media contact at the bottom is a real person at the company.',
        '**Event and podcast pages.** Speaker bios and show notes sometimes include contact details.',
        '**Social profiles.** Some people put an address in their bio on X, GitHub or a portfolio site.',
      ],
    },
    {
      type: 'p',
      text: 'Respect the context an address was shared in. A press contact is there for journalists, and a paper’s address is there for questions about the research. Using it for an unrelated pitch is a quick way to be ignored or reported.',
    },

    { type: 'h2', text: 'Should you ask a mutual contact instead?' },
    {
      type: 'p',
      text: 'Often, yes. A colleague, customer or investor you share can forward a short note or introduce you. The person then hears about you from someone they already trust.',
    },
    {
      type: 'p',
      text: 'Make it easy for the connector: send two or three sentences they can forward as they are. With no mutual contact, ask the company’s general inbox who handles your topic.',
    },

    { type: 'h2', text: 'Is it legal to find and email someone’s work address?' },
    {
      type: 'p',
      text: 'It can be, if you follow the rules where your recipient lives. They cover how you store and use the address, and what each message must include. This is a summary, not legal advice.',
    },
    { type: 'h3', text: 'EU and UK: GDPR' },
    {
      type: 'p',
      text: 'A work address that identifies a person, like jane.doe@company.com, is personal data. The UK regulator, the ICO, says this holds even when someone acts in a business capacity.',
    },
    {
      type: 'p',
      text: 'Legitimate interest can be a lawful basis for direct marketing. But the European Commission says you can rely on it only after checking that the person’s rights aren’t seriously affected.',
    },
    {
      type: 'p',
      text: 'You must tell people, at the latest in your first message, that you have their data and that they can object. If they object, stop. If you got the data from a third party, the supplier must be able to show it was collected lawfully.',
    },
    { type: 'h3', text: 'UK: PECR' },
    {
      type: 'p',
      text: 'The UK’s electronic marketing rules don’t require consent to email companies and limited liability partnerships. Sole traders and some partnerships count as individuals, so you need their consent unless the “soft opt-in” applies. Either way, say who you are and give a working opt-out address.',
    },
    { type: 'h3', text: 'US: CAN-SPAM' },
    {
      type: 'p',
      text: 'CAN-SPAM makes no exception for business-to-business email. The FTC lists rules that every commercial message must follow:',
    },
    {
      type: 'list',
      items: [
        'Use accurate From, To and Reply-To details, and a subject line that matches the message.',
        'Make clear that the message is an advertisement.',
        'Include a valid physical postal address.',
        'Tell people how to opt out, and honor requests within 10 business days.',
        'Monitor anyone who sends on your behalf, because you stay responsible.',
      ],
    },
    {
      type: 'p',
      text: 'The FTC puts the penalty at up to $53,088 for each email that breaks the law.',
    },

    { type: 'h2', text: 'How do you email someone you found without being a nuisance?' },
    {
      type: 'list',
      items: [
        'Say briefly how you found them if it isn’t obvious.',
        'Write about their job, not your product. One clear reason to reply beats three features.',
        'Follow up once or twice, then stop. See [cold email follow-ups](/blog/cold-email-follow-ups) for timing.',
        'Honor every request to stop, straight away.',
        'Don’t add people you found to a newsletter or a long sequence without asking.',
      ],
    },
    {
      type: 'p',
      text: 'For wording that works, see [cold email templates](/blog/cold-email-templates).',
    },

    {
      type: 'faq',
      items: [
        {
          q: 'Can I find someone’s email address for free?',
          a: `Yes. The company website, the email pattern, LinkedIn and public sources cost nothing, and the [free email verifier](/tools/email-verifier) needs no sign-up. DataPit’s Free plan includes ${formatCount(FREE_PLAN_MONTHLY_CREDITS)} credits a month for reveals.`,
        },
        {
          q: 'How do I find someone’s work email with only their name and company?',
          a: 'Find one real address at the company to learn its format, then apply it to the name. Check the result with an email verifier, and send a single email before any follow-ups.',
        },
        {
          q: 'How can I tell if an email address is real?',
          a: 'A verifier confirms the format, the domain and its mail servers. It can’t prove the mailbox exists, because some servers accept every address. A bounce proves an address is wrong, and a reply proves it’s right.',
        },
        {
          q: 'Is it legal to cold email someone at work?',
          a: 'It can be, if you follow the rules where your recipient lives. In the US, CAN-SPAM requires honest headers, a clear ad disclosure, a postal address and a working opt-out. In the EU and UK, you need a lawful basis such as legitimate interest, and you must tell people they can object.',
        },
        {
          q: 'Why did my guessed email address bounce?',
          a: 'The pattern was wrong for this person, they have left, or the company emails from another domain. Remove it and try another method instead of guessing variations.',
        },
      ],
    },
    {
      type: 'cta',
      title: 'Find work emails with DataPit',
      text: `Search people for free and reveal an email for ${CREDIT_COSTS.REVEAL} credits. The Free plan includes ${formatCount(FREE_PLAN_MONTHLY_CREDITS)} credits a month.`,
      primary: { label: 'Start free', to: '/login?mode=register' },
      secondary: { label: 'Check an email free', to: '/tools/email-verifier' },
    },
    {
      type: 'related',
      items: [
        {
          label: 'How to verify an email address',
          to: '/blog/how-to-verify-an-email-address',
          text: 'Each check, what it proves and what it can’t.',
        },
        {
          label: 'Chrome extension',
          to: '/chrome-extension',
          text: 'Look up the LinkedIn profile you’re viewing in DataPit.',
        },
        {
          label: 'Email finder',
          to: '/features/email-finder',
          text: 'Search DataPit by name, job title and company.',
        },
        {
          label: 'Cold email templates',
          to: '/blog/cold-email-templates',
          text: 'What to write once you have the address.',
        },
      ],
    },
    {
      type: 'sources',
      items: [
        {
          label: 'European Commission: Legal grounds for processing data',
          url: 'https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/legal-grounds-processing-data_en',
          checked: CHECKED,
        },
        {
          label: 'European Commission: Can data received from a third party be used for marketing?',
          url: 'https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/legal-grounds-processing-data/can-data-received-third-party-be-used-marketing_en',
          checked: CHECKED,
        },
        {
          label: 'European Commission: What happens if someone objects to my company processing their personal data?',
          url: 'https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/dealing-requests-individuals/what-happens-if-someone-objects-my-company-processing-their-personal-data_en',
          checked: CHECKED,
        },
        {
          label: 'ICO: Business-to-business marketing',
          url: 'https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/business-to-business-marketing/',
          checked: CHECKED,
        },
        {
          label: 'FTC: CAN-SPAM Act: A Compliance Guide for Business',
          url: 'https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business',
          checked: CHECKED,
        },
        {
          label: 'LinkedIn Help: Visibility of your email address',
          url: 'https://www.linkedin.com/help/linkedin/answer/a523134/visibility-of-your-email-address-on-linkedin',
          checked: CHECKED,
        },
      ],
    },
  ],
};
