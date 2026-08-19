// Single source of truth for what every credit-spending action costs.
// Reused by the route middleware that reserves credits and by any UI
// copy/tests that need to state a price without hardcoding it twice.
export const CREDIT_COSTS = {
  REVEAL: 91,
  COMPANY_DETAIL_VIEW: 20,
  CSV_EXPORT: 50,
  SEQUENCE_ENROLLMENT: 250,
};
