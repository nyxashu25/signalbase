import { es } from '../config/elasticsearch.js';
import { prisma } from '../config/db.js';
import { COMPANIES_INDEX, CONTACTS_INDEX } from '../config/esIndices.js';
import { attachRevealStatus } from './maskingService.js';
import { ApiError } from '../middleware/errorHandler.js';

const FACET_SIZE = 20;

function termsFilter(field, values) {
  return values?.length ? [{ terms: { [field]: values } }] : [];
}

function textQuery(q, fields) {
  return q ? [{ multi_match: { query: q, fields } }] : [];
}

// NOTE: aggregations run inside the same filtered query context as the
// hits, so facet counts reflect the *current* filter selection rather than
// "what would each option's count be if I also selected it" (the latter
// needs a separate post_filter per facet). Fine for MVP; revisit if the
// FacetPanel needs to show non-collapsing counts.
function extractFacets(aggregations, fields) {
  const facets = {};
  for (const field of fields) {
    facets[field] = (aggregations?.[field]?.buckets ?? []).map((b) => ({
      value: b.key,
      count: b.doc_count,
    }));
  }
  return facets;
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
      ],
    },
  };

  const result = await es.search({
    index: COMPANIES_INDEX,
    query,
    from: (page - 1) * pageSize,
    size: pageSize,
    track_total_hits: true,
    sort: [{ _score: 'desc' }, { 'name.keyword': 'asc' }],
    aggs: {
      industry: { terms: { field: 'industry', size: FACET_SIZE } },
      location: { terms: { field: 'location', size: FACET_SIZE } },
      techStack: { terms: { field: 'techStack', size: FACET_SIZE } },
    },
  });

  const ids = result.hits.hits.map((h) => h._id);
  const rows = await prisma.company.findMany({ where: { id: { in: ids } } });

  return {
    results: reorderByIds(rows, ids),
    total: result.hits.total.value,
    page,
    pageSize,
    facets: extractFacets(result.aggregations, ['industry', 'location', 'techStack']),
  };
}

export async function getCompanyDetail(workspaceId, companyId) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      contacts: {
        where: { redactedAt: null },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      },
    },
  });
  if (!company) throw new ApiError(404, 'Company not found');

  const { contacts, ...rest } = company;
  return { ...rest, contacts: await attachRevealStatus(workspaceId, contacts) };
}

export async function searchPeople({
  workspaceId,
  q,
  seniority = [],
  department = [],
  industry = [],
  location = [],
  page = 1,
  pageSize = 25,
}) {
  const query = {
    bool: {
      must: textQuery(q, ['fullName^2', 'title']),
      filter: [
        ...termsFilter('seniority', seniority),
        ...termsFilter('department', department),
        ...termsFilter('industry', industry),
        ...termsFilter('location', location),
      ],
    },
  };

  const result = await es.search({
    index: CONTACTS_INDEX,
    query,
    from: (page - 1) * pageSize,
    size: pageSize,
    track_total_hits: true,
    sort: [{ _score: 'desc' }, { 'fullName.keyword': 'asc' }],
    aggs: {
      seniority: { terms: { field: 'seniority', size: FACET_SIZE } },
      department: { terms: { field: 'department', size: FACET_SIZE } },
      industry: { terms: { field: 'industry', size: FACET_SIZE } },
      location: { terms: { field: 'location', size: FACET_SIZE } },
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
    facets: extractFacets(result.aggregations, ['seniority', 'department', 'industry', 'location']),
  };
}
