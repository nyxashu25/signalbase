// Question-and-answer copy for the Pricing and Product pages. The same items
// feed the pages, their FAQPage structured data (seo/site.js) and
// llms-full.txt, so the words a reader sees are the words search engines and
// AI assistants quote. Answers that state prices or credits are built from
// plans.js and facts.js so they can't drift from the numbers.
import {
  CREDIT_COSTS,
  DATAPIT_SUMMARY,
  LIVE,
  MAX_SELF_SERVE_BLOCKS,
  creditCostsSentence,
  creditsSummary,
  pricingSummary,
  revealSummary,
} from './facts.js';

export const PRICING_FAQS = [
  { q: 'How much does DataPit cost?', a: pricingSummary() },
  {
    q: 'What is a seat block?',
    a: 'A seat block is how paid plans are bought: one price covers a bundle of paid seats plus bonus free seats. Buy as many blocks as your team needs, up to ' +
      `${MAX_SELF_SERVE_BLOCKS} at checkout (contact us for more). Free seats never cost anything.`,
  },
  { q: 'How many credits does each seat get?', a: creditsSummary() },
  {
    q: 'What is a credit?',
    a: `Credits are what you spend when you use data. ${creditCostsSentence()} Credits are reserved atomically, so concurrent requests can never overspend your balance.`,
  },
  {
    q: 'Can I change plans later?',
    a: 'Yes. Upgrade from your workspace billing page at any time; the new plan starts right away. Moving to a lower paid plan opens once your current billing period ends. To cancel, contact us.',
  },
  {
    q: 'Is there a free trial on paid plans?',
    a: 'The Free plan itself is a real, permanently free workspace: search and reveal on your own workspace, no card required, no trial clock.',
  },
];

export const PRODUCT_FAQS = [
  {
    q: 'What is DataPit?',
    a: `${DATAPIT_SUMMARY} Every credit your team spends is recorded in a ledger the workspace can see.`,
  },
  { q: 'What does a reveal include, and what does it cost?', a: revealSummary() },
  {
    q: 'Is there a Chrome extension?',
    a: `Yes. DataPit — LinkedIn Lookup is free on the Chrome Web Store. It checks the LinkedIn profile you're viewing against DataPit and reveals the work email${LIVE.phoneData ? ' and phone number' : ''} for ${CREDIT_COSTS.EXTENSION_REVEAL} credits. People DataPit doesn't have yet are queued for sourcing.`,
  },
  // Only while sending is live: until ESP_API_KEY is set, sequences run
  // without delivering email (see LIVE in facts.js).
  ...(LIVE.sequenceSending
    ? [
        {
          q: 'Can I send cold email sequences from DataPit?',
          a: `Yes, on paid plans. A sequence chains email and wait steps, and you enroll contacts from a saved list. Enrolling a contact costs ${CREDIT_COSTS.SEQUENCE_ENROLLMENT} credits, charged up front.`,
        },
      ]
    : []),
  {
    q: 'Does DataPit have an API?',
    a: 'Not a general-purpose one yet. API keys, created in Settings under API & Extension, connect the Chrome extension to your workspace on every plan.',
  },
  {
    q: 'Can I export contacts to CSV?',
    a: `Yes. Exporting a list or a search result to CSV costs ${CREDIT_COSTS.CSV_EXPORT} credits per file, up to 5,000 rows. Contacts your workspace hasn't revealed stay masked in the file.`,
  },
  {
    q: 'How can someone remove their data from DataPit?',
    a: 'Anyone whose details appear in DataPit can ask for them to be removed with the GDPR/CCPA opt-out form on the Privacy page.',
  },
];
