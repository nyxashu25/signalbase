import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { prisma } from '../config/db.js';
import { resetDb } from '../test/dbHelpers.js';
import { maskEmail, maskPhone, attachRevealStatus } from './maskingService.js';

describe('maskEmail', () => {
  it('keeps the first character of local and domain, masks the rest', () => {
    const masked = maskEmail('jordan.bennett@novasystems.com');
    expect(masked).toMatch(/^j\*+@n\*+\.com$/);
    expect(masked).not.toContain('bennett');
    expect(masked).not.toContain('systems');
  });

  it('never reveals length exactly for very short parts (floors at 3 stars)', () => {
    expect(maskEmail('ab@cd.io')).toBe('a***@c***.io');
  });
});

describe('maskPhone', () => {
  it('keeps the leading prefix and last two digits, masks the middle, preserves separators', () => {
    expect(maskPhone('+1 415 555 0132')).toBe('+1 415 *** **32');
    expect(maskPhone('020-7946-0958')).toBe('020-7***-**58');
  });

  it('masks everything for very short numbers', () => {
    expect(maskPhone('1234')).toBe('****');
  });
});

describe('attachRevealStatus', () => {
  let workspaceAId;
  let workspaceBId;
  let contactId;

  beforeEach(async () => {
    await resetDb();

    const org = await prisma.org.create({ data: { slug: 'test-org', name: 'Test Org' } });
    const wsA = await prisma.workspace.create({ data: { orgId: org.id, name: 'WS A' } });
    const wsB = await prisma.workspace.create({ data: { orgId: org.id, name: 'WS B' } });
    workspaceAId = wsA.id;
    workspaceBId = wsB.id;

    const company = await prisma.company.create({
      data: { name: 'Nova Systems', domain: 'novasystems.com' },
    });
    const contact = await prisma.contact.create({
      data: {
        companyId: company.id,
        firstName: 'Jordan',
        lastName: 'Bennett',
        email: 'jordan.bennett@novasystems.com',
      },
    });
    contactId = contact.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('masks the email when the workspace has no reveal on record', async () => {
    const [result] = await attachRevealStatus(workspaceAId, [
      { id: contactId, email: 'jordan.bennett@novasystems.com' },
    ]);
    expect(result.revealed).toBe(false);
    expect(result.email).toBe('j*************@n**********.com');
  });

  it('returns the real email only for the workspace that revealed it', async () => {
    const user = await prisma.user.create({
      data: { email: 'u@test.com', passwordHash: 'x', name: 'U' },
    });
    await prisma.emailReveal.create({
      data: { workspaceId: workspaceAId, contactId, revealedById: user.id },
    });

    const [revealedForA] = await attachRevealStatus(workspaceAId, [
      { id: contactId, email: 'jordan.bennett@novasystems.com' },
    ]);
    expect(revealedForA.revealed).toBe(true);
    expect(revealedForA.email).toBe('jordan.bennett@novasystems.com');

    const [stillMaskedForB] = await attachRevealStatus(workspaceBId, [
      { id: contactId, email: 'jordan.bennett@novasystems.com' },
    ]);
    expect(stillMaskedForB.revealed).toBe(false);
    expect(stillMaskedForB.email).toBe('j*************@n**********.com');
  });

  it('passes through contacts with no email on file untouched', async () => {
    const [result] = await attachRevealStatus(workspaceAId, [{ id: contactId, email: null }]);
    expect(result.revealed).toBe(false);
    expect(result.email).toBeNull();
  });
});
