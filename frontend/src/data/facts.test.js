import { describe, it, expect } from 'vitest';
import {
  BOILERPLATE_MEDIUM,
  BOILERPLATE_SHORT,
  DATAPIT_SUMMARY,
  LIVE,
  PROFILES,
} from './facts.js';

const words = (text) => text.trim().split(/\s+/).length;

describe('facts: boilerplate', () => {
  it('comes in about 50 and about 100 words, each opening with the one-line summary', () => {
    expect(words(BOILERPLATE_SHORT)).toBeGreaterThanOrEqual(40);
    expect(words(BOILERPLATE_SHORT)).toBeLessThanOrEqual(65);
    expect(words(BOILERPLATE_MEDIUM)).toBeGreaterThanOrEqual(85);
    expect(words(BOILERPLATE_MEDIUM)).toBeLessThanOrEqual(120);
    for (const text of [BOILERPLATE_SHORT, BOILERPLATE_MEDIUM]) {
      expect(text.startsWith(DATAPIT_SUMMARY)).toBe(true);
    }
  });

  it('states prices from the plan data', () => {
    expect(BOILERPLATE_SHORT).toContain('$29 a month for 5 paid seats plus 1 free');
    expect(BOILERPLATE_MEDIUM).toContain('to $99 for 14 paid plus 5 free');
    expect(BOILERPLATE_MEDIUM).toContain('800 credits a month');
  });

  it("claims nothing production doesn't do yet", () => {
    for (const text of [BOILERPLATE_SHORT, BOILERPLATE_MEDIUM]) {
      if (!LIVE.emailVerification) expect(text).not.toMatch(/\bverified\b/i);
      if (!LIVE.phoneData) expect(text).not.toMatch(/phone/i);
      if (!LIVE.sequenceSending) expect(text).not.toMatch(/sequence|outreach/i);
      if (!LIVE.database) {
        expect(text).not.toMatch(/million|database of|\d+,\d{3} (contacts|companies)/i);
      }
      expect(text).not.toMatch(/\b(intent|integrations?|CRM|API|SSO)\b/i);
    }
  });
});

describe('facts: profiles', () => {
  it('lists each profile as a name and an https URL', () => {
    for (const profile of PROFILES) {
      expect(profile.name).toBeTruthy();
      expect(profile.url).toMatch(/^https:\/\//);
    }
  });
});
