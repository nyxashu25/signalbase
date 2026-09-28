// Search metadata for every public page — the single source for the
// prerendered <head> (scripts/prerender.mjs), the sitemap, and the client-side
// head updates on navigation (RouteMeta.jsx). Titles stay at or under 60
// characters and descriptions near 155, the lengths Google shows in results.
import { PLANS, PRICING_UPDATED_AT } from '../data/plans.js';
import { DATAPIT_SUMMARY } from '../data/facts.js';
import { PRICING_FAQS, PRODUCT_FAQS } from '../data/faqs.js';
import { CONTENT_PAGES } from '../content/registry.generated.js';
import { SECTIONS } from '../content/schema.js';

export const SITE_URL = 'https://datapit.io';
export const SITE_NAME = 'DataPit';
export const DEFAULT_TITLE = 'DataPit';
export const DEFAULT_DESCRIPTION = DATAPIT_SUMMARY;
export const OG_IMAGE_SIZE = { width: 1200, height: 630 };

/**
 * The indexable marketing pages. `source` is the page's component file — the
 * sitemap's lastmod comes from its last git commit. `og` names the share
 * image under public/og/ (see scripts/og-images.mjs).
 */
export const SEO_ROUTES = [
  {
    path: '/',
    name: 'Home',
    title: 'DataPit: B2B Contact Database & Email Finder',
    description:
      'Search a live B2B database, reveal verified emails and phone numbers, and run outreach sequences from one workspace. Start free with 800 credits a month.',
    og: 'home',
    source: 'src/pages/marketing/Home.jsx',
    priority: '1.0',
    changefreq: 'weekly',
  },
  {
    path: '/pricing',
    name: 'Pricing',
    title: 'DataPit Pricing: B2B Data Plans from $29 for 5 Seats',
    description:
      'Seat-block pricing: Basic is $29/month for 5 paid seats plus 1 free, Professional $59, Organization $99. Every seat earns monthly credits. Start free.',
    og: 'pricing',
    source: 'src/pages/marketing/Pricing.jsx',
    priority: '0.9',
    changefreq: 'weekly',
  },
  {
    path: '/product',
    name: 'Product',
    title: 'Find Verified Emails & Phone Numbers | DataPit',
    description:
      'People and company search, verified email and phone reveal, multi-step outreach sequences, and an auditable credit ledger, all in one DataPit workspace.',
    og: 'product',
    source: 'src/pages/marketing/Product.jsx',
    priority: '0.9',
    changefreq: 'monthly',
  },
  {
    path: '/solutions',
    name: 'Solutions',
    title: 'B2B Prospecting for Sales Teams & Founders | DataPit',
    description:
      'How sales leaders, account executives, SDRs, RevOps, marketers and founders use DataPit to find verified contacts and track buying signals.',
    og: 'solutions',
    source: 'src/pages/marketing/Solutions.jsx',
    priority: '0.8',
    changefreq: 'monthly',
  },
  {
    path: '/about',
    name: 'About',
    title: 'About DataPit: The B2B Contact Data Platform',
    description:
      "DataPit started from one complaint: sales intelligence tools charge before they find anything. So we built the credit ledger first. Here's our story.",
    og: 'about',
    source: 'src/pages/marketing/About.jsx',
    priority: '0.6',
    changefreq: 'monthly',
  },
  {
    path: '/contact',
    name: 'Contact',
    title: 'Contact DataPit: Sales & Support',
    description:
      'Questions about a DataPit plan, a bulk credit package, or whether DataPit fits your workflow? Send us a note and our team will get back to you.',
    og: 'contact',
    source: 'src/pages/marketing/Contact.jsx',
    priority: '0.6',
    changefreq: 'yearly',
  },
  {
    path: '/privacy',
    name: 'Privacy Policy',
    title: 'Privacy Policy | DataPit',
    description:
      'How DataPit collects, uses, stores and protects personal data, and the choices and rights you have over it.',
    og: 'default',
    source: 'src/pages/marketing/Privacy.jsx',
    priority: '0.3',
    changefreq: 'yearly',
  },
  {
    path: '/terms',
    name: 'Terms of Service',
    title: 'Terms of Service | DataPit',
    description:
      'The terms of service that govern your use of the DataPit website, platform and API.',
    og: 'default',
    source: 'src/pages/marketing/Terms.jsx',
    priority: '0.3',
    changefreq: 'yearly',
  },
  {
    path: '/blog',
    name: 'Guides',
    title: 'B2B Prospecting Guides | DataPit',
    description:
      'Practical guides to B2B prospecting: finding and checking work email addresses, building contact lists and running outreach that gets replies.',
    og: 'guide',
    source: 'src/pages/marketing/BlogIndex.jsx',
    priority: '0.6',
    changefreq: 'weekly',
  },
];

// Content pages (src/content/pages/, indexed into registry.generated.js):
// comparisons, features, personas, the extension page, tools and guides.
// Unpublished ones still render at their URL but stay noindex and off the
// sitemap and llms.txt.
const CONTENT_ROUTES = CONTENT_PAGES.map((p) => ({
  ...p,
  noindex: !p.published,
  priority: p.section === 'blog' ? '0.6' : '0.7',
  changefreq: 'monthly',
}));

/** Every indexable page: the sitemap, llms.txt and IndexNow list. */
export const PUBLIC_ROUTES = [...SEO_ROUTES, ...CONTENT_ROUTES.filter((r) => !r.noindex)];

// Company email-format pages exist only for companies with enough data; the
// prerender marks the index indexable once there are any (see prerender.mjs).
export const EMAIL_FORMAT_INDEX_META = {
  path: '/email-format',
  name: 'Email formats',
  section: 'email-format',
  title: 'Company Email Formats | DataPit',
  description:
    'The email address formats companies use, measured from the work addresses in DataPit: first.last, flast, first and more, with how common each one is.',
  og: 'tools',
  noindex: true,
};

export function emailFormatMeta(domain, company) {
  const name = company?.name || domain;
  return {
    path: `/email-format/${domain}`,
    name: `${name} email format`,
    section: 'email-format',
    title: `${name} Email Format | DataPit`.slice(0, 60),
    description: `The email address format ${name} (${domain}) uses, and how common each pattern is, measured from the work addresses in DataPit.`,
    og: 'tools',
    updated: company?.updated ?? null,
  };
}

export const NOT_FOUND_META = {
  path: null,
  title: 'Page Not Found | DataPit',
  description: "This page doesn't exist. Head back to DataPit's home, product or pricing pages.",
  og: 'default',
  noindex: true,
};

// App, admin and auth screens: served from the unprerendered shell, never
// indexed (robots.txt also keeps crawlers out of /app and /control).
const PRIVATE_PREFIXES = [
  '/app',
  '/control',
  '/login',
  '/verify-email',
  '/forgot-password',
  '/reset-password',
  '/accept-invite',
  '/unsubscribe',
];

export const PRIVATE_META = {
  path: null,
  title: DEFAULT_TITLE,
  description: DEFAULT_DESCRIPTION,
  og: 'default',
  noindex: true,
};

export function isPrivatePath(pathname) {
  return PRIVATE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function normalizePath(pathname) {
  if (pathname.length > 1 && pathname.endsWith('/')) return pathname.slice(0, -1);
  return pathname;
}

/** The metadata for any pathname: a public page, a private screen, or 404. */
export function metaForPath(pathname) {
  const path = normalizePath(pathname || '/');
  const route = SEO_ROUTES.find((r) => r.path === path) ?? CONTENT_ROUTES.find((r) => r.path === path);
  if (route) return route;
  if (path === EMAIL_FORMAT_INDEX_META.path) return EMAIL_FORMAT_INDEX_META;
  const format = /^\/email-format\/([a-z0-9.-]+)$/.exec(path);
  if (format) return emailFormatMeta(format[1]);
  if (isPrivatePath(path)) return PRIVATE_META;
  return NOT_FOUND_META;
}

export function absoluteUrl(path) {
  return path === '/' ? `${SITE_URL}/` : `${SITE_URL}${path}`;
}

function ogImageUrl(meta) {
  return `${SITE_URL}/og/${meta.og || 'default'}.png`;
}

const ORGANIZATION = {
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  name: SITE_NAME,
  url: `${SITE_URL}/`,
  logo: `${SITE_URL}/favicons/favicon-512x512.png`,
  description: DEFAULT_DESCRIPTION,
};

function softwareApplication() {
  return {
    '@type': 'SoftwareApplication',
    '@id': `${SITE_URL}/#software`,
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description: DEFAULT_DESCRIPTION,
    publisher: { '@id': ORGANIZATION['@id'] },
    offers: PLANS.map((plan) => ({
      '@type': 'Offer',
      name: plan.name,
      price: String(plan.price),
      priceCurrency: 'USD',
      url: `${SITE_URL}/pricing`,
      description: plan.block
        ? `Per month for one block of ${plan.block.paidSeats} paid + ${plan.block.freeSeats} free seats. ${plan.credits}.`
        : `Free forever: ${plan.credits}.`,
    })),
  };
}

// Sections with an index page of their own sit between Home and the page.
const SECTION_INDEX = { blog: '/blog', 'email-format': '/email-format' };

function breadcrumbs(route) {
  const trail = [{ name: 'Home', path: '/' }];
  const index = SECTION_INDEX[route.section];
  if (index && index !== route.path) trail.push({ name: SECTIONS[route.section].label, path: index });
  trail.push({ name: route.name, path: route.path });
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: t.name,
      item: absoluteUrl(t.path),
    })),
  };
}

const PUBLISHER = { '@type': 'Organization', name: SITE_NAME, url: `${SITE_URL}/` };

/** The main node for a content page: a guide, a free tool, or a web page. */
function contentNode(meta) {
  const url = absoluteUrl(meta.path);
  if (meta.section === 'blog') {
    return {
      '@type': 'BlogPosting',
      headline: meta.title.replace(/ \| DataPit$/, ''),
      description: meta.description,
      datePublished: meta.updated,
      dateModified: meta.updated,
      author: PUBLISHER,
      publisher: PUBLISHER,
      mainEntityOfPage: url,
      image: ogImageUrl(meta),
    };
  }
  if (meta.section === 'tools') {
    return {
      '@type': 'WebApplication',
      name: meta.name,
      url,
      description: meta.description,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      publisher: PUBLISHER,
    };
  }
  const node = { '@type': 'WebPage', url, name: meta.title, description: meta.description };
  if (meta.updated) node.dateModified = meta.updated;
  return node;
}

// Question-and-answer pages: the same items the page renders.
const PAGE_FAQS = { '/pricing': PRICING_FAQS, '/product': PRODUCT_FAQS };

function faqPage(items) {
  return {
    '@type': 'FAQPage',
    mainEntity: items.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
}

/**
 * The JSON-LD graph for a page, or null when it carries none. `body` is a
 * content page's full object (src/content/pages/…) — the prerender passes it
 * so the page's FAQ blocks become FAQPage markup.
 */
export function structuredData(meta, body) {
  if (!meta.path) return null;
  const graph = [];
  if (meta.path === '/') {
    graph.push(ORGANIZATION, {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      publisher: { '@id': ORGANIZATION['@id'] },
    });
    graph.push(softwareApplication());
  } else {
    if (meta.path === '/pricing') {
      graph.push(softwareApplication(), {
        '@type': 'WebPage',
        '@id': `${absoluteUrl(meta.path)}#webpage`,
        url: absoluteUrl(meta.path),
        name: meta.title,
        dateModified: PRICING_UPDATED_AT,
      });
    }
    if (meta.section) graph.push(contentNode(meta));
    graph.push(breadcrumbs(meta));
  }
  const faqs =
    PAGE_FAQS[meta.path] ??
    (body?.blocks ?? []).filter((b) => b.type === 'faq').flatMap((b) => b.items);
  if (faqs.length) graph.push(faqPage(faqs));
  return { '@context': 'https://schema.org', '@graph': graph };
}

/**
 * Every managed <head> element for a page, as plain descriptors both the
 * prerender (string output) and RouteMeta (DOM output) turn into tags. The
 * <title> is handled separately by each.
 */
export function headElements(meta, body) {
  const canonical = meta.path ? absoluteUrl(meta.path) : null;
  const image = ogImageUrl(meta);
  const els = [
    { tag: 'meta', attrs: { name: 'description', content: meta.description } },
    {
      tag: 'meta',
      attrs: {
        name: 'robots',
        content: meta.noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large',
      },
    },
  ];
  if (canonical) els.push({ tag: 'link', attrs: { rel: 'canonical', href: canonical } });
  els.push(
    {
      tag: 'meta',
      attrs: { property: 'og:type', content: meta.section === 'blog' ? 'article' : 'website' },
    },
    { tag: 'meta', attrs: { property: 'og:site_name', content: SITE_NAME } },
    { tag: 'meta', attrs: { property: 'og:locale', content: 'en_US' } },
    { tag: 'meta', attrs: { property: 'og:title', content: meta.title } },
    { tag: 'meta', attrs: { property: 'og:description', content: meta.description } },
  );
  if (canonical) els.push({ tag: 'meta', attrs: { property: 'og:url', content: canonical } });
  els.push(
    { tag: 'meta', attrs: { property: 'og:image', content: image } },
    { tag: 'meta', attrs: { property: 'og:image:width', content: String(OG_IMAGE_SIZE.width) } },
    { tag: 'meta', attrs: { property: 'og:image:height', content: String(OG_IMAGE_SIZE.height) } },
    { tag: 'meta', attrs: { property: 'og:image:alt', content: meta.title } },
    { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' } },
    { tag: 'meta', attrs: { name: 'twitter:title', content: meta.title } },
    { tag: 'meta', attrs: { name: 'twitter:description', content: meta.description } },
    { tag: 'meta', attrs: { name: 'twitter:image', content: image } },
  );
  const data = structuredData(meta, body);
  if (data)
    els.push({ tag: 'script', attrs: { type: 'application/ld+json' }, text: JSON.stringify(data) });
  return els;
}
