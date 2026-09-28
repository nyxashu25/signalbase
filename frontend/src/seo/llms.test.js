import { describe, it, expect } from 'vitest';
import manifestText from '../../public/site.webmanifest?raw';
import { llmsFullTxt, llmsTxt } from './llms.js';
import { SEO_ROUTES, metaForPath, structuredData } from './site.js';
import { DATAPIT_SUMMARY, LIVE } from '../data/facts.js';
import { PRICING_FAQS, PRODUCT_FAQS } from '../data/faqs.js';

describe('llms.txt', () => {
  it('opens with the name and the one-line summary, and links every public page', () => {
    const txt = llmsTxt();
    expect(txt.startsWith('# DataPit\n\n> ' + DATAPIT_SUMMARY)).toBe(true);
    for (const route of SEO_ROUTES) {
      const url = route.path === '/' ? 'https://datapit.io/' : `https://datapit.io${route.path}`;
      expect(txt).toContain(`(${url})`);
    }
    expect(txt).toContain('https://datapit.io/llms-full.txt');
  });

  it("doesn't promise phone numbers before any are live, or an append-only ledger", () => {
    const txt = llmsTxt();
    if (!LIVE.phoneData) expect(txt).not.toMatch(/phone/i);
    expect(txt).not.toMatch(/append-only/i);
  });

  it('adds a Profiles group only when DataPit has profiles', () => {
    expect(llmsTxt({ profiles: [] })).not.toContain('## Profiles');
    const txt = llmsTxt({
      profiles: [{ name: 'LinkedIn', url: 'https://www.linkedin.com/company/datapit' }],
    });
    expect(txt).toContain(
      '## Profiles\n\n- [LinkedIn](https://www.linkedin.com/company/datapit)\n',
    );
  });

  it('carries the plan table and every answer in the full reference', () => {
    const full = llmsFullTxt();
    expect(full).toContain('| Basic | $29 per block | 5 paid + 1 free |');
    expect(full).toContain('| Organization | $99 per block | 14 paid + 5 free |');
    for (const { q, a } of [...PRICING_FAQS, ...PRODUCT_FAQS]) {
      expect(full).toContain(`### ${q}\n\n${a}`);
    }
  });
});

describe('FAQ structured data', () => {
  it('marks up exactly the questions each page shows', () => {
    for (const [pathname, items] of [
      ['/pricing', PRICING_FAQS],
      ['/product', PRODUCT_FAQS],
    ]) {
      const faq = structuredData(metaForPath(pathname))['@graph'].find(
        (n) => n['@type'] === 'FAQPage',
      );
      expect(faq.mainEntity.map((e) => e.name)).toEqual(items.map((i) => i.q));
      expect(faq.mainEntity[0].acceptedAnswer.text).toBe(items[0].a);
    }
    expect(
      structuredData(metaForPath('/about'))['@graph'].some((n) => n['@type'] === 'FAQPage'),
    ).toBe(false);
  });

  it('states prices from the plan data', () => {
    const cost = PRICING_FAQS.find((f) => f.q === 'How much does DataPit cost?').a;
    expect(cost).toContain('800 credits a month');
    expect(cost).toContain('Basic is $29 a month for 5 paid seats plus 1 free');
    expect(cost).toContain('Organization is $99 a month for 14 paid seats plus 5 free');
  });
});

describe('one description everywhere', () => {
  it('uses the same summary in the web manifest', () => {
    const manifest = JSON.parse(manifestText);
    expect(DATAPIT_SUMMARY).toContain(manifest.description);
  });
});
