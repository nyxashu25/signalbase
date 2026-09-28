// Competitor list prices shown on the Pricing page's team-cost table. Every
// number here was read on the vendor's own pricing page on the checked date
// (see the SEO Phase 3 research) — re-check them and bump the date whenever
// you touch this file. The comparison pages under src/content/pages/ carry
// their own cited figures.
export const COMPETITOR_PRICES_CHECKED = '2026-09-28';

export const APOLLO = {
  name: 'Apollo.io',
  pricingUrl: 'https://www.apollo.io/pricing',
  // Basic plan, per seat per month.
  basicMonthlyBilling: 65,
  basicAnnualBilling: 49,
};

export const ZOOMINFO = {
  name: 'ZoomInfo',
  pricingUrl: 'https://www.zoominfo.com/pricing',
  // Every paid ZoomInfo plan is quote-only, billed annually.
  quoteOnly: true,
};
