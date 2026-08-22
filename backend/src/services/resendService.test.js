import { describe, it, expect, afterEach, vi } from 'vitest';
import { env } from '../config/env.js';
import { sendEmail } from './resendService.js';

describe('resendService.sendEmail', () => {
  afterEach(() => {
    env.RESEND_API_KEY = undefined;
    vi.unstubAllGlobals();
  });

  it('simulates a send when RESEND_API_KEY is not configured', async () => {
    const result = await sendEmail({ to: 'a@b.com', subject: 'Hi', html: '<p>Hi</p>' });

    expect(result.sent).toBe(true);
    expect(result.provider).toBe('simulated');
    expect(result.messageId).toMatch(/^simulated-/);
  });

  it('calls the Resend API when RESEND_API_KEY is configured, and returns the real message id', async () => {
    env.RESEND_API_KEY = 'test-key';
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ id: 'resend-abc123' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await sendEmail({ to: 'a@b.com', subject: 'Hi', html: '<p>Hi</p>' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(options.headers.Authorization).toBe('Bearer test-key');
    const payload = JSON.parse(options.body);
    expect(payload.to).toEqual(['a@b.com']);
    expect(payload.subject).toBe('Hi');
    expect(payload.html).toBe('<p>Hi</p>');

    expect(result).toEqual({ sent: true, provider: 'resend', messageId: 'resend-abc123' });
  });

  // Unlike espService, a failed/erroring send never throws — the calling
  // business flow (registration, a ticket reply, a checkout) must never
  // break because Resend is down or rejected a recipient.
  it('returns sent:false (does not throw) when Resend responds with an error', async () => {
    env.RESEND_API_KEY = 'test-key';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('{"message":"bad request"}', { status: 422 })),
    );

    const result = await sendEmail({ to: 'a@b.com', subject: 'Hi', html: '<p>Hi</p>' });

    expect(result).toEqual({ sent: false, provider: 'resend' });
  });

  it('returns sent:false (does not throw) when the request itself fails', async () => {
    env.RESEND_API_KEY = 'test-key';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('network down')),
    );

    const result = await sendEmail({ to: 'a@b.com', subject: 'Hi', html: '<p>Hi</p>' });

    expect(result).toEqual({ sent: false, provider: 'resend' });
  });
});
