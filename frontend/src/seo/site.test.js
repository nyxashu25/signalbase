import { describe, it, expect } from 'vitest';
import {
  SEO_ROUTES,
  headElements,
  isPrivatePath,
  metaForPath,
  organization,
  structuredData,
} from './site.js';
import { PROFILES } from '../data/facts.js';

describe('seo: metaForPath', () => {
  it('finds each public page, ignoring a trailing slash', () => {
    expect(metaForPath('/pricing').path).toBe('/pricing');
    expect(metaForPath('/pricing/').path).toBe('/pricing');
    expect(metaForPath('/').path).toBe('/');
  });

  it('marks app, admin and auth screens noindex', () => {
    for (const p of ['/app', '/app/people', '/control', '/login', '/reset-password']) {
      expect(isPrivatePath(p)).toBe(true);
      expect(metaForPath(p).noindex).toBe(true);
    }
    expect(isPrivatePath('/application')).toBe(false);
  });

  it('treats anything else as the 404 page', () => {
    const meta = metaForPath('/no-such-page');
    expect(meta.title).toBe('Page Not Found | DataPit');
    expect(meta.noindex).toBe(true);
  });
});

describe('seo: page metadata', () => {
  it('keeps titles and descriptions to the lengths search results show', () => {
    for (const route of SEO_ROUTES) {
      expect(route.title.length, route.path).toBeLessThanOrEqual(60);
      expect(route.description.length, route.path).toBeLessThanOrEqual(160);
    }
    expect(new Set(SEO_ROUTES.map((r) => r.title)).size).toBe(SEO_ROUTES.length);
  });

  it('builds canonical, Open Graph and robots tags for a page', () => {
    const els = headElements(metaForPath('/pricing'));
    const find = (key, value) => els.find((e) => e.attrs[key] === value);
    expect(find('rel', 'canonical').attrs.href).toBe('https://datapit.io/pricing');
    expect(find('property', 'og:url').attrs.content).toBe('https://datapit.io/pricing');
    expect(find('property', 'og:image').attrs.content).toBe('https://datapit.io/og/pricing.png');
    expect(find('name', 'robots').attrs.content).toMatch(/^index/);
  });

  it('leaves the canonical off noindex screens', () => {
    const els = headElements(metaForPath('/login'));
    expect(els.find((e) => e.attrs.rel === 'canonical')).toBeUndefined();
    expect(els.find((e) => e.attrs.name === 'robots').attrs.content).toMatch(/^noindex/);
  });

  it('describes the plans as offers in the structured data', () => {
    const graph = structuredData(metaForPath('/'))['@graph'];
    const app = graph.find((n) => n['@type'] === 'SoftwareApplication');
    expect(app.offers.map((o) => o.price)).toEqual(['0', '29', '59', '99']);
    expect(graph.some((n) => n['@type'] === 'Organization')).toBe(true);
    const crumbs = structuredData(metaForPath('/about'))['@graph'][0];
    expect(crumbs['@type']).toBe('BreadcrumbList');
  });
});

describe('seo: Organization profiles', () => {
  it("lists DataPit's own profiles as sameAs once there are any", () => {
    expect(organization([])).not.toHaveProperty('sameAs');
    const profiles = [
      { name: 'LinkedIn', url: 'https://www.linkedin.com/company/datapit' },
      { name: 'Crunchbase', url: 'https://www.crunchbase.com/organization/datapit' },
    ];
    expect(organization(profiles).sameAs).toEqual(profiles.map((p) => p.url));
  });

  it('puts PROFILES on the home page Organization', () => {
    const org = structuredData(metaForPath('/'))['@graph'].find((n) => n['@type'] === 'Organization');
    expect(org.sameAs ?? []).toEqual(PROFILES.map((p) => p.url));
  });

  it('indexes the press kit', () => {
    const press = metaForPath('/press');
    expect(press.path).toBe('/press');
    expect(press.noindex).toBeFalsy();
    expect(headElements(press).find((e) => e.attrs.rel === 'canonical').attrs.href).toBe(
      'https://datapit.io/press',
    );
  });
});
