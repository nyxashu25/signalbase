import { describe, it, expect, afterEach, vi } from 'vitest';
import { env } from '../config/env.js';
import { sendEmail } from './espService.js';

describe('espService.sendEmail', () => {
  afterEach(() => {
    env.ESP_API_KEY = undefined;
    env.ESP_FROM_EMAIL = undefined;
    vi.unstubAllGlobals();
  });

  it('simulates a send when ESP_API_KEY is not configured', async () => {
    const result = await sendEmail({ to: 'a@b.com', subject: 'Hi', body: 'Body' });

    expect(result.sent).toBe(true);
    expect(result.provider).toBe('simulated');
    expect(result.messageId).toMatch(/^simulated-/);
  });

  it('calls the SendGrid API when ESP_API_KEY is configured, and returns the real message id', async () => {
    env.ESP_API_KEY = 'test-key';
    env.ESP_FROM_EMAIL = 'sender@example.com';
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 202, headers: { 'X-Message-Id': 'sg-abc123' } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await sendEmail({ to: 'a@b.com', subject: 'Hi', body: 'Body' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.sendgrid.com/v3/mail/send');
    expect(options.headers.Authorization).toBe('Bearer test-key');
    const payload = JSON.parse(options.body);
    expect(payload.personalizations[0].to[0].email).toBe('a@b.com');
    expect(payload.from.email).toBe('sender@example.com');
    expect(payload.subject).toBe('Hi');

    expect(result).toEqual({ sent: true, provider: 'sendgrid', messageId: 'sg-abc123' });
  });

  it('throws when ESP_API_KEY is set but ESP_FROM_EMAIL is not', async () => {
    env.ESP_API_KEY = 'test-key';

    await expect(sendEmail({ to: 'a@b.com', subject: 'Hi', body: 'Body' })).rejects.toThrow(
      /ESP_FROM_EMAIL/,
    );
  });

  it('throws with the response status and body when SendGrid returns an error', async () => {
    env.ESP_API_KEY = 'test-key';
    env.ESP_FROM_EMAIL = 'sender@example.com';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('{"errors":[{"message":"bad request"}]}', { status: 400 }),
      ),
    );

    await expect(sendEmail({ to: 'a@b.com', subject: 'Hi', body: 'Body' })).rejects.toThrow(/400/);
  });
});
