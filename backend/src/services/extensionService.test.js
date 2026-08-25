import { describe, it, expect } from 'vitest';
import { extractJobTitle } from './extensionService.js';

describe('extractJobTitle — distil a clean title from a LinkedIn headline', () => {
  it.each([
    // [headline, expected clean title]
    ['Head of Growth at Skyline Labs', 'Head of Growth'],
    ['Head of Growth @ Skyline Labs', 'Head of Growth'],
    ['VP of Sales at Vertex Labs | ex-Google | Speaker', 'VP of Sales'],
    ['Full Stack Developer | React | Node', 'Full Stack Developer'],
    ['Senior Product Manager · Building things', 'Senior Product Manager'],
    ['VP Engineering — Acme Corp', 'VP Engineering'],
    ['Engineering Manager – Acme', 'Engineering Manager'],
    // No boundary → returned as-is
    ['Senior Product Manager', 'Senior Product Manager'],
    // Hyphenated words without surrounding spaces must survive
    ['CTO & Co-founder', 'CTO & Co-founder'],
    ['Co-founder at Acme', 'Co-founder'],
    // "at" only splits as a whole word with spaces — not inside another word
    ['Data Strategy Lead', 'Data Strategy Lead'],
    ['Chat Support Lead at Zendesk', 'Chat Support Lead'],
    ['  Trimmed Title  ', 'Trimmed Title'],
  ])('%s -> %s', (headline, expected) => {
    expect(extractJobTitle(headline)).toBe(expected);
  });

  it.each([[null], [undefined], [''], ['   ']])('%s -> null', (v) => {
    expect(extractJobTitle(v)).toBeNull();
  });
});
