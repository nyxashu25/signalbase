// A leading =, +, -, or @ is how CSV formula injection works (Excel/Sheets
// evaluate it as a formula on open) — prefixing with a quote forces it back
// to plain text. Applied before quoting so the leading quote itself is
// never mistaken for the start of a quoted field.
function sanitize(value) {
  const str = value === null || value === undefined ? '' : String(value);
  return /^[=+\-@]/.test(str) ? `'${str}` : str;
}

function escapeField(value) {
  const str = sanitize(value);
  return /[",\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

/**
 * columns: [{ header, value: (row) => cell }]
 */
export function toCsv(rows, columns) {
  const lines = [columns.map((c) => escapeField(c.header)).join(',')];
  for (const row of rows) {
    lines.push(columns.map((c) => escapeField(c.value(row))).join(','));
  }
  return lines.join('\r\n') + '\r\n';
}
