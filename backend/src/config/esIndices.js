// Plain index names for now — a blue/green alias-swap strategy for
// zero-downtime remapping is a Phase 06 scaling concern, not needed yet.
export const COMPANIES_INDEX = 'companies';
export const CONTACTS_INDEX = 'contacts';

const keywordAndText = {
  type: 'text',
  fields: { keyword: { type: 'keyword' } },
};

export const companyMapping = {
  properties: {
    id: { type: 'keyword' },
    name: keywordAndText,
    domain: { type: 'keyword' },
    industry: { type: 'keyword' },
    headcountMin: { type: 'integer' },
    headcountMax: { type: 'integer' },
    location: { type: 'keyword' },
    techStack: { type: 'keyword' },
    createdAt: { type: 'date' },
  },
};

export const contactMapping = {
  properties: {
    id: { type: 'keyword' },
    companyId: { type: 'keyword' },
    // Denormalized from Company at index time so people-search can filter/
    // display by company facts without a join. Source of truth stays
    // Postgres; these fields go stale only until the next reindex.
    companyName: keywordAndText,
    industry: { type: 'keyword' },
    location: { type: 'keyword' },

    fullName: keywordAndText,
    title: keywordAndText,
    seniority: { type: 'keyword' },
    department: { type: 'keyword' },

    // Deliberately NOT indexing the raw email address — search results are
    // always hydrated + masked from Postgres (see searchService.js), so ES
    // never needs to hold the value at all. One less place a real email
    // could leak from.
    hasEmail: { type: 'boolean' },
    emailVerified: { type: 'boolean' },

    createdAt: { type: 'date' },
  },
};
