// Single source of truth for what every credit-spending action costs.
// Reused by the route middleware that reserves credits and by any UI
// copy/tests that need to state a price without hardcoding it twice.
export const CREDIT_COSTS = {
  REVEAL: 2,
  // The same reveal made from the Chrome extension — priced higher by
  // product decision (convenience premium). Already-revealed contacts are
  // free there too, same as in-app.
  EXTENSION_REVEAL: 4,
  COMPANY_DETAIL_VIEW: 20,
  CSV_EXPORT: 20,
  SEQUENCE_ENROLLMENT: 250,
};
