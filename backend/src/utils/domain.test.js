import { describe, it, expect } from 'vitest';
import { normalizeDomain, isValidHostname } from './domain.js';

describe('normalizeDomain', () => {
  it.each([
    ['acme.com', 'acme.com'],
    ['  ACME.com  ', 'acme.com'],
    ['www.acme.com', 'acme.com'],
    ['https://www.Acme.com/about?x=1#team', 'acme.com'],
    ['http://acme.co.uk:8080', 'acme.co.uk'],
    ['acme.com/careers', 'acme.com'],
    ['jane.doe@Acme.com', 'acme.com'],
    ['acme.com.', 'acme.com'],
    ['bücher.de', 'xn--bcher-kva.de'],
  ])('%j -> %j', (input, expected) => {
    expect(normalizeDomain(input)).toBe(expected);
  });

  it.each([
    '',
    '   ',
    'acme',
    'not a domain',
    '192.168.0.1',
    'http://',
    'jane@',
    'acme_corp.com',
    null,
  ])('rejects %j', (input) => {
    expect(normalizeDomain(input)).toBeNull();
  });
});

describe('isValidHostname', () => {
  it('rejects labels with leading/trailing hyphens and over-long names', () => {
    expect(isValidHostname('-acme.com')).toBe(false);
    expect(isValidHostname('acme-.com')).toBe(false);
    expect(isValidHostname(`${'a'.repeat(64)}.com`)).toBe(false);
    expect(isValidHostname('mail.acme.com')).toBe(true);
  });
});
