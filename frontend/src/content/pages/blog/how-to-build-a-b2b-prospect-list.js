import { CREDIT_COSTS, LIVE, formatCount } from '../../../data/facts.js';
import { FREE_PLAN_MONTHLY_CREDITS } from '../../../data/plans.js';

const CHECKED = '2026-09-28';

// What a reveal gives when no address is on file (backend revealService.js):
// one first.last@domain guess, checked only when a verifier is configured.
const GUESS_NOTE = LIVE.emailVerification
  ? 'If no address is on file, DataPit makes one first.last guess and checks it with a verifier.'
  : 'If no address is on file, you get one first.last guess marked unverified, and the reveal is still charged.';

export default {
  meta: {
    path: '/blog/how-to-build-a-b2b-prospect-list',
    section: 'blog',
    name: 'How to build a B2B prospect list',
    title: 'How to Build a B2B Prospect List in 8 Steps | DataPit',
    description:
      'Build a B2B prospect list step by step: define your ICP, choose filters, pick sources, size and segment the list, check emails and follow GDPR and CAN-SPAM.',
    updated: '2026-09-28',
    published: true,
    station: 'crystals',
  },
  hero: {
    eyebrow: 'Guide',
    lines: ['How to build a', 'B2B prospect list'],
    sub: 'Start by writing down your ideal customer profile. Turn it into filters: job title, seniority, department, industry, headcount and location. Pull matching people from your sources, then split them into small segments you can research. Check every address before you send, refresh the list before you reuse it and follow the email rules where your prospects live.',
    primary: { label: 'Start free', to: '/login?mode=register' },
    secondary: { label: 'Check an email free', to: '/tools/email-verifier' },
  },
  blocks: [
    {
      type: 'callout',
      title: 'In short',
      text: 'A prospect list names the people you plan to contact, where they work and why they fit. Build it from your best customers outward: describe them, find people like them, then split the result into small segments. Check every address before the first email.',
    },

    { type: 'h2', text: 'What is a B2B prospect list?' },
    {
      type: 'p',
      text: 'A B2B prospect list names people at companies that fit your ideal customer profile. Each row says who they are, how to reach them and why they’re on the list. Unlike leads, prospects haven’t shown interest yet.',
    },
    {
      type: 'table',
      caption: 'What to record for each prospect',
      head: ['Column', 'Why it matters'],
      rows: [
        ['Name and job title', 'Lets you address them and check they still do the job.'],
        ['Company and domain', 'Ties the person to an account, and to their email domain.'],
        ['Seniority and department', 'Shows whether they decide, influence or use.'],
        ['Industry, headcount, location', 'The company facts your segments depend on.'],
        ['Work email and status', 'Whether the address is confirmed, guessed or bounced.'],
        ['Source and date added', 'Where the record came from and how old it is, in case someone asks.'],
        ['Segment and reason', 'Which message they get, and why now.'],
      ],
    },

    { type: 'h2', text: 'How do you build a B2B prospect list?' },
    {
      type: 'steps',
      items: [
        {
          title: 'Define your ideal customer profile',
          text: 'Describe the companies that buy from you and stay: industry, size, location and the problem you solve.',
        },
        {
          title: 'Name the buyers',
          text: 'List who signs, who feels the problem and who uses the product.',
        },
        {
          title: 'Turn the profile into filters',
          text: 'Map it to job title, seniority, department, industry, headcount and location. Start narrow.',
        },
        {
          title: 'Choose your sources',
          text: 'Start with your CRM, then add company websites, LinkedIn and a B2B data provider.',
        },
        {
          title: 'Size the list to your capacity',
          text: 'Pull only as many people as you can contact well in the next few weeks.',
        },
        {
          title: 'Segment it',
          text: 'Group prospects who share a role, industry or reason to buy, and write one message per group.',
        },
        {
          title: 'Check every address',
          text: 'Remove duplicates, run a verifier and send a small first batch before the rest.',
        },
        {
          title: 'Keep it clean and compliant',
          text: 'Remove bounces and opt-outs at once, and follow the email rules where each prospect lives.',
        },
      ],
    },

    { type: 'h2', text: 'How do you define your ideal customer profile?' },
    {
      type: 'p',
      text: 'An ideal customer profile, or ICP, describes the companies you serve best, not the people in them. Build it from evidence, not from the logos you wish you had.',
    },
    {
      type: 'list',
      items: [
        '**Start from your best customers.** Pick the ten to twenty accounts that bought fastest, stayed longest or grew, and look for what they share.',
        '**Record the company facts:** industry, headcount, location and business model.',
        '**Name the problem** you solve for them in one sentence, in their words. It becomes the core of your message.',
        '**Write the disqualifiers,** such as too small to afford you or a region you can’t serve.',
        '**Test it against lost deals.** If most lost deals also match, the profile is too broad.',
      ],
    },

    { type: 'h2', text: 'Which filters should you use to build a prospect list?' },
    {
      type: 'p',
      text: 'Filters turn the profile into a search. Use company filters to pick the accounts, then people filters to pick the buyers inside them.',
    },
    {
      type: 'table',
      head: ['Filter', 'Use it to', 'Watch out for'],
      rows: [
        ['Job title', 'Find the exact roles you sell to.', 'One job has many titles, such as “RevOps” and “Revenue Operations”.'],
        ['Seniority', 'Reach decision makers, or the people who feel the problem.', 'Titles inflate at small firms. A VP there may run a team of two.'],
        ['Department', 'Stay within the function you serve.', 'Small companies often have no separate team.'],
        ['Industry', 'Match sectors where you have customer stories.', 'Labels are broad and differ between data sources.'],
        ['Headcount', 'Match company size to your price.', 'Ranges are estimates, and fast-growing firms outgrow them.'],
        ['Location', 'Match time zones, languages and laws.', 'A person may not work from the company’s head office.'],
      ],
    },

    { type: 'h2', text: 'Where do B2B prospect lists come from?' },
    {
      type: 'list',
      items: [
        '**Your own CRM.** Past customers, lost deals and old conversations already know your name. Check each record is current.',
        '**Customer lookalikes.** Companies that resemble your best accounts in industry, size and location.',
        '**Company websites.** Team pages, press releases and job posts show who does what, and the email format.',
        '**LinkedIn.** Profiles show the title and employer a person lists, which you can compare with your other sources.',
        '**Events.** Speaker and sponsor lists show who is active in your market. Attendees usually didn’t share their details for your outreach, so don’t mail the list.',
        '**B2B data providers.** Contact databases let you filter by role and company. Coverage varies by market, so [test a provider](/blog/how-to-choose-a-b2b-data-provider) before you buy.',
      ],
    },
    {
      type: 'p',
      text: `In [DataPit](/features/people-search), searching people by job title, seniority, department and the company’s industry and location is free, with emails masked. Revealing a contact costs ${CREDIT_COSTS.REVEAL} credits in the app. ${GUESS_NOTE} A CSV export costs ${CREDIT_COSTS.CSV_EXPORT} credits per file, and contacts you haven’t revealed stay masked in it. Opening a company’s full profile costs ${CREDIT_COSTS.COMPANY_VIEW} credits the first time your workspace views it.`,
    },
    { type: 'dataCoverage' },

    { type: 'h2', text: 'How big should a B2B prospect list be?' },
    {
      type: 'p',
      text: 'Big enough to fill the next few weeks of outreach, and no bigger. For example, one rep writing 20 researched emails a day for four working weeks needs about 400 prospects, not 4,000.',
    },
    {
      type: 'p',
      text: 'Start with a test segment of 50 to 100 people. If replies confirm the profile, build the next segment with the same filters.',
    },

    { type: 'h2', text: 'How should you segment a prospect list?' },
    {
      type: 'p',
      text: 'A segment is a group who can get the same message without it feeling generic. Split by what changes the message:',
    },
    {
      type: 'list',
      items: [
        '**Role.** A finance leader and a sales manager want different results.',
        '**Industry.** Customer stories land better from the reader’s own sector.',
        '**Company size.** A 30-person firm and a 3,000-person firm buy differently.',
        '**Reason to write now.** A new job, an expansion or an announcement tied to the problem you solve.',
        '**Region.** Time zones decide when you send, and local law decides what each email must include.',
      ],
    },
    {
      type: 'p',
      text: 'For wording, see [cold email templates](/blog/cold-email-templates).',
    },

    { type: 'h2', text: 'How do you check email addresses before outreach?' },
    {
      type: 'p',
      text: 'Yahoo’s sender guidance tells senders to monitor hard and soft bounces and to remove invalid recipients promptly.',
    },
    {
      type: 'steps',
      items: [
        {
          title: 'Remove duplicates',
          text: 'Merge people who appear twice, and keep the work address.',
        },
        {
          title: 'Treat guesses as unconfirmed',
          text: 'An address from a real exchange is stronger than one built from a pattern like first.last@company.com.',
        },
        {
          title: 'Run a verifier',
          text: 'A [free email verifier](/tools/email-verifier) checks the format, the domain and its mail servers, and flags disposable and role addresses.',
        },
        {
          title: 'Send a small first batch',
          text: 'Watch the [bounce rate](/blog/email-bounce-rate) before you send the rest, and suppress hard bounces for good.',
        },
      ],
    },
    {
      type: 'p',
      text: 'No verifier can prove a mailbox exists, as [how to verify an email address](/blog/how-to-verify-an-email-address) explains. For your sending setup, see [cold email deliverability](/blog/cold-email-deliverability).',
    },

    { type: 'h2', text: 'How do you keep a prospect list fresh?' },
    {
      type: 'p',
      text: 'People change jobs, so a list starts to age the day you build it. The Bureau of Labor Statistics says US wage and salary workers had a median of 4.1 years with their current employer in January 2026. For workers aged 25 to 34, it was 3.0 years.',
    },
    {
      type: 'list',
      items: [
        '**Record the source and date** for every contact.',
        '**Re-check addresses and titles** before you reuse a list after a gap.',
        '**Follow people who move.** A customer contact who changes jobs can become a prospect at their new company.',
        '**Keep a suppression list** of bounces and opt-outs, and check every new import against it.',
      ],
    },

    { type: 'h2', text: 'What are the compliance basics for prospect lists?' },
    {
      type: 'p',
      text: 'The rules depend on where your prospects are. This is a summary, not legal advice.',
    },
    { type: 'h3', text: 'EU and UK: GDPR' },
    {
      type: 'p',
      text: 'A work email that identifies a person, like jane.doe@company.com, is personal data even in a business context, says the UK regulator, the ICO. Legitimate interest can be a lawful basis, but the European Commission says only after checking the person’s rights aren’t seriously affected.',
    },
    {
      type: 'p',
      text: 'Data from a third party must have been collected lawfully and cleared for marketing. Tell people you hold their data by your first message at the latest, and stop if they object.',
    },
    { type: 'h3', text: 'UK: PECR' },
    {
      type: 'p',
      text: 'PECR’s email marketing rule doesn’t apply to companies, so you can email them without consent. Sole traders and some partnerships need consent or the soft opt-in. Always say who you are and offer an opt-out.',
    },
    { type: 'h3', text: 'US: CAN-SPAM' },
    {
      type: 'p',
      text: 'CAN-SPAM makes no exception for B2B email. Commercial messages need honest headers and subject lines, a clear ad notice, a postal address and a working opt-out. Honor opt-outs within 10 business days.',
    },
    {
      type: 'p',
      text: 'The FTC puts the penalty at up to $53,088 for each email that breaks the law.',
    },
    { type: 'h3', text: 'California: CCPA' },
    {
      type: 'p',
      text: 'The CCPA’s exemptions for business-to-business data expired on December 31, 2022. California residents can ask covered businesses what data they hold, and ask them to delete it.',
    },

    {
      type: 'faq',
      items: [
        {
          q: 'What is a B2B prospect list?',
          a: 'A list of named people at companies that fit your ideal customer profile, with contact details and a reason to reach out. Unlike leads, they haven’t shown interest yet.',
        },
        {
          q: 'How many contacts should a prospect list have?',
          a: 'As many as you can contact well in the next few weeks. Start with a test segment of 50 to 100 people.',
        },
        {
          q: 'What is the difference between an ICP and a buyer persona?',
          a: 'An ICP describes the companies you serve best. A persona describes the people inside them who buy or use your product.',
        },
        {
          q: 'Can I buy a B2B prospect list?',
          a: 'You can buy access to B2B contact data, but you stay responsible for how you use it, says the UK regulator, the ICO. [How to choose a B2B data provider](/blog/how-to-choose-a-b2b-data-provider) lists what to ask the supplier.',
        },
        {
          q: 'Is it legal to email people on a B2B prospect list?',
          a: 'It can be, if you follow the rules where each prospect lives. In the US, that includes CAN-SPAM. In the EU and UK, you need a lawful basis and must tell people they can object.',
        },
      ],
    },
    {
      type: 'cta',
      title: 'Build your prospect list in DataPit',
      text: `Searching people by title, seniority, department and company is free. Revealing a contact costs ${CREDIT_COSTS.REVEAL} credits in the app, and the Free plan includes ${formatCount(FREE_PLAN_MONTHLY_CREDITS)} credits a month.`,
      primary: { label: 'Start free', to: '/login?mode=register' },
      secondary: { label: 'See pricing', to: '/pricing' },
    },
    {
      type: 'related',
      items: [
        {
          label: 'How to choose a B2B data provider',
          to: '/blog/how-to-choose-a-b2b-data-provider',
          text: 'A buyer’s checklist: coverage, accuracy, pricing and data rights.',
        },
        {
          label: 'People search',
          to: '/features/people-search',
          text: 'Filter DataPit by title, seniority, department and company.',
        },
        {
          label: 'How to verify an email address',
          to: '/blog/how-to-verify-an-email-address',
          text: 'What each check proves, and what it can’t.',
        },
        {
          label: 'Email bounce rate',
          to: '/blog/email-bounce-rate',
          text: 'What a bounce rate tells you, and what to do about it.',
        },
      ],
    },
    {
      type: 'sources',
      items: [
        {
          label: 'ICO: Business-to-business marketing',
          url: 'https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/business-to-business-marketing/',
          checked: CHECKED,
        },
        {
          label: 'ICO: Organisations using marketing services of data brokers: what you need to know',
          url: 'https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/organisations-using-marketing-services-of-data-brokers/',
          checked: CHECKED,
        },
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
          label: 'FTC: CAN-SPAM Act: A Compliance Guide for Business',
          url: 'https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business',
          checked: CHECKED,
        },
        {
          label: 'California Attorney General: California Consumer Privacy Act (CCPA)',
          url: 'https://oag.ca.gov/privacy/ccpa',
          checked: CHECKED,
        },
        {
          label: 'US Bureau of Labor Statistics: Employee Tenure Summary',
          url: 'https://www.bls.gov/news.release/tenure.nr0.htm',
          checked: CHECKED,
        },
        {
          label: 'Yahoo Sender Hub: Sender best practices',
          url: 'https://senders.yahooinc.com/best-practices/',
          checked: CHECKED,
        },
      ],
    },
  ],
};
