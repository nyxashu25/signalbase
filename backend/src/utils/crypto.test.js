import { describe, it, expect } from 'vitest';
import { encryptSecret, decryptSecret } from './crypto.js';

describe('encryptSecret/decryptSecret', () => {
  it('round-trips a plaintext secret', () => {
    const encrypted = encryptSecret('rzp_live_super_secret_key');
    expect(encrypted).not.toContain('rzp_live_super_secret_key');
    expect(decryptSecret(encrypted)).toBe('rzp_live_super_secret_key');
  });

  it('produces a different ciphertext each time (random IV) for the same plaintext', () => {
    const a = encryptSecret('same-value');
    const b = encryptSecret('same-value');
    expect(a).not.toBe(b);
    expect(decryptSecret(a)).toBe('same-value');
    expect(decryptSecret(b)).toBe('same-value');
  });

  it('throws on tampered ciphertext instead of silently returning garbage', () => {
    const encrypted = encryptSecret('rzp_live_super_secret_key');
    const [iv, authTag, ciphertext] = encrypted.split('.');
    const tampered = [iv, authTag, ciphertext.slice(0, -4) + 'AAAA'].join('.');

    expect(() => decryptSecret(tampered)).toThrow();
  });
});
