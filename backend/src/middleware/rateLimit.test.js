import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { resetDb, resetRedis } from '../test/dbHelpers.js';
import { prisma } from '../config/db.js';
import { redis } from '../config/redis.js';

const app = createApp();

describe('rate limiting', () => {
  beforeEach(async () => {
    await resetDb();
    await resetRedis();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    redis.disconnect();
  });

  it('blocks the 11th login attempt within a minute (limit is 10) and resets after the window', async () => {
    const body = { email: 'nobody@nowhere.test', password: 'wrong' };

    for (let i = 0; i < 10; i++) {
      const res = await request(app).post('/api/v1/auth/login').send(body);
      expect(res.status).toBe(401); // rejected for bad creds, not rate-limited yet
    }

    const eleventh = await request(app).post('/api/v1/auth/login').send(body);
    expect(eleventh.status).toBe(429);
    expect(eleventh.headers['retry-after']).toBeDefined();

    // Simulate the window elapsing rather than waiting 60 real seconds.
    await resetRedis();

    const afterReset = await request(app).post('/api/v1/auth/login').send(body);
    expect(afterReset.status).toBe(401);
  });

  it('rate-limits register per IP independently of login', async () => {
    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: `user${i}@rl-test.test`,
          password: 'correct-horse-battery',
          name: 'U',
          orgName: 'Org',
        });
      expect(res.status).toBe(201);
    }

    const sixth = await request(app).post('/api/v1/auth/register').send({
      email: 'user6@rl-test.test',
      password: 'correct-horse-battery',
      name: 'U',
      orgName: 'Org',
    });
    expect(sixth.status).toBe(429);
  });
});
