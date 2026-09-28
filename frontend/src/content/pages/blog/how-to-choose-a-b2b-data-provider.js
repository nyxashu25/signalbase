import { formatCount } from '../../../data/facts.js';
import { FREE_PLAN_MONTHLY_CREDITS, PLANS } from '../../../data/plans.js';

const CHECKED = '2026-09-28';

// The lowest paid seat-block price, for the closing call to action.
const LOWEST_PAID = PLANS.filter((p) => p.block)[0];

export default {
  meta: {
    path: '/blog/how-to-choose-a-b2b-data-provider',
    section: 'blog',
    name: 'How to choose a B2B data provider',
    title: 'How to Choose a B2B Data Provider: 9 Checks | DataPit',
    description:
      'A fair checklist for choosing a B2B data provider: test coverage on your own sample, ask how accuracy is measured, compare pricing and check data rights.',
    updated: '2026-09-28',
    published: true,
    station: 'crystals',
  },
  hero: {
    eyebrow: 'Guide',
    lines: ['How to choose a', 'B2B data provider'],
    sub: 'Test each B2B data provider on a sample of your own target accounts before you buy. Ask how it measures accuracy, what one credit buys and what else costs credits. Compare the total cost for your team, not the headline price. Then check where the data comes from, how opt-outs are handled and which tools it connects to.',
    primary: { label: 'Start free', to: '/login?mode=register' },
    secondary: { label: 'See pricing', to: '/pricing' },
  },
  blocks: [
    {
      type: 'callout',
      title: 'In short',
      text: 'No provider covers every market equally well, so the test that counts is your own. Look up 50 to 100 people you already know in each provider, then send a small batch and count the bounces. Compare the cost per usable contact, the data rights and the contract terms.',
    },

    { type: 'h2', text: 'What does a B2B data provider do?' },
    {
      type: 'p',
      text: 'A B2B data provider sells access to records about people and companies. A typical record holds a name, job title, work email, phone number and company facts such as industry and headcount. You reach it through a web app, a browser extension, exports, an API or a CRM sync.',
    },
    {
      type: 'p',
      text: 'Common sources include public web pages, partner files, contact data shared by users of the provider’s tools and addresses built from email patterns. The mix affects accuracy, coverage and your legal position, so ask about it.',
    },

    { type: 'h2', text: 'What should you check before choosing a B2B data provider?' },
    {
      type: 'table',
      caption: 'The checklist at a glance',
      head: ['Check', 'What good looks like', 'Red flag'],
      rows: [
        ['Coverage', 'It finds most of your own sample, in your regions and company sizes.', 'A total record count with no breakdown for your market.'],
        ['Accuracy', 'It says what accuracy means, and how and when it was measured.', 'A single percentage with no method behind it.'],
        ['Freshness', 'Records show when they were last updated.', 'No way to tell a new record from an old one.'],
        ['Pricing model', 'Published prices, or a quote you can compare line by line.', 'Add-ons you only hear about after signing.'],
        ['What a credit buys', 'A written list of every action that costs credits.', 'Unclear charges for guesses, repeat views or bounces.'],
        ['Data rights', 'It explains its sources and passes on opt-outs.', 'It can’t say where a record came from.'],
        ['Integrations', 'It connects to your CRM and tools on the plan you’d buy.', 'The sync you need sits on a higher tier.'],
        ['Trial or free plan', 'Enough access to test real records you choose.', 'A demo on sample data picked for you.'],
        ['Contract terms', 'Clear rules for renewal, cancellation and seat changes.', 'Automatic renewal with a notice period nobody mentioned.'],
      ],
    },

    { type: 'h2', text: 'How do you test coverage for your market?' },
    {
      type: 'p',
      text: 'Coverage is the share of the people you want that a provider actually has. A large total means little if your market is thin in it, so test with your own sample.',
    },
    {
      type: 'steps',
      items: [
        {
          title: 'Build a test set',
          text: 'Pick 50 to 100 people whose details you already know, across every region and company size you sell to.',
        },
        {
          title: 'Look up each person',
          text: 'Search for the same people in every provider. Note whether it finds them, has a work email and, if you need one, a direct phone.',
        },
        {
          title: 'Check the answers',
          text: 'Compare titles, employers and emails with what you know. A record showing last year’s job counts as a miss.',
        },
        {
          title: 'Test discovery',
          text: 'Run your ideal customer filters and read the first 20 results by hand. Count how many you would actually contact.',
        },
        {
          title: 'Score each segment',
          text: 'A provider can be strong in one region and thin in another, so score each segment.',
        },
      ],
    },

    { type: 'h2', text: 'How is B2B data accuracy measured?' },
    {
      type: 'p',
      text: 'Accuracy claims are hard to compare, because providers measure different things. Ask what the number describes, how it was measured and when.',
    },
    {
      type: 'list',
      items: [
        '**Accurate for what?** A deliverable email, the person still in the role and a phone that connects are three different tests.',
        '**Measured how?** Ask for the sample size, the date and who ran the test.',
        '**What does “verified” mean?** Checked when collected, checked when you reveal it, or reviewed by a person? Ask which, and when.',
        '**What about catch-all domains?** Some mail servers accept any address, so no check can confirm the mailbox. Ask how those are labelled.',
        '**What if data is wrong?** Ask whether bounced or wrong contacts are refunded, and under what rules.',
      ],
    },
    {
      type: 'p',
      text: 'Then measure it yourself: send a small batch from the trial and count the hard bounces. [Email bounce rate](/blog/email-bounce-rate) explains the calculation, and [how to verify an email address](/blog/how-to-verify-an-email-address) covers what checks can prove.',
    },

    { type: 'h2', text: 'How do B2B data providers price their data?' },
    {
      type: 'p',
      text: 'Most providers use one of four models, and many combine them. The model changes what a team of your size really pays.',
    },
    {
      type: 'table',
      head: ['Model', 'How it works', 'Watch for'],
      rows: [
        ['Per seat', 'A price for each user, often with credits for each user.', 'The cost grows with every person who needs access.'],
        ['Per account', 'One price for the company, with a shared pool of credits.', 'User limits, and one heavy user draining the pool.'],
        ['Credits or pay as you go', 'You buy credits and spend them on actions, such as revealing an email.', 'Which actions cost credits, and whether unused credits expire.'],
        ['Quote only', 'The price comes after a sales call, usually on an annual contract.', 'Minimum seats, automatic renewal and separately priced add-ons.'],
      ],
      note: 'Phone numbers often cost more credits than emails, and API access or CRM sync may sit on a higher tier. Ask for each in the quote.',
    },
    {
      type: 'p',
      text: 'Add up twelve months for your real team: seats, credits, add-ons and minimums. Divide by the usable contacts your test suggests you’ll get, and compare that figure.',
    },

    { type: 'h2', text: 'What counts as a credit?' },
    {
      type: 'p',
      text: 'Two providers can both charge “one credit per contact” and cost very different amounts. Get the rules in writing:',
    },
    {
      type: 'list',
      items: [
        'Which actions cost credits: viewing, revealing, exporting, enriching or calling the API.',
        'Whether a phone number costs more than an email.',
        'Whether a teammate opening the same contact pays again.',
        'Whether you pay when no email is found, or when the email is a pattern guess.',
        'Whether bounced or wrong contacts are refunded.',
        'Whether credits roll over, expire or reset each month.',
        'Whether credits belong to each user or sit in a shared pool.',
        'Whether you can see what each credit was spent on.',
      ],
    },

    { type: 'h2', text: 'What should you check about data rights and compliance?' },
    {
      type: 'p',
      text: 'Buying access to data doesn’t hand your legal duties to the provider. The UK regulator, the ICO, says accepting a data broker’s assurances isn’t enough, so make your own checks.',
    },
    {
      type: 'list',
      items: [
        '**Where did the data come from?** Directly from people, from public sources or from other companies?',
        '**What were people told** when their data was collected?',
        '**How old is it,** and when was each record last checked?',
        '**Are opt-outs honored?** Ask how people remove themselves, and whether objections reach customers who already hold the data.',
        '**Is it registered?** California requires data brokers, businesses selling data on people they have no direct relationship with, to register yearly.',
        '**What does the license allow?** Check what you may do with exported contacts, and whether you must delete them if you cancel.',
      ],
    },
    {
      type: 'p',
      text: 'Your own duties stay the same whatever the source. Under GDPR, the European Commission says third-party data must have been collected lawfully and cleared for marketing. Tell people by your first message at the latest, and stop if they object.',
    },
    {
      type: 'p',
      text: 'In California, the CCPA’s exemptions for business-to-business data expired at the end of 2022. Contacts there can ask a covered business what it holds, and ask for deletion.',
    },
    {
      type: 'p',
      text: 'Yahoo’s sender guidance tells senders not to purchase mailing lists. Treat a provider’s data as a starting point for research, not a list to mail in bulk.',
    },

    { type: 'h2', text: 'Which integrations matter?' },
    {
      type: 'p',
      text: 'List the tools your team already uses, and check each connection on the plan you’d actually buy.',
    },
    {
      type: 'list',
      items: [
        '**CRM sync.** Does it sync with your CRM without duplicates, one way or both? Ask to see it work with your own CRM.',
        '**Browser extension.** Useful for research on LinkedIn or company websites. Check what each lookup costs.',
        '**CSV export.** The fallback when there’s no sync. Check the row limit, the fields and the cost.',
        '**API.** Ask what it can do, its rate limits and which plans include it.',
        '**Admin controls.** Larger teams may need single sign-on, roles and spending limits. Check which tier has them.',
      ],
    },

    { type: 'h2', text: 'How do you get the most from a trial or free plan?' },
    {
      type: 'steps',
      items: [
        {
          title: 'Write the test first',
          text: 'Decide what you’ll measure before you start: coverage on your sample, accuracy and bounce rate.',
        },
        {
          title: 'Use the same sample everywhere',
          text: 'Run the same people through every provider you test, so the results compare fairly.',
        },
        {
          title: 'Test the daily workflow',
          text: 'Have the people who will use it search, export and sync as they would at work.',
        },
        {
          title: 'Check how the trial ends',
          text: 'Find out whether it turns into a paid plan automatically, what happens to your data and how to cancel.',
        },
      ],
    },
    {
      type: 'p',
      text: 'Once you’ve chosen, [build your prospect list](/blog/how-to-build-a-b2b-prospect-list) in small segments, and check every address before the first send.',
    },

    {
      type: 'faq',
      items: [
        {
          q: 'What is a B2B data provider?',
          a: 'A company that sells access to records about business contacts and companies. Sales and marketing teams use it to find potential customers.',
        },
        {
          q: 'How do I compare B2B data providers fairly?',
          a: 'Run the same 50 to 100 known contacts through each one. Compare how many it finds, how many details are right and how many emails bounce, then the cost per usable contact.',
        },
        {
          q: 'Is buying B2B contact data legal under GDPR?',
          a: 'It can be. The supplier must have collected the data lawfully and cleared it for marketing. You need your own lawful basis, must tell people at first contact and must stop if they object.',
        },
        {
          q: 'Are free B2B data tools any good?',
          a: 'A free plan lets you run your own test at no cost. Check the limits: monthly credits, which fields you get and whether you can export.',
        },
        {
          q: 'Is per-seat or credit-based pricing cheaper?',
          a: 'It depends on how many people need access and how many contacts each uses. Price both for your real team over twelve months, including add-ons.',
        },
      ],
    },
    {
      type: 'cta',
      title: 'Try DataPit free',
      text: `DataPit publishes its prices and what each action costs in credits. The Free plan includes ${formatCount(FREE_PLAN_MONTHLY_CREDITS)} credits a month, and paid seat blocks start at $${LOWEST_PAID.price} a month.`,
      primary: { label: 'Start free', to: '/login?mode=register' },
      secondary: { label: 'See pricing', to: '/pricing' },
    },
    {
      type: 'related',
      items: [
        {
          label: 'How to build a B2B prospect list',
          to: '/blog/how-to-build-a-b2b-prospect-list',
          text: 'Define your ICP, choose filters and keep the list clean.',
        },
        {
          label: 'How to verify an email address',
          to: '/blog/how-to-verify-an-email-address',
          text: 'What each check proves, and what it can’t.',
        },
        {
          label: 'Email bounce rate',
          to: '/blog/email-bounce-rate',
          text: 'How to measure the bounces from a trial send.',
        },
        {
          label: 'DataPit pricing',
          to: '/pricing',
          text: 'Published seat-block prices and credit costs.',
        },
      ],
    },
    {
      type: 'sources',
      items: [
        {
          label: 'ICO: Organisations using marketing services of data brokers: what you need to know',
          url: 'https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/organisations-using-marketing-services-of-data-brokers/',
          checked: CHECKED,
        },
        {
          label: 'ICO: Direct marketing guidance: Collect information and generate leads',
          url: 'https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/direct-marketing-guidance/collect-information-and-generate-leads/',
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
          label: 'California Attorney General: California Consumer Privacy Act (CCPA)',
          url: 'https://oag.ca.gov/privacy/ccpa',
          checked: CHECKED,
        },
        {
          label: 'California Privacy Protection Agency: Information for data brokers',
          url: 'https://cppa.ca.gov/data_brokers/',
          checked: CHECKED,
        },
        {
          label: 'California Privacy Protection Agency: Data Broker Registry',
          url: 'https://cppa.ca.gov/data_broker_registry/',
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
