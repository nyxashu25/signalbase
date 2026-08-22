import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { env } from '../config/env.js';
import { resetDb } from '../test/dbHelpers.js';
import { prisma } from '../config/db.js';
import { signUnsubscribeToken, verifyUnsubscribeToken } from './tokenService.js';
import {
  sendTicketCreatedConfirmation,
  sendContactFormLead,
  sendPromotionalBroadcast,
  unsubscribeUser,
} from './notificationService.js';

// Every test drives the real (configured) Resend send path so the actual
// HTML string that would be emailed is inspectable — the simulated path
// only logs, it never builds/exposes the HTML.
function stubResend() {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify({ id: 'resend-test' }), { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
  env.RESEND_API_KEY = 'test-key';
  return fetchMock;
}

function htmlFromCall(fetchMock, callIndex = 0) {
  return JSON.parse(fetchMock.mock.calls[callIndex][1].body).html;
}

describe('notificationService HTML escaping', () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterEach(() => {
    env.RESEND_API_KEY = undefined;
    vi.unstubAllGlobals();
  });

  it('escapes a malicious user name and ticket subject before they reach the email HTML', async () => {
    const fetchMock = stubResend();
    const user = { name: '<img src=x onerror=alert(1)>', email: 'attacker@test.com' };
    const ticket = { id: 't1', subject: '</p><script>alert(1)</script>' };

    await sendTicketCreatedConfirmation(user, ticket);

    const html = htmlFromCall(fetchMock);
    expect(html).not.toContain('<img src=x onerror=alert(1)>');
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('escapes every field of an unauthenticated contact-form submission', async () => {
    const admin = await prisma.superAdmin.create({
      data: { email: 'root@datapit.io', passwordHash: 'x', name: 'Root' },
    });
    const fetchMock = stubResend();

    await sendContactFormLead({
      name: '<b>Prospect</b>',
      email: 'prospect@test.com',
      company: '<script>evil()</script>',
      message: 'line one\n<script>alert(2)</script>',
      category: 'general',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const html = htmlFromCall(fetchMock);
    expect(html).not.toContain('<script>evil()</script>');
    expect(html).not.toContain('<script>alert(2)</script>');
    expect(html).toContain('&lt;b&gt;Prospect&lt;/b&gt;');
    // Sanity: the admin row above exists purely so the send path isn't a
    // no-op — unused otherwise.
    expect(admin.email).toBe('root@datapit.io');
  });
});

describe('notificationService.sendPromotionalBroadcast', () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterEach(() => {
    env.RESEND_API_KEY = undefined;
    vi.unstubAllGlobals();
  });

  it('includes a working per-user unsubscribe link', async () => {
    const fetchMock = stubResend();
    const user = { id: 'user-1', email: 'a@test.com', name: 'A' };

    await sendPromotionalBroadcast([user], 'A new feature', '<p>Check it out</p>');

    const html = htmlFromCall(fetchMock);
    const match = html.match(/\/unsubscribe\?token=([^"]+)/);
    expect(match).toBeTruthy();

    const payload = verifyUnsubscribeToken(match[1]);
    expect(payload.sub).toBe('user-1');
  });
});

describe('notificationService.unsubscribeUser', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('flips marketingOptOut for the token-carried user', async () => {
    const org = await prisma.org.create({ data: { name: 'Acme', slug: 'acme-notif-test' } });
    const workspace = await prisma.workspace.create({ data: { orgId: org.id, name: 'Acme WS' } });
    const user = await prisma.user.create({
      data: { email: 'opt-out-me@test.com', name: 'Opt Out', emailVerified: true },
    });
    await prisma.membership.create({
      data: { userId: user.id, workspaceId: workspace.id, role: 'OWNER' },
    });

    const result = await unsubscribeUser(signUnsubscribeToken(user.id));

    expect(result).toEqual({ unsubscribed: true });
    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updated.marketingOptOut).toBe(true);
  });

  it('rejects a malformed token', async () => {
    await expect(unsubscribeUser('not-a-real-token')).rejects.toMatchObject({ statusCode: 400 });
  });
});
