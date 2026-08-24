import { describe, it, expect } from 'vitest';
import { linkedinSlugFromUrl } from './linkedin.js';

describe('linkedinSlugFromUrl', () => {
  it.each([
    // [input, expected]
    ['https://www.linkedin.com/in/jane-doe', 'jane-doe'],
    ['https://linkedin.com/in/jane-doe', 'jane-doe'],
    ['http://www.linkedin.com/in/jane-doe', 'jane-doe'],
    // Country subdomains
    ['https://in.linkedin.com/in/jane-doe', 'jane-doe'],
    ['https://uk.linkedin.com/in/jane-doe', 'jane-doe'],
    // Trailing slash / query / fragment / extra path segments
    ['https://www.linkedin.com/in/jane-doe/', 'jane-doe'],
    ['https://www.linkedin.com/in/jane-doe?utm_source=share&utm_medium=ios', 'jane-doe'],
    ['https://www.linkedin.com/in/jane-doe#experience', 'jane-doe'],
    ['https://www.linkedin.com/in/jane-doe/details/experience/', 'jane-doe'],
    // Casing
    ['https://www.linkedin.com/in/Jane-Doe', 'jane-doe'],
    // Numeric/vanity ids
    ['https://www.linkedin.com/in/jane-doe-1a2b3c45', 'jane-doe-1a2b3c45'],
    // Percent-encoded unicode slugs decode to one identity
    ['https://www.linkedin.com/in/%C3%A9lodie-durand', 'élodie-durand'],
  ])('%s -> %s', (input, expected) => {
    expect(linkedinSlugFromUrl(input)).toBe(expected);
  });

  it.each([
    [null],
    [undefined],
    [''],
    ['not a url'],
    ['https://www.linkedin.com/company/acme'],
    ['https://www.linkedin.com/feed/'],
    ['https://www.linkedin.com/in/'],
    ['https://evil.example.com/in/jane-doe'],
    // linkedin.com must be the host, not a substring of another domain
    ['https://notlinkedin.com.evil.example/in/jane-doe'],
    ['https://xlinkedin.com/in/jane-doe'],
    ['https://linkedin.com.evil.example/in/jane-doe'],
  ])('%s -> null', (input) => {
    expect(linkedinSlugFromUrl(input)).toBeNull();
  });

  it('malformed percent-escapes keep the raw (lowercased) slug instead of throwing', () => {
    expect(linkedinSlugFromUrl('https://www.linkedin.com/in/JANE%ZZdoe')).toBe('jane%zzdoe');
  });
});
