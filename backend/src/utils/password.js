import argon2 from 'argon2';

export async function hashPassword(plain) {
  return argon2.hash(plain, { type: argon2.argon2id });
}

export async function verifyPassword(hash, plain) {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    // Malformed hash (e.g. legacy data) — treat as a failed verification,
    // never let a hashing error read as "password correct".
    return false;
  }
}
