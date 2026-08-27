import { es } from '../config/elasticsearch.js';
import { prisma } from '../config/db.js';
import { COMPANIES_INDEX, CONTACTS_INDEX } from '../config/esIndices.js';
import { attachRevealStatus } from './maskingService.js';
import { ApiError } from '../middleware/errorHandler.js';
import { resolveReservationForCommit, releaseReservation, refundAmount } from './creditService.js';
import { CREDIT_COSTS } from '../config/creditPricing.js';
import { HEADCOUNT_KEYS } from '../validators/searchValidators.js';

const FACET_SIZE = 20;

// Bucket boundaries keyed exactly like the validator's HEADCOUNT_KEYS. A
// company lands in the bucket its headcountMin falls into (the lower bound
// is the one the dataset reliably has); `to` is exclusive, ES-style.
const HEADCOUNT_BUCKETS = {
  '1-10': { from: 1, to: 11 },
  '11-50': { from: 11, to: 51 },
  '51-200': { from: 51, to: 201 },
  '201-500': { from: 201, to: 501 },
  '501-1000': { from: 501, to: 1001 },
  '1001-5000': { from: 1001, to: 5001 },
  '5001+': { from: 5001 },
};

// emailStatus is derived from two indexed booleans (see esIndices.js —
// the raw address is deliberately never indexed), so both the filter and
// the facet are expressed as the same three bool sub-queries.
const EMAIL_STATUS_QUERIES = {
  verified: { bool: { filter: [{ term: { hasEmail: true } }, { term: { emailVerified: true } }] } },
  unverified: {
    bool: { filter: [{ term: { hasEmail: true } }, { term: { emailVerified: false } }] },
  },
  not_found: { bool: { filter: [{ term: { hasEmail: false } }] } },
};

const COMPANY_SORTS = {
  relevance: [{ _score: 'desc' }, { 'name.keyword': 'asc' }],
  name_asc: [{ 'name.keyword': 'asc' }],
  name_desc: [{ 'name.keyword': 'desc' }],
  headcount_desc: [{ headcountMin: { order: 'desc', missing: '_last' } }, { 'name.keyword': 'asc' }],
  newest: [{ createdAt: 'desc' }],
};

const PEOPLE_SORTS = {
  relevance: [{ _score: 'desc' }, { 'fullName.keyword': 'asc' }],
  name_asc: [{ 'fullName.keyword': 'asc' }],
  name_desc: [{ 'fullName.keyword': 'desc' }],
  newest: [{ createdAt: 'desc' }],
};

function termsFilter(field, values) {
  return values?.length ? [{ terms: { [field]: values } }] : [];
}

function textQuery(q, fields) {
  return q ? [{ multi_match: { query: q, fields } }] : [];
}

// A "contains" text filter on one analyzed field. match_phrase_prefix so
// "finance man" matches "Finance Manager" — the way a user types a title
// filter, not a full token match.
function containsFilter(field, value) {
  return value ? [{ match_phrase_prefix: { [field]: { query: value } } }] : [];
}

function headcountFilter(keys) {
  if (!keys?.length) return [];
  return [
    {
      bool: {
        should: keys.map((k) => {
          const { from, to } = HEADCOUNT_BUCKETS[k];
          return { range: { headcountMin: { gte: from, ...(to ? { lt: to } : {}) } } };
        }),
        minimum_should_match: 1,
      },
    },
  ];
}

function emailStatusFilter(keys) {
  if (!keys?.length) return [];
  return [{ bool: { should: keys.map((k) => EMAIL_STATUS_QUERIES[k]), minimum_should_match: 1 } }];
}

// NOTE: aggregations run inside the same filtered query context as the
// hits, so facet counts reflect the *current* filter selection rather than
// "what would each option's count be if I also selected it" (the latter
// needs a separate post_filter per facet). Fine for MVP; revisit if the
// filter rail needs to show non-collapsing counts.
function extractTermFacets(aggregations, fields) {
  const facets = {};
  for (const field of fields) {
    facets[field] = (aggregations?.[field]?.buckets ?? []).map((b) => ({
      value: b.key,
      count: b.doc_count,
    }));
  }
  return facets;
}

// range/filters aggregations return keyed buckets (an object, not an array)
// — normalise to the same {value, count} shape the rail renders, in the
// declared key order so the UI never has to sort buckets itself.
function extractKeyedFacet(agg, keys) {
  const buckets = agg?.buckets ?? {};
  return keys.map((k) => ({ value: k, count: buckets[k]?.doc_count ?? 0 }));
}

// Elasticsearch decides *which* ids match and in what order; Postgres is
// asked for exactly those ids afterward and the caller re-sorts to match —
// an IN (...) query does not preserve argument order.
function reorderByIds(rows, ids) {
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids.map((id) => byId.get(id)).filter(Boolean);
}

export async function searchCompanies({
  q,
  industry = [],
  location = [],
  techStack = [],
  headcount = [],
  sort = 'relevance',
  page = 1,
  pageSize = 25,
}) {
  const query = {
    bool: {
      must: textQuery(q, ['name^2']),
      filter: [
        ...termsFilter('industry', industry),
        ...termsFilter('location', location),
        ...termsFilter('techStack', techStack),
        ...headcountFilter(headcount),
      ],
    },
  };

  const result = await es.search({
    index: COMPANIES_INDEX,
    query,
    from: (page - 1) * pageSize,
    size: pageSize,
    track_total_hits: true,
    sort: COMPANY_SORTS[sort] ?? COMPANY_SORTS.relevance,
    aggs: {
      industry: { terms: { field: 'industry', size: FACET_SIZE } },
      location: { terms: { field: 'location', size: FACET_SIZE } },
      techStack: { terms: { field: 'techStack', size: FACET_SIZE } },
      headcount: {
        range: {
          field: 'headcountMin',
          keyed: true,
          ranges: HEADCOUNT_KEYS.map((key) => ({ key, ...HEADCOUNT_BUCKETS[key] })),
        },
      },
    },
  });

  const ids = result.hits.hits.map((h) => h._id);
  const rows = await prisma.company.findMany({ where: { id: { in: ids } } });

  return {
    results: reorderByIds(rows, ids),
    total: result.hits.total.value,
    page,
    pageSize,
    facets: {
      ...extractTermFacets(result.aggregations, ['industry', 'location', 'techStack']),
      headcount: extractKeyedFacet(result.aggregations?.headcount, HEADCOUNT_KEYS),
    },
  };
}

// A single unpaginated export query, capped rather than paginated — this
// dataset is small enough that scrolling/streaming would be premature.
const EXPORT_LIMIT = 5000;

export async function exportCompanies(filters) {
  const { results } = await searchCompanies({ ...filters, page: 1, pageSize: EXPORT_LIMIT });
  return results;
}

export async function exportPeople(filters) {
  const { results } = await searchPeople({ ...filters, page: 1, pageSize: EXPORT_LIMIT });
  return results;
}

// reservationId is null when reserveCompanyViewCredits found this company
// already viewed by the workspace — nothing to commit, this view is free.
export async function getCompanyDetail(workspaceId, userId, companyId, reservationId) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      contacts: {
        where: { redactedAt: null },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      },
    },
  });

  if (!company) {
    if (reservationId) await releaseReservation(reservationId);
    throw new ApiError(404, 'Company not found');
  }

  let charged = false;
  if (reservationId) {
    const { amount } = await resolveReservationForCommit(reservationId, { workspaceId });
    try {
      await prisma.$transaction([
        prisma.creditLedgerEntry.create({
          data: { workspaceId, delta: -amount, reason: 'COMPANY_VIEW', spentById: userId },
        }),
        prisma.companyDetailView.create({ data: { workspaceId, companyId, viewedById: userId } }),
      ]);
      charged = true;
    } catch (err) {
      if (err.code !== 'P2002') throw err;
      // Lost a race against a concurrent identical request from the same
      // workspace — it already committed its CompanyDetailView row. The
      // reservation's Redis side is already cleared, so refund directly
      // rather than double-charge for a view someone else just paid for.
      await refundAmount(workspaceId, amount);
    }
  }

  const { contacts, ...rest } = company;
  return {
    ...rest,
    contacts: await attachRevealStatus(workspaceId, contacts),
    viewCost: charged ? CREDIT_COSTS.COMPANY_DETAIL_VIEW : 0,
  };
}

export async function searchPeople({
  workspaceId,
  q,
  title,
  company,
  seniority = [],
  department = [],
  industry = [],
  location = [],
  emailStatus = [],
  sort = 'relevance',
  page = 1,
  pageSize = 25,
}) {
  const query = {
    bool: {
      must: textQuery(q, ['fullName^2', 'title']),
      filter: [
        ...containsFilter('title', title),
        ...containsFilter('companyName', company),
        ...termsFilter('seniority', seniority),
        ...termsFilter('department', department),
        ...termsFilter('industry', industry),
        ...termsFilter('location', location),
        ...emailStatusFilter(emailStatus),
      ],
    },
  };

  const result = await es.search({
    index: CONTACTS_INDEX,
    query,
    from: (page - 1) * pageSize,
    size: pageSize,
    track_total_hits: true,
    sort: PEOPLE_SORTS[sort] ?? PEOPLE_SORTS.relevance,
    aggs: {
      seniority: { terms: { field: 'seniority', size: FACET_SIZE } },
      department: { terms: { field: 'department', size: FACET_SIZE } },
      industry: { terms: { field: 'industry', size: FACET_SIZE } },
      location: { terms: { field: 'location', size: FACET_SIZE } },
      emailStatus: { filters: { filters: EMAIL_STATUS_QUERIES } },
    },
  });

  const ids = result.hits.hits.map((h) => h._id);
  const rows = await prisma.contact.findMany({
    where: { id: { in: ids } },
    include: { company: { select: { id: true, name: true, domain: true } } },
  });
  const ordered = reorderByIds(rows, ids);
  const masked = await attachRevealStatus(workspaceId, ordered);

  return {
    results: masked,
    total: result.hits.total.value,
    page,
    pageSize,
    facets: {
      ...extractTermFacets(result.aggregations, ['seniority', 'department', 'industry', 'location']),
      emailStatus: extractKeyedFacet(
        result.aggregations?.emailStatus,
        Object.keys(EMAIL_STATUS_QUERIES),
      ),
    },
  };
}
