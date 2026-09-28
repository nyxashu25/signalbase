import { CREDIT_COSTS, EXTENSION_STORE_URL, LIVE, MAX_SELF_SERVE_BLOCKS, formatCount } from '../../../data/facts.js';
import {
  BILLING_INTERVALS,
  FREE_PLAN_MONTHLY_CREDITS,
  FREE_SEAT_MONTHLY_CREDITS,
  PLANS,
} from '../../../data/plans.js';

// Cognism facts come from its own public pages, read on this date. Every
// Cognism price or feature below has its page in the sources block.
const CHECKED = '2026-09-28';

const plan = (key) => PLANS.find((p) => p.key === key);
const BASIC = plan('BASIC');
const PRO = plan('PROFESSIONAL');
const ORG = plan('ORGANIZATION');
const FREE_REVEALS = FREE_PLAN_MONTHLY_CREDITS / CREDIT_COSTS.REVEAL;
const pct = (key) => Math.round(BILLING_INTERVALS.find((i) => i.key === key).discount * 100);
const seatsPerBlock = (p) => p.block.paidSeats + p.block.freeSeats;
const blockSeats = (p) => `${p.block.paidSeats} paid + ${p.block.freeSeats} free`;

/** Monthly-billing cost of seating n people on plan p (anyone but the owner can take a free seat). */
function teamCost(p, n) {
  const blocks = Math.ceil(n / seatsPerBlock(p));
  return `$${formatCount(p.price * blocks)} a month (${blocks} ${blocks === 1 ? 'block' : 'blocks'})`;
}

export default {
  meta: {
    path: '/alternatives/cognism',
    section: 'alternatives',
    name: 'Cognism alternative',
    title: 'Cognism Alternative with Public Pricing | DataPit',
    description: `A Cognism alternative with public prices: DataPit seat blocks start at $${BASIC.price} a month, and a free plan has ${formatCount(FREE_PLAN_MONTHLY_CREDITS)} credits a month. See where Cognism fits better.`,
    updated: '2026-09-28',
    published: true,
    station: 'lens',
  },
  hero: {
    eyebrow: 'Cognism alternative',
    lines: ['A Cognism alternative', 'with public pricing'],
    sub: `DataPit is a Cognism alternative for teams that want to see a price and start without a sales call. It has a free plan with ${formatCount(FREE_PLAN_MONTHLY_CREDITS)} credits a month and seat blocks from $${BASIC.price} a month. Cognism is quote-only and lists no free plan, but it includes ${LIVE.phoneData ? '' : 'mobile numbers and '}CRM integrations, plus intent data on Pro.`,
  },
  blocks: [
    {
      type: 'callout',
      title: 'In short',
      text: `DataPit suits small teams that want public prices, monthly billing and a free plan to start on. Stay with Cognism if you call prospects, work from your CRM, or need intent data or ISO 27001 and SOC 2 certification.`,
    },

    { type: 'h2', text: 'Why do teams look for a Cognism alternative?' },
    {
      type: 'p',
      text: 'Cognism doesn’t publish prices for its Sales Prospecting packages. Its pricing page offers a personalised quote for two packages, Standard and Pro, each with 5 seats included. It doesn’t say whether billing is monthly or annual, or give a minimum term.',
    },
    {
      type: 'p',
      text: 'Each seat includes an allocation of credits, but the pricing page doesn’t give the number. One Cognism credit reveals one contact, and viewing a contact you’ve already revealed costs nothing. You can buy more credits at any point.',
    },
    {
      type: 'p',
      text: 'Cognism lists no free plan or free trial. Instead, you can request a free data sample through a form, and Cognism aims to send it within 72 hours. Its one published price is for CRM Enrichment, a separate product, from $12,000 a year.',
    },

    { type: 'h2', text: 'DataPit vs Cognism at a glance' },
    {
      type: 'table',
      head: ['Feature', 'DataPit', 'Cognism'],
      rows: [
        [
          'Pricing model',
          'Public prices. Paid plans are sold in seat blocks.',
          'Quote only, for the Standard and Pro packages.',
        ],
        [
          'Lowest paid price',
          `$${BASIC.price} a month for a ${BASIC.name} block (${blockSeats(BASIC)} seat)`,
          'Not published. CRM Enrichment, a separate product, starts from $12,000 a year.',
        ],
        [
          'Free plan',
          `Yes: 1 seat and ${formatCount(FREE_PLAN_MONTHLY_CREDITS)} credits a month`,
          'No free plan or trial listed. A free data sample on request.',
        ],
        [
          'How seats are counted',
          `Per block: ${BASIC.name} ${blockSeats(BASIC)}, ${PRO.name} ${blockSeats(PRO)}, ${ORG.name} ${blockSeats(ORG)}`,
          '5 seats included in each package. The pricing page doesn’t say how more seats are priced.',
        ],
        [
          'Credits',
          `Personal to each member: ${formatCount(BASIC.block.paidSeatCredits)} or ${formatCount(PRO.block.paidSeatCredits)} a month per paid seat, ${formatCount(FREE_SEAT_MONTHLY_CREDITS)} per free seat, plus an owner bonus on ${PRO.name} and ${ORG.name}`,
          'An allocation per seat, amount not stated on the pricing page. One credit reveals one contact.',
        ],
        [
          'Contacts already revealed',
          'Free for the whole workspace once anyone on the team reveals a contact',
          'No charge to view a contact you’ve already revealed. A credit is used again only if the contact changes jobs.',
        ],
        [
          'Email finding',
          LIVE.emailVerification
            ? 'The work email on file, or a first.last@ guess checked by a verifier'
            : 'The work email on file, or a first.last@ guess when none is on file. Not verified yet.',
          'Yes, in Standard and Pro. Cognism says it leaves personal email addresses out.',
        ],
        [
          'Phone numbers',
          LIVE.phoneData ? 'Yes, in the same reveal, where the record has one' : 'Not yet',
          'Mobiles in Standard and Pro. Pro adds a premium mobile filter and on-demand mobile verification.',
        ],
        [
          'Chrome extension',
          `Yes, free on the [Chrome Web Store](${EXTENSION_STORE_URL}). A reveal costs ${CREDIT_COSTS.EXTENSION_REVEAL} credits.`,
          'Yes, on the Chrome Web Store. Its listing says it syncs with Salesforce, HubSpot, Outreach and Salesloft.',
        ],
        [
          'Email sequences',
          LIVE.sequenceSending ? 'Yes, on paid plans' : 'Not yet',
          'Not listed. Cognism sends contacts to Outreach and Salesloft instead.',
        ],
        [
          'CRM integrations',
          'No',
          'Salesforce, HubSpot, Pipedrive, Microsoft Dynamics and Bullhorn, plus Outreach, Salesloft and Zapier',
        ],
        [
          'API',
          'No general API. API keys only connect the Chrome extension.',
          'A quote-priced add-on (Data-as-a-Service) that needs a Prospecting seat',
        ],
        ['Intent data', 'No', 'Pro only: Bombora Company Surge, up to 12 topics'],
        ['Single sign-on (SSO)', 'No', 'Yes, in Standard and Pro'],
      ],
      note: `Cognism details are from its public pages, checked on 28 September 2026. Where a Cognism cell names a package, only that package has it.`,
    },
    {
      type: 'p',
      text: 'Cognism gives no overall contact count. It says it has “hundreds of millions of company and contact profiles” and doesn’t usually make general coverage claims. Its page for smaller businesses claims 100M mobile numbers.',
    },
    { type: 'dataCoverage' },

    { type: 'h2', text: 'What does Cognism cost for a team compared with DataPit?' },
    {
      type: 'table',
      head: ['Team size', `DataPit ${BASIC.name}`, `DataPit ${PRO.name}`, `DataPit ${ORG.name}`, 'Cognism'],
      rows: [
        ['5 people', teamCost(BASIC, 5), teamCost(PRO, 5), teamCost(ORG, 5), 'Quote only (Standard or Pro, 5 seats included)'],
        ['10 people', teamCost(BASIC, 10), teamCost(PRO, 10), teamCost(ORG, 10), 'Quote only'],
        ['25 people', teamCost(BASIC, 25), teamCost(PRO, 25), teamCost(ORG, 25), 'Quote only'],
      ],
      note: `Prices only: the plans don’t include the same things. DataPit figures use monthly billing and fill each block’s free seats, which anyone but the owner can take. Cognism’s pricing page gives no Standard or Pro prices and doesn’t say how teams above 5 seats are priced.`,
    },
    {
      type: 'p',
      text: `On DataPit, ${BASIC.name} gives each paid seat ${formatCount(BASIC.block.paidSeatCredits)} credits a month. ${PRO.name} and ${ORG.name} give ${formatCount(PRO.block.paidSeatCredits)} per paid seat and add a monthly owner bonus. Self-serve checkout goes up to ${MAX_SELF_SERVE_BLOCKS} blocks, and larger teams go through [sales](/contact).`,
    },
    {
      type: 'p',
      text: 'Cognism’s CRM Enrichment costs from $12,000 a year and is priced by usage, not per seat. It enriches and maintains the records already in your CRM, so it isn’t a like-for-like price for prospecting.',
    },

    { type: 'h2', text: 'When is Cognism the better choice?' },
    {
      type: 'list',
      items: [
        `**You call prospects.** Both Cognism packages include mobile numbers, and Cognism says its phone-verified mobiles are checked by manual and automated processes.${LIVE.phoneData ? '' : ' DataPit has no phone data yet.'}`,
        '**Your CRM is where your team works.** Cognism connects natively to Salesforce, HubSpot, Pipedrive, Microsoft Dynamics, Bullhorn, Outreach, Salesloft and Zapier. DataPit has no CRM integrations.',
        '**You sell into regulated markets.** Cognism holds ISO 27001, ISO 27701 and SOC 2 Type II, and screens numbers against DNC and TPS lists. It is registered as a data broker in California and notifies the business contacts in its database.',
        '**You want intent data and sales signals.** Pro includes Bombora intent data on up to 12 topics, and both packages flag hiring, funding, M&A, job changes and technology use. DataPit has no intent data or signals like these.',
        '**You need data in a warehouse or through an API.** Cognism’s Data-as-a-Service add-on delivers by API or scheduled batch to Snowflake, S3, Google Cloud, Databricks or SFTP.',
        '**You prospect mostly in Europe.** Cognism positions its data around Europe, with phrases like “verified European B2B data”.',
      ],
    },

    { type: 'h2', text: 'When does DataPit fit better?' },
    {
      type: 'list',
      items: [
        `**You want the price before a call.** [Pricing](/pricing) is public: ${BASIC.name} is $${BASIC.price}, ${PRO.name} $${PRO.price} and ${ORG.name} $${ORG.price} a month per seat block. Quarterly billing saves ${pct('QUARTER')}% and annual ${pct('YEAR')}%.`,
        `**You want to try it on your own first.** The Free plan is one seat with ${formatCount(FREE_PLAN_MONTHLY_CREDITS)} credits a month. That covers ${formatCount(FREE_REVEALS)} in-app reveals at ${CREDIT_COSTS.REVEAL} credits each, if you spend credits on nothing else.`,
        `**You want extra seats at no extra cost.** Every block includes free seats: ${BASIC.block.freeSeats} on ${BASIC.name}, ${PRO.block.freeSeats} on ${PRO.name} and ${ORG.block.freeSeats} on ${ORG.name}. Each free seat earns ${formatCount(FREE_SEAT_MONTHLY_CREDITS)} credits a month, and anyone but the owner can take one.`,
        `**You want each person to hold their own credits.** Each member has their own balance, topped up monthly by the seat they hold. Owners get a monthly bonus of ${formatCount(PRO.block.ownerBonus)} on ${PRO.name} and ${formatCount(ORG.block.ownerBonus)} on ${ORG.name}, and can transfer credits to teammates.`,
        `**You want to try a LinkedIn extension for free.** The [DataPit Chrome extension](/chrome-extension) is free on the Chrome Web Store and works on every plan, including Free. It checks the LinkedIn profile you’re viewing against DataPit, and a reveal costs ${CREDIT_COSTS.EXTENSION_REVEAL} credits.`,
        '**You want to see where credits go.** Credit grants and spends are recorded in a ledger. Each member sees their own history, and admins on paid plans see spend per member.',
      ],
    },

    {
      type: 'faq',
      items: [
        {
          q: 'Is DataPit cheaper than Cognism?',
          a: `Cognism doesn’t publish prices for Standard or Pro, so there’s no like-for-like figure. DataPit’s paid plans start at $${BASIC.price} a month for a block of ${seatsPerBlock(BASIC)} seats (${blockSeats(BASIC)}). Cognism includes ${LIVE.phoneData ? '' : 'mobile numbers and '}CRM integrations in both packages, and intent data on Pro, which DataPit doesn’t have.`,
        },
        {
          q: 'Does DataPit have a free plan?',
          a: `Yes. The Free plan is one seat with ${formatCount(FREE_PLAN_MONTHLY_CREDITS)} credits a month, enough for ${formatCount(FREE_REVEALS)} in-app reveals. Cognism lists no free plan or trial, but offers a free data sample on request.`,
        },
        {
          q: 'Can I import my Cognism data into DataPit?',
          a: 'No. DataPit has no way to upload your own contact files today. You search DataPit’s own database, and you can export your searches and lists to CSV.',
        },
        {
          q: 'Does DataPit have mobile numbers like Cognism?',
          a: LIVE.phoneData
            ? 'Where the record has a phone number, the same reveal returns it with the work email. DataPit has no phone finder, so numbers come only from its own records.'
            : 'Not yet. A reveal returns a phone number when the record has one, but DataPit’s data has no phone numbers today. If your team calls prospects, Cognism is the better fit.',
        },
        {
          q: 'Does DataPit integrate with Salesforce or HubSpot?',
          a: 'No. DataPit has no CRM integrations, Zapier connection or webhooks today. You can export to CSV and import the file into your CRM, but contacts you haven’t revealed stay masked in it.',
        },
      ],
    },
    {
      type: 'cta',
      title: 'Try DataPit free',
      text: `Start on the Free plan with ${formatCount(FREE_PLAN_MONTHLY_CREDITS)} credits a month, or compare the paid seat blocks.`,
      primary: { label: 'Start free', to: '/login?mode=register' },
      secondary: { label: 'See pricing', to: '/pricing' },
    },
    {
      type: 'related',
      items: [
        { label: 'ZoomInfo alternative', to: '/alternatives/zoominfo', text: 'DataPit compared with ZoomInfo.' },
        { label: 'Lusha alternative', to: '/alternatives/lusha', text: 'DataPit compared with Lusha.' },
        { label: 'Apollo alternative', to: '/alternatives/apollo', text: 'DataPit compared with Apollo.' },
        { label: 'Pricing', to: '/pricing', text: `Seat blocks from $${BASIC.price} a month, and a free plan.` },
      ],
    },
    {
      type: 'sources',
      items: [
        { label: 'Cognism pricing: packages, seats, credits and feature table', url: 'https://www.cognism.com/pricing', checked: CHECKED },
        { label: 'Cognism CRM Enrichment (from $12,000 a year)', url: 'https://www.cognism.com/enrich', checked: CHECKED },
        { label: 'Cognism free data sample', url: 'https://www.cognism.com/datasample', checked: CHECKED },
        { label: 'Cognism FAQ (database description)', url: 'https://www.cognism.com/faq', checked: CHECKED },
        { label: 'Cognism for SMBs (100M mobile numbers claim)', url: 'https://www.cognism.com/for-smbs', checked: CHECKED },
        { label: 'Cognism Our Data (phone-verified mobiles, European data)', url: 'https://www.cognism.com/our-data', checked: CHECKED },
        { label: 'Cognism integrations', url: 'https://www.cognism.com/integrations', checked: CHECKED },
        { label: 'Cognism security (ISO 27001, ISO 27701, SOC 2 Type II)', url: 'https://www.cognism.com/security', checked: CHECKED },
        { label: 'Cognism compliance (DNC lists, California data broker)', url: 'https://www.cognism.com/compliance', checked: CHECKED },
        { label: 'Cognism Data-as-a-Service', url: 'https://www.cognism.com/data-as-a-service', checked: CHECKED },
        { label: 'Cognism vs Apollo.io (personal emails)', url: 'https://www.cognism.com/cognism-vs-apollo-io', checked: CHECKED },
        {
          label: 'Chrome Web Store: Cognism Sales Intelligence Extension',
          url: 'https://chromewebstore.google.com/detail/cognism-sales-intelligenc/pjbinjkigjcgibbafakmahamfggifapk',
          checked: CHECKED,
        },
      ],
    },
  ],
};
