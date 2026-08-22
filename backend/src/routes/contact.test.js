import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { resetDb, resetRedis } from '../test/dbHelpers.js';
import { registerAndVerify } from '../test/authHelpers.js';
import { prisma } from '../config/db.js';
import * as notificationService from '../services/notificationService.js';

const app = createApp();

async function registerOrg(orgName, email) {
  return registerAndVerify(app, { email, password: 'correct-horse-battery', name: 'Owner', orgName });
}

describe('POST /contact', () => {
  beforeEach(async () => {
    await resetDb();
    await resetRedis();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('accepts a general inquiry from an email with no account', async () => {
    const res = await request(app).post('/api/v1/contact').send({
      name: 'Prospect',
      email: 'prospect@example.com',
      message: 'Tell me about pricing.',
    });

    expect(res.status).toBe(204);
  });

  it('defaults an omitted category to general', async () => {
    const res = await request(app)
      .post('/api/v1/contact')
      .send({ name: 'Prospect', email: 'prospect@example.com', message: 'Hi' });

    expect(res.status).toBe(204);
  });

  it('rejects a support ticket from an email with no DataPit account', async () => {
    const res = await request(app).post('/api/v1/contact').send({
      name: 'Nobody',
      email: 'nobody@example.com',
      message: 'I need help.',
      category: 'support',
    });

    expect(res.status).toBe(422);
    expect(res.body.error.message).toMatch(/isn.t associated with a DataPit account/);
  });

  it('rejects an enterprise ticket from an email with no DataPit account', async () => {
    const res = await request(app).post('/api/v1/contact').send({
      name: 'Nobody',
      email: 'nobody@example.com',
      message: 'Tell me about Enterprise.',
      category: 'enterprise',
    });

    expect(res.status).toBe(422);
  });

  it('accepts a support ticket when the email belongs to a registered user', async () => {
    await registerOrg('Acme', 'owner@acme.test');

    const res = await request(app).post('/api/v1/contact').send({
      name: 'Owner',
      email: 'owner@acme.test',
      message: 'Reveal is not working for me.',
      category: 'support',
    });

    expect(res.status).toBe(204);
  });

  it('forwards the lead to notificationService (the sales-inbox stand-in)', async () => {
    const spy = vi.spyOn(notificationService, 'sendContactFormLead').mockResolvedValue();

    const res = await request(app).post('/api/v1/contact').send({
      name: 'Prospect',
      email: 'prospect@example.com',
      company: 'Acme Co',
      message: 'Tell me about pricing.',
      category: 'general',
    });

    expect(res.status).toBe(204);
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Prospect', email: 'prospect@example.com', company: 'Acme Co' }),
    );

    spy.mockRestore();
  });
});
