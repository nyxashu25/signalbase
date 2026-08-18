import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { prisma } from '../config/db.js';

const app = createApp();

describe('GET /metrics', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('exposes Prometheus-formatted metrics without auth', async () => {
    const res = await request(app).get('/metrics');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/plain/);
    expect(res.text).toContain('process_cpu_seconds_total');
    expect(res.text).toContain('http_request_duration_seconds');
  });

  it('labels requests by route template, not raw URL', async () => {
    await request(app).get('/health');

    const res = await request(app).get('/metrics');
    expect(res.text).toContain('route="/health"');
  });
});
