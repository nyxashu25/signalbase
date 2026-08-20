// The "RPF" CSV format super admins upload through Extend Database. Mirrors
// the columns produced by scratch/build_rpf_export.py so a round-tripped
// export/import stays consistent, and the picklists documented there.
export const RPF_HEADERS = [
  'Date',
  'First Name',
  'Last Name',
  'Job Title',
  'Email ID',
  'Domain',
  'Department',
  'Seniority',
  'Company Name',
  'Industry Type',
  'TelephoneNo',
  'Alternative No.',
  'Address',
  'City',
  'Zip Code',
  'State',
  'Country',
  'Emp Size',
  'Revenue',
  'Prospect Linkedin profile Link',
  'Company Linkedin profile Link',
];

// A row needs at least enough to create a Contact and identify its Company —
// every other column is optional context.
export const RPF_REQUIRED_HEADERS = ['First Name', 'Last Name', 'Company Name'];

const EMP_SIZE_BUCKETS = [
  [0, 1, '0-1'],
  [2, 10, '2-10'],
  [11, 50, '11-50'],
  [51, 200, '51-200'],
  [201, 500, '201-500'],
  [501, 1000, '501-1000'],
  [1001, 5000, '1001-5000'],
  [5001, 10000, '5001-10000'],
];

/** Inverse of the bucketing in build_rpf_export.py — "51-200" -> {min: 51, max: 200}. */
export function parseEmpSize(value) {
  if (!value) return { min: null, max: null };
  const trimmed = value.trim();
  if (trimmed.endsWith('+')) {
    const min = Number(trimmed.slice(0, -1));
    return Number.isFinite(min) ? { min, max: null } : { min: null, max: null };
  }
  const match = EMP_SIZE_BUCKETS.find(([, , label]) => label === trimmed);
  if (match) return { min: match[0], max: match[1] };
  const [minStr, maxStr] = trimmed.split('-');
  const min = Number(minStr);
  const max = Number(maxStr);
  return {
    min: Number.isFinite(min) ? min : null,
    max: Number.isFinite(max) ? max : null,
  };
}
