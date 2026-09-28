// What is switched on in production today. Content pages, plans.js and the
// facts in facts.js (which re-exports this) read these, so when a capability
// goes live one flag flips every claim that depends on it (and publishes the
// pages built around it). Kept free of imports so any data module can read
// it without an import cycle. Checked against production on 2026-09-28:
//   database          - the full contact import. Today ~120 contacts; see DATABASE_CLAIM.
//   emailVerification - EMAIL_VERIFIER_API_KEY set, so reveals are checked by a verifier.
//   sequenceSending   - ESP_API_KEY + a verified sender set, so sequence emails are
//                       really delivered (unset, sends are only simulated).
//   phoneData         - imported records carry phone numbers (today none do).
export const LIVE = {
  database: false,
  emailVerification: false,
  sequenceSending: false,
  phoneData: false,
};
