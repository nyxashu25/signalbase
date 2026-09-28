import { CREDIT_COSTS, EXTENSION_STORE_URL, LIVE, formatCount } from '../../../data/facts.js';
import {
  BILLING_INTERVALS,
  FREE_PLAN_MONTHLY_CREDITS,
  FREE_SEAT_MONTHLY_CREDITS,
  findPlan,
  teamCost,
} from '../../../data/plans.js';

// Hunter.io's published prices (hunter.io/pricing, checked 2026-09-28). Per
// account, unlimited team members sharing the plan's credits. `yearly` is the
// per-month price on yearly billing, the page's default view.
const HUNTER = {
  starter: { monthly: 49, yearly: 34, credits: 2000 },
  growth: { monthly: 149, yearly: 104, credits: 10000 },
  scale: { monthly: 299, yearly: 209, credits: 25000 },
  freeCredits: 50,
};
const CHECKED = '2026-09-28';

const basic = findPlan('BASIC');
const pro = findPlan('PROFESSIONAL');
const org = findPlan('ORGANIZATION');
const seatsPerBlock = (p) => p.block.paidSeats + p.block.freeSeats;
const discount = (key) => Math.round(BILLING_INTERVALS.find((i) => i.key === key).discount * 100);
const freeReveals = formatCount(FREE_PLAN_MONTHLY_CREDITS / CREDIT_COSTS.REVEAL);

// The largest team for which DataPit Basic (monthly billing) costs less than
// Hunter.io Starter (monthly billing).
let basicCheaperUpTo = 0;
while (teamCost('BASIC', basicCheaperUpTo + 1).monthly < HUNTER.starter.monthly) basicCheaperUpTo += 1;

const dataPitCell = (key, people) => {
  const c = teamCost(key, people);
  return `$${formatCount(c.monthly)} (${c.blocks} block${c.blocks === 1 ? '' : 's'})`;
};
const hunterCell = (p) => `$${p.monthly} billed monthly, or $${p.yearly} a month billed yearly`;
const TEAM_SIZES = [5, 10, 25];

// What Hunter.io offers today that DataPit doesn't, for the summary.
const hunterOnly = [
  ...(LIVE.emailVerification ? [] : ['verification']),
  ...(LIVE.sequenceSending ? [] : ['sequences']),
  'CRM integrations',
];
const joinOr = (items) =>
  items.length > 1 ? `${items.slice(0, -1).join(', ')} or ${items[items.length - 1]}` : items[0];

export default {
  meta: {
    path: '/alternatives/hunter',
    section: 'alternatives',
    name: 'Hunter.io alternative',
    title: 'Hunter.io Alternative: Pricing and Features | DataPit',
    description: `DataPit vs Hunter.io: seat blocks from $${basic.price} a month vs per-account plans from $${HUNTER.starter.monthly} (both billed monthly), personal vs shared credits, and when Hunter.io fits.`,
    updated: '2026-09-28',
    published: true,
    station: 'lens',
  },
  hero: {
    eyebrow: 'Hunter.io alternative',
    lines: ['A Hunter.io', 'alternative'],
    sub: `DataPit is a Hunter.io alternative built around people search: filter by job title, seniority and company, then reveal a work email for ${CREDIT_COSTS.REVEAL} credits. Paid plans come in seat blocks from $${basic.price} a month billed monthly, and each person gets their own monthly credits. Hunter.io charges per account, from $${HUNTER.starter.monthly} a month billed monthly, with shared credits.`,
  },
  blocks: [
    {
      type: 'callout',
      title: 'In short',
      text: `DataPit suits teams that search for people by role and company, and want each person to have their own credits. Stay with Hunter.io if you work from company domains, want one price for any team size, or need ${joinOr(hunterOnly)} today. On monthly billing, DataPit Basic also costs less than Hunter.io Starter for up to ${basicCheaperUpTo} people.`,
    },

    { type: 'h2', text: 'Why do teams look for a Hunter.io alternative?' },
    {
      type: 'p',
      text: 'Hunter.io prices per account, not per user. Every plan allows unlimited team members, and they all share the plan’s monthly credits. Enterprise is quote-only.',
    },
    {
      type: 'p',
      text: `Starter is the lowest paid plan, at $${HUNTER.starter.monthly} a month billed monthly or $${HUNTER.starter.yearly} a month billed yearly ($${HUNTER.starter.yearly * 12} a year). It includes ${formatCount(HUNTER.starter.credits)} credits a month for the whole team. Growth includes ${formatCount(HUNTER.growth.credits)} and Scale ${formatCount(HUNTER.scale.credits)}.`,
    },
    {
      type: 'p',
      text: `The Free plan costs $0 and includes ${HUNTER.freeCredits} credits a month. One credit finds one email, and a verification costs half a credit. Hunter.io’s help center says Free CSV exports are capped at 10 emails per domain.`,
    },
    {
      type: 'p',
      text: 'So a Hunter.io team’s credit budget depends on the plan, not on how many people use it. That is the main difference from DataPit, where each person has their own monthly credits.',
    },

    { type: 'h2', text: 'How do DataPit and Hunter.io compare?' },
    {
      type: 'table',
      head: ['Feature', 'DataPit', 'Hunter.io'],
      rows: [
        [
          'Pricing model',
          `Seat blocks, billed monthly, quarterly (${discount('QUARTER')}% off) or annually (${discount('YEAR')}% off)`,
          'Per account, billed monthly or yearly (shown as 30% off). Enterprise is quote-only',
        ],
        [
          'Lowest paid price',
          `$${basic.price} a month for a Basic block of ${seatsPerBlock(basic)} seats, billed monthly`,
          `Starter: $${HUNTER.starter.monthly} billed monthly, or $${HUNTER.starter.yearly} a month billed yearly`,
        ],
        [
          'Free plan',
          `One user, ${formatCount(FREE_PLAN_MONTHLY_CREDITS)} credits a month (${freeReveals} reveals in the app)`,
          `${HUNTER.freeCredits} credits a month shared by unlimited team members`,
        ],
        [
          'How seats are counted',
          `Per block: Basic ${basic.block.paidSeats} paid + ${basic.block.freeSeats} free, Professional ${pro.block.paidSeats} + ${pro.block.freeSeats}, Organization ${org.block.paidSeats} + ${org.block.freeSeats}`,
          'Unlimited team members on every plan, at no extra cost',
        ],
        [
          'Credits',
          `Personal to each person: ${formatCount(basic.block.paidSeatCredits)} a month on a Basic paid seat, ${formatCount(pro.block.paidSeatCredits)} on Professional and Organization, ${formatCount(FREE_SEAT_MONTHLY_CREDITS)} on a free seat`,
          `One pool per account: ${formatCount(HUNTER.starter.credits)} a month on Starter, ${formatCount(HUNTER.growth.credits)} on Growth, ${formatCount(HUNTER.scale.credits)} on Scale`,
        ],
        [
          'Email finding',
          `Search people by title, seniority, department and company, then reveal a work email for ${CREDIT_COSTS.REVEAL} credits. With no email on file, the reveal gives a first.last@ guess${LIVE.emailVerification ? ', refunded if a verifier rejects it' : ' and is still charged'}`,
          'Domain Search and Email Finder, 1 credit per email found; nothing is charged when none is found',
        ],
        [
          'Email verification',
          LIVE.emailVerification ? 'Guessed emails are checked by a verifier when revealed' : 'Not yet',
          'Yes, half a credit per check, and failed checks are free',
        ],
        [
          'Phone numbers',
          LIVE.phoneData ? 'In the same reveal, where the record has one' : 'Not yet',
          'Limited: only numbers linked to personal emails',
        ],
        [
          'Chrome extension',
          `Yes, free on the [Chrome Web Store](${EXTENSION_STORE_URL}). Looks up LinkedIn profiles; a reveal costs ${CREDIT_COSTS.EXTENSION_REVEAL} credits`,
          'Yes, free. Shows the emails Hunter.io has found for the site you’re on, and finds emails by name',
        ],
        [
          'Email sequences',
          LIVE.sequenceSending ? 'Yes, on paid plans' : 'Not yet',
          'Yes, on every plan. Free has 1 connected email account and 500 recipients per sequence',
        ],
        [
          'CSV export',
          `${CREDIT_COSTS.CSV_EXPORT} credits per file, up to 5,000 rows, on every plan. Unrevealed contacts stay masked`,
          'Yes. Free exports are capped at 10 emails per domain',
        ],
        ['CRM integrations', 'Not yet', 'HubSpot, Salesforce, Pipedrive and Zoho CRM, plus others through Zapier'],
        ['API', 'No general API. API keys connect the Chrome extension only', 'REST API and a hosted MCP server, on every plan'],
      ],
      note: 'Hunter.io details come from its website, help center and Chrome Web Store listing, checked on 28 September 2026. See the sources at the end of this page.',
    },
    {
      type: 'p',
      text: 'Hunter.io says it has indexed 150M professional email addresses, and lists 650M public sources of data.',
    },
    { type: 'dataCoverage' },

    { type: 'h2', text: 'What does Hunter.io cost for a team compared with DataPit?' },
    {
      type: 'p',
      text: `Hunter.io’s price doesn’t change with team size, because it charges per account. DataPit adds a block as the team grows: one for every ${seatsPerBlock(basic)} people on Basic, ${seatsPerBlock(pro)} on Professional and ${seatsPerBlock(org)} on Organization.`,
    },
    {
      type: 'table',
      head: ['Plan', ...TEAM_SIZES.map((n) => `${n} people`)],
      rows: [
        ['DataPit Basic', ...TEAM_SIZES.map((n) => dataPitCell('BASIC', n))],
        ['DataPit Professional', ...TEAM_SIZES.map((n) => dataPitCell('PROFESSIONAL', n))],
        ['DataPit Organization', ...TEAM_SIZES.map((n) => dataPitCell('ORGANIZATION', n))],
        ['Hunter.io Starter', ...TEAM_SIZES.map(() => hunterCell(HUNTER.starter))],
        ['Hunter.io Growth', ...TEAM_SIZES.map(() => hunterCell(HUNTER.growth))],
        ['Hunter.io Scale', ...TEAM_SIZES.map(() => hunterCell(HUNTER.scale))],
        ['Hunter.io Enterprise', ...TEAM_SIZES.map(() => 'Quote only')],
      ],
      note: `Prices only, and the plans don’t include the same things. DataPit prices use monthly billing; quarterly billing saves ${discount('QUARTER')}% and annual ${discount('YEAR')}%. Hunter.io prices are per account with unlimited team members, who share the plan’s credits.`,
    },
    {
      type: 'p',
      text: `For up to ${basicCheaperUpTo} people, DataPit Basic costs less than Hunter.io Starter on monthly billing. From ${basicCheaperUpTo + 1} people, Hunter.io Starter costs less, because its price doesn’t rise with the team. What the price buys differs: Starter’s ${formatCount(HUNTER.starter.credits)} credits are shared, while each Basic paid seat earns its own ${formatCount(basic.block.paidSeatCredits)} a month.`,
    },

    { type: 'h2', text: 'When is Hunter.io the better choice?' },
    {
      type: 'list',
      items: [
        `**You want one price for any team size.** Every Hunter.io plan includes unlimited team members at no extra cost, and they share the plan’s credits. From ${basicCheaperUpTo + 1} people, Starter costs less than DataPit Basic.`,
        '**You find emails by company domain.** Domain Search lists the emails Hunter.io has found for a website, with where and when each was found. Nothing is charged when no email is found, and Email Finder says whether a result is a guess.',
        '**You need email verification.** Hunter.io’s verifier costs half a credit per check, failed checks are free, and it handles accept-all addresses with several major email providers. Its Free plan covers up to 100 verifications a month.',
        '**You want to send from the same tool.** Hunter.io Sequences is on every plan, with Gmail and Outlook connected natively. Paid plans add SMTP/IMAP accounts, account rotation, click tracking and the AI Writing Assistant.',
        '**You need integrations or an API.** Hunter.io connects directly to HubSpot, Salesforce, Pipedrive and Zoho CRM, and to Zapier, Make and Clay. It has a REST API and a hosted MCP server on every plan.',
        '**You want company signals.** Hunter.io’s Signals flag companies that raised money, are hiring or changed their technologies. DataPit has no intent data or signals.',
        '**Public-web sourcing and EU hosting matter to you.** After six months, Hunter.io removes data that no longer has public sources, and people can claim their address to edit or delete it. Its main servers run on Google Cloud in Belgium, and a DPA is part of its Terms of Use.',
      ],
    },

    { type: 'h2', text: 'When does DataPit fit better?' },
    {
      type: 'list',
      items: [
        `**Each person gets their own credits.** A paid seat earns ${formatCount(basic.block.paidSeatCredits)} credits a month on Basic and ${formatCount(pro.block.paidSeatCredits)} on Professional and Organization, and a free seat earns ${formatCount(FREE_SEAT_MONTHLY_CREDITS)}. Owners also get a monthly bonus of ${formatCount(pro.block.ownerBonus)} on Professional and ${formatCount(org.block.ownerBonus)} on Organization.`,
        `**You want credits to grow with the team.** A Basic block is $${basic.price} a month for ${seatsPerBlock(basic)} people, ${basic.block.paidSeats} paid seats and ${basic.block.freeSeats} free, each with its own credits. Professional blocks seat ${seatsPerBlock(pro)} for $${pro.price}, Organization blocks ${seatsPerBlock(org)} for $${org.price}, and all prices are on the [pricing page](/pricing).`,
        '**Your team pays for each contact once.** When anyone in the workspace reveals a contact, it’s free for everyone else, in the app and in the Chrome extension.',
        `**You’re one person trying it for free.** DataPit’s Free plan gives one user ${formatCount(FREE_PLAN_MONTHLY_CREDITS)} credits a month, enough for ${freeReveals} reveals in the app. Hunter.io’s Free plan has ${HUNTER.freeCredits} credits a month, and one credit finds one email.`,
        `**You prospect from LinkedIn profiles.** The free [Chrome extension](/chrome-extension) checks the profile you’re viewing against DataPit. A reveal from the extension costs ${CREDIT_COSTS.EXTENSION_REVEAL} credits, or nothing if a teammate already revealed the contact.`,
        `**You export lists in bulk.** A CSV export costs a flat ${CREDIT_COSTS.CSV_EXPORT} credits per file, up to 5,000 rows, on every plan including Free. Contact details stay masked for people your workspace hasn’t revealed.`,
        '**You want to see where credits go.** Credit spend is recorded in a ledger by person and reason. On paid plans, admins see each member’s spend and can export it as CSV.',
      ],
    },

    {
      type: 'faq',
      items: [
        {
          q: 'Is DataPit cheaper than Hunter.io?',
          a: `For up to ${basicCheaperUpTo} people, comparing the lowest paid plans, yes. DataPit Basic costs $${basic.price} a month billed monthly, and Hunter.io Starter costs $${HUNTER.starter.monthly} billed monthly. Hunter.io charges per account, so from ${basicCheaperUpTo + 1} people its Starter plan costs less than DataPit Basic.`,
        },
        {
          q: 'Does DataPit have a free plan?',
          a: `Yes. The Free plan is for one user and includes ${formatCount(FREE_PLAN_MONTHLY_CREDITS)} credits a month, enough for ${freeReveals} reveals in the app. It includes people and company search, lists, CSV export and the Chrome extension; team features need a paid plan.`,
        },
        {
          q: 'Does DataPit verify emails like Hunter.io?',
          a: LIVE.emailVerification
            ? 'Partly. When a contact has no email on file, DataPit’s first.last@ guess is checked by a verifier. The reveal is refunded if the address comes back as not deliverable.'
            : 'Not yet: DataPit doesn’t check emails with a verifier today. When a contact has no email on file, the reveal returns an unchecked first.last@ guess at their company’s domain, and it is still charged. If you need verified addresses now, Hunter.io’s Email Verifier checks them for half a credit each.',
        },
        {
          q: 'Does DataPit integrate with my CRM?',
          a: `Not yet. DataPit has no CRM integrations, Zapier connection or webhooks today. You can export people, companies or a list as CSV for ${CREDIT_COSTS.CSV_EXPORT} credits per file, with unrevealed contacts masked.`,
        },
        {
          q: 'Can I import my Hunter.io data into DataPit?',
          a: 'No. DataPit doesn’t import your own contacts or lists today. Lists are built from the people and companies in DataPit’s own database.',
        },
      ],
    },
    {
      type: 'cta',
      title: 'Try DataPit free',
      text: `The Free plan includes ${formatCount(FREE_PLAN_MONTHLY_CREDITS)} credits a month for one user. Paid seat blocks start at $${basic.price} a month.`,
      primary: { label: 'Start free', to: '/login?mode=register' },
      secondary: { label: 'See pricing', to: '/pricing' },
    },
    {
      type: 'related',
      items: [
        { label: 'Apollo alternative', to: '/alternatives/apollo', text: 'How DataPit compares with Apollo on price and features.' },
        { label: 'RocketReach alternative', to: '/alternatives/rocketreach', text: 'How DataPit compares with RocketReach.' },
        { label: 'Lusha alternative', to: '/alternatives/lusha', text: 'How DataPit compares with Lusha.' },
        { label: 'Pricing', to: '/pricing', text: `Seat blocks from $${basic.price} a month, and a free plan.` },
      ],
    },
    {
      type: 'sources',
      items: [
        { label: 'Hunter.io pricing: plans, credits and team members', url: 'https://hunter.io/pricing', checked: CHECKED },
        {
          label: 'Hunter.io Help Center: What’s included in Hunter’s Free Plan?',
          url: 'https://help.hunter.io/en/articles/11060999-what-s-included-in-hunter-s-free-plan',
          checked: CHECKED,
        },
        { label: 'Hunter.io: Our data (database size and sourcing)', url: 'https://hunter.io/our-data', checked: CHECKED },
        { label: 'Hunter.io Email Verifier', url: 'https://hunter.io/email-verifier', checked: CHECKED },
        {
          label: 'Hunter.io Help Center: Hunter Discover FAQs (phone numbers)',
          url: 'https://help.hunter.io/en/articles/12269815-hunter-discover-faqs',
          checked: CHECKED,
        },
        {
          label: 'Chrome Web Store: Hunter - Email Finder Extension',
          url: 'https://chromewebstore.google.com/detail/hunter-email-finder-exten/hgmhmanijnjhaffoampdlllchpolkdnj',
          checked: CHECKED,
        },
        { label: 'Hunter.io cold email software (Sequences)', url: 'https://hunter.io/cold-email-software', checked: CHECKED },
        { label: 'Hunter.io integrations', url: 'https://hunter.io/integrations', checked: CHECKED },
        { label: 'Hunter.io API', url: 'https://hunter.io/api', checked: CHECKED },
        { label: 'Hunter.io llms.txt (MCP server)', url: 'https://hunter.io/llms.txt', checked: CHECKED },
        { label: 'Hunter.io Signals', url: 'https://hunter.io/intent-data', checked: CHECKED },
        {
          label: 'Hunter.io Help Center: GDPR Compliance',
          url: 'https://help.hunter.io/en/articles/1890029-gdpr-compliance',
          checked: CHECKED,
        },
      ],
    },
  ],
};
