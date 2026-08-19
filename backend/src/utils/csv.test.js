import { describe, it, expect } from 'vitest';
import { toCsv } from './csv.js';

describe('toCsv', () => {
  it('renders a header row and one row per record', () => {
    const csv = toCsv(
      [
        { name: 'Nova Systems', industry: 'SaaS' },
        { name: 'Halo Health', industry: 'Healthcare' },
      ],
      [
        { header: 'Name', value: (r) => r.name },
        { header: 'Industry', value: (r) => r.industry },
      ],
    );

    expect(csv).toBe('Name,Industry\r\nNova Systems,SaaS\r\nHalo Health,Healthcare\r\n');
  });

  it('quotes fields containing commas, quotes, or newlines', () => {
    const csv = toCsv(
      [{ name: 'Acme, Inc.', note: 'Says "hello"\nnew line' }],
      [
        { header: 'Name', value: (r) => r.name },
        { header: 'Note', value: (r) => r.note },
      ],
    );

    expect(csv).toBe('Name,Note\r\n"Acme, Inc.","Says ""hello""\nnew line"\r\n');
  });

  it('renders null/undefined values as empty fields', () => {
    const csv = toCsv([{ name: 'Nova' }], [
      { header: 'Name', value: (r) => r.name },
      { header: 'Missing', value: (r) => r.missing },
    ]);

    expect(csv).toBe('Name,Missing\r\nNova,\r\n');
  });

  it('neutralizes leading =, +, -, @ to prevent CSV formula injection', () => {
    const csv = toCsv(
      [
        { v: '=SUM(A1:A9)' },
        { v: '+1234' },
        { v: '-1234' },
        { v: '@cmd' },
        { v: 'safe-value' },
      ],
      [{ header: 'V', value: (r) => r.v }],
    );

    const rows = csv.trim().split('\r\n').slice(1);
    expect(rows).toEqual([
      "'=SUM(A1:A9)",
      "'+1234",
      "'-1234",
      "'@cmd",
      'safe-value',
    ]);
  });
});
