import request from 'supertest';
import { prisma } from '../config/db.js';
import { signEmailVerificationToken } from '../services/tokenService.js';

/**
 * Registration no longer logs anyone in directly (see authService.register)
 * — it emails a confirm link, and POST /auth/verify-email is what actually
 * issues the session. Tests can't read a real inbox, so this mirrors the
 * real two-step flow: register over HTTP, mint the same token the emailed
 * link would carry, then hit verify-email over HTTP too. Returns the
 * verify-email response, which has the session shape register() used to
 * return directly before email verification existed.
 *
 * If registration itself fails (e.g. a duplicate-email 409 a test is
 * deliberately triggering), that response is returned as-is so callers can
 * assert on it.
 */
export async function registerAndVerify(app, body) {
  const register = await request(app).post('/api/v1/auth/register').send(body);
  if (register.status !== 202) return register;

  const user = await prisma.user.findUnique({ where: { email: body.email } });
  const token = signEmailVerificationToken(user.id);
  return request(app).post('/api/v1/auth/verify-email').send({ token });
}
