import { describe, it, expect, afterEach, vi } from 'vitest';
import { env } from '../config/env.js';
import { verifyEmail } from './emailVerifierService.js';

describe('emailVerifierService.verifyEmail', () => {
  afterEach(() => {
    env.EMAIL_VERIFIER_API_KEY = undefined;
    vi.unstubAllGlobals();
  });

  it('returns unchecked when no provider key is configured', async () => {
    const result = await verifyEmail('a@b.com');

    expect(result).toEqual({ verified: false, checked: false, reason: 'no_provider_configured' });
  });

  it('calls Hunter.io and maps a deliverable result to verified: true', async () => {
    env.EMAIL_VERIFIER_API_KEY = 'test-key';
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { status: 'valid', result: 'deliverable' } }), {
        status: 200,
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await verifyEmail('a@b.com');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl] = fetchMock.mock.calls[0];
    expect(calledUrl.toString()).toContain('email=a%40b.com');
    expect(calledUrl.toString()).toContain('api_key=test-key');

    expect(result).toEqual({ verified: true, checked: true, reason: 'valid' });
  });

  it('maps an undeliverable result to verified: false, checked: true', async () => {
    env.EMAIL_VERIFIER_API_KEY = 'test-key';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: { status: 'invalid', result: 'undeliverable' } }), {
          status: 200,
        }),
      ),
    );

    const result = await verifyEmail('a@b.com');

    expect(result).toEqual({ verified: false, checked: true, reason: 'invalid' });
  });

  it('throws when Hunter.io returns an error status', async () => {
    env.EMAIL_VERIFIER_API_KEY = 'test-key';
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ errors: [{ details: 'invalid api key' }] }), { status: 401 }),
        ),
    );

    await expect(verifyEmail('a@b.com')).rejects.toThrow(/401/);
  });
});
