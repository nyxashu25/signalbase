import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { env } from '../config/env.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH_BYTES = 12; // 96-bit nonce — the standard/recommended size for GCM

function key() {
  return Buffer.from(env.SETTINGS_ENCRYPTION_KEY, 'hex');
}

/** Encrypts a secret for storage. Format: base64(iv).base64(authTag).base64(ciphertext). */
export function encryptSecret(plaintext) {
  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv(ALGORITHM, key(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, ciphertext].map((b) => b.toString('base64')).join('.');
}

/** Reverses encryptSecret. Throws if the ciphertext was tampered with or the key is wrong. */
export function decryptSecret(encoded) {
  const [ivB64, authTagB64, ciphertextB64] = encoded.split('.');
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');
  const ciphertext = Buffer.from(ciphertextB64, 'base64');

  const decipher = createDecipheriv(ALGORITHM, key(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}
