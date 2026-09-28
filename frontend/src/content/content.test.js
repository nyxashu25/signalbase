import { describe, it, expect } from 'vitest';
import { internalLinks, validatePage, SECTIONS } from './schema.js';
import { CONTENT_PAGES } from './registry.generated.js';
import { SEO_ROUTES } from '../seo/site.js';

const MODULES = import.meta.glob('./pages/**/*.js', { eager: true });
const PAGES = Object.entries(MODULES).map(([file, mod]) => ({ file, page: mod.default }));

// Paths a content page may link to besides other content pages.
const APP_PATHS = new Set(['/login', '/email-format']);

describe('content pages', () => {
  it('all validate against the schema', () => {
    const problems = PAGES.flatMap(({ file, page }) => validatePage(page, file));
    expect(problems).toEqual([]);
  });

  it('are all in the generated registry, with matching meta (run `npm run content`)', () => {
    const fromFiles = PAGES.map(({ file, page }) => ({
      path: page.meta.path,
      section: page.meta.section,
      name: page.meta.name,
      title: page.meta.title,
      description: page.meta.description,
      updated: page.meta.updated,
      published: page.meta.published,
      station: page.meta.station ?? null,
      og: SECTIONS[page.meta.section].og,
      source: `src/content/${file.replace(/^\.\//, '')}`,
    })).sort((a, b) => a.path.localeCompare(b.path));
    expect(CONTENT_PAGES).toEqual(fromFiles);
  });

  it('have unique titles', () => {
    const titles = [...SEO_ROUTES.map((r) => r.title), ...CONTENT_PAGES.map((p) => p.title)];
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('only link to pages that exist — and published pages only to published ones', () => {
    const published = new Map(CONTENT_PAGES.map((p) => [p.path, p.published]));
    const core = new Set(SEO_ROUTES.map((r) => r.path));
    const broken = [];
    for (const { file, page } of PAGES) {
      for (const link of internalLinks(page)) {
        if (core.has(link) || APP_PATHS.has(link)) continue;
        if (!published.has(link)) broken.push(`${file} -> ${link} (no such page)`);
        else if (page.meta.published && !published.get(link))
          broken.push(`${file} -> ${link} (links a hidden page)`);
      }
    }
    expect(broken).toEqual([]);
  });
});
