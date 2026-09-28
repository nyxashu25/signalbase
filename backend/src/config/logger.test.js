import { describe, it, expect } from 'vitest';
import pino from 'pino';
import { REDACTED_PATHS } from './logger.js';

describe('logger redaction', () => {
  it('never writes bearer tokens, cookies or API keys', () => {
    const lines = [];
    const log = pino(
      { redact: { paths: REDACTED_PATHS, censor: '[redacted]' } },
      { write: (line) => lines.push(line) },
    );
    log.info({
      req: {
        headers: {
          authorization: 'Bearer secret-token',
          cookie: 'refresh=secret-cookie',
          'x-api-key': 'dp_secret',
          'user-agent': 'test',
        },
      },
      res: { headers: { 'set-cookie': 'refresh=secret-cookie' } },
    });
    const out = lines.join('');
    expect(out).not.toMatch(/secret/);
    expect(out).toContain('"user-agent":"test"');
    expect(out).toContain('[redacted]');
  });
});
