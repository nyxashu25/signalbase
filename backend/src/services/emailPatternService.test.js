import { describe, it, expect } from 'vitest';
import {
  PATTERNS,
  applyPattern,
  classifyLocalPart,
  exampleAddress,
  normalizeNamePart,
} from './emailPatternService.js';

// Every named pattern, as the local part it gives "Jane Doe".
const JANE_DOE = {
  'first.last': 'jane.doe',
  firstlast: 'janedoe',
  first_last: 'jane_doe',
  'first-last': 'jane-doe',
  flast: 'jdoe',
  'f.last': 'j.doe',
  firstl: 'janed',
  'first.l': 'jane.d',
  first: 'jane',
  last: 'doe',
  'last.first': 'doe.jane',
  lastfirst: 'doejane',
  lastf: 'doej',
};

describe('emailPatternService', () => {
  it('knows exactly the documented taxonomy, in priority order', () => {
    expect(PATTERNS).toEqual([...Object.keys(JANE_DOE), 'other']);
  });

  it.each(Object.entries(JANE_DOE))('classifies %s (%s@)', (pattern, local) => {
    expect(classifyLocalPart(local, 'Jane', 'Doe')).toBe(pattern);
    expect(applyPattern(pattern, 'Jane', 'Doe')).toBe(local);
  });

  it('classifies anything else as other', () => {
    expect(classifyLocalPart('jd1987', 'Jane', 'Doe')).toBe('other');
    expect(classifyLocalPart('jane.doe2', 'Jane', 'Doe')).toBe('other');
    expect(classifyLocalPart('sales', 'Jane', 'Doe')).toBe('other');
  });

  it('lowercases, strips diacritics and drops non-letters from names', () => {
    expect(normalizeNamePart('José-Luis')).toBe('joseluis');
    expect(normalizeNamePart("O'Brien")).toBe('obrien');
    expect(normalizeNamePart('Zoë')).toBe('zoe');
    expect(classifyLocalPart('jose.nunez', 'José', 'Núñez')).toBe('first.last');
    expect(classifyLocalPart('Mary.OBrien', 'Mary', "O'Brien")).toBe('first.last');
  });

  it('reads a one-letter name as an initial when two patterns fit', () => {
    // "jdoe" is both firstlast and flast for "J Doe": the company's format
    // is flast, since a one-letter first name is an initial.
    expect(classifyLocalPart('jdoe', 'J', 'Doe')).toBe('flast');
    expect(classifyLocalPart('j.doe', 'J', 'Doe')).toBe('f.last');
    expect(classifyLocalPart('doej', 'J', 'Doe')).toBe('lastf');
    expect(classifyLocalPart('j_doe', 'J', 'Doe')).toBe('first_last');
    expect(classifyLocalPart('janed', 'Jane', 'D')).toBe('firstl');
    expect(classifyLocalPart('jane.d', 'Jane', 'D')).toBe('first.l');
    // With full names there's no tie, so nothing changes.
    expect(classifyLocalPart('janedoe', 'Jane', 'Doe')).toBe('firstlast');
  });

  it('ignores a +tag on the address', () => {
    expect(classifyLocalPart('jane.doe+news', 'Jane', 'Doe')).toBe('first.last');
    expect(classifyLocalPart('JDoe+crm', 'Jane', 'Doe')).toBe('flast');
    expect(classifyLocalPart('+news', 'Jane', 'Doe')).toBe('other');
  });

  it('matches hyphenated and several-word names written run together, hyphenated or dotted', () => {
    expect(classifyLocalPart('mary.smith-jones', 'Mary', 'Smith-Jones')).toBe('first.last');
    expect(classifyLocalPart('mary.smithjones', 'Mary', 'Smith-Jones')).toBe('first.last');
    expect(classifyLocalPart('msmith-jones', 'Mary', 'Smith-Jones')).toBe('flast');
    expect(classifyLocalPart('jean-luc.picard', 'Jean-Luc', 'Picard')).toBe('first.last');
    expect(classifyLocalPart('jean.luc.picard', 'Jean Luc', 'Picard')).toBe('first.last');
    expect(classifyLocalPart('anna.vandyke', 'Anna', 'van Dyke')).toBe('first.last');
    // Suggestions always use the run-together form.
    expect(applyPattern('first.last', 'Mary', 'Smith-Jones')).toBe('mary.smithjones');
  });

  it('transliterates letters that have no accent to strip', () => {
    expect(normalizeNamePart('Søren')).toBe('soren');
    expect(normalizeNamePart('Łukasz')).toBe('lukasz');
    expect(normalizeNamePart('Straße')).toBe('strasse');
    expect(normalizeNamePart('Ærø')).toBe('aero');
    expect(classifyLocalPart('soren.lukasz', 'Søren', 'Łukasz')).toBe('first.last');
  });

  it('puts a name with no letters left after normalizing in other, and builds nothing from it', () => {
    expect(classifyLocalPart('wei.zhang', '伟', '张')).toBe('other');
    expect(applyPattern('first.last', '伟', '张')).toBeNull();
    expect(applyPattern('other', 'Jane', 'Doe')).toBeNull();
  });

  it('builds examples from Jane Doe only', () => {
    expect(exampleAddress('first.last', 'acme.com')).toBe('jane.doe@acme.com');
    expect(exampleAddress('lastf', 'acme.com')).toBe('doej@acme.com');
    expect(exampleAddress('other', 'acme.com')).toBe('');
  });
});
