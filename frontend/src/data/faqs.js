// Question-and-answer copy for the Pricing and Product pages. The same items
// feed the pages, their FAQPage structured data (seo/site.js) and
// llms-full.txt, so the words a reader sees are the words search engines and
// AI assistants quote. Answers that state prices or credits are built from
// plans.js and facts.js so they can't drift from the numbers.
import {
  CREDIT_COSTS,
  DATAPIT_SUMMARY,
  creditsSummary,
  pricingSummary,
  revealSummary,
} from './facts.js';

export const PRICING_FAQS = [
  { q: 'How much does DataPit cost?', a: pricingSummary() },
  {
    q: 'What is a seat block?',
    a: 'A seat block is how paid plans are bought: one price covers a bundle of paid seats plus bonus free seats. Buy as many blocks as your team needs. There is no seat limit, and free seats never cost anything.',
  },
  { q: 'How many credits does each seat get?', a: creditsSummary() },
  {
    q: 'What is a credit?',
    a: `Credits are what you spend when you use data. Revealing a contact costs ${CREDIT_COSTS.REVEAL} credits in the app or ${CREDIT_COSTS.EXTENSION_REVEAL} from the Chrome extension, and a CSV export costs ${CREDIT_COSTS.CSV_EXPORT}. Searching and browsing masked results is free. Credits are reserved atomically, so concurrent requests can never overspend your balance.`,
  },
  {
    q: 'Do unused credits roll over?',
    a: 'Monthly credits reset each billing cycle and do not roll over. Once any teammate in your workspace reveals a contact, the whole workspace can see it for free going forward.',
  },
  {
    q: 'Can I change plans later?',
    a: 'Yes. Upgrade, downgrade, or cancel from your workspace billing page at any time. Changes take effect at your next billing cycle.',
  },
  {
    q: 'Is there a free trial on paid plans?',
    a: 'The Free plan itself is a real, permanently free workspace: search and reveal against live data, no card required, no trial clock.',
  },
];

export const PRODUCT_FAQS = [
  {
    q: 'What is DataPit?',
    a: `${DATAPIT_SUMMARY} Everything that uses data spends credits from one ledger your team can audit.`,
  },
  { q: 'What does a reveal include, and what does it cost?', a: revealSummary() },
  {
    q: 'Is there a Chrome extension?',
    a: "Yes. DataPit — LinkedIn Lookup, free on the Chrome Web Store, checks the LinkedIn profile you're viewing against DataPit, reveals the email and phone number, and queues people DataPit doesn't have yet for sourcing.",
  },
  {
    q: 'Can I send cold email sequences from DataPit?',
    a: 'Yes, on paid plans. Sequences chain email and wait steps, enroll a saved list in one click and enforce your suppression list on every send. Professional and Organization add pause and resume plus sequence analytics.',
  },
  {
    q: 'Does DataPit have an API?',
    a: "Yes. The Professional and Organization plans include API access. Create a key in Settings under API; actions taken with a key spend your workspace's credits.",
  },
  {
    q: 'Can I export contacts to CSV?',
    a: `Yes. Exporting a list or a search result to CSV costs ${CREDIT_COSTS.CSV_EXPORT} credits per export.`,
  },
  {
    q: 'How can someone remove their data from DataPit?',
    a: 'Anyone whose details appear in DataPit can use the GDPR/CCPA opt-out form on the Privacy page. Matching records are redacted for every workspace right away, and the address is blocked from future reveals.',
  },
];
