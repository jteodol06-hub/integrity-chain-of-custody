import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';

describe('ICCF Backend Foundation', () => {
  const app = createApp();

  it('GET /api/health returns operational status and system identity', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('system', 'ICCF - Integrity & Chain-of-Custody Focused');
    expect(res.body).toHaveProperty('version');
    expect(res.body).toHaveProperty('database');
  });

  it('GET /api/nonexistent returns structured 404 error without stack trace', async () => {
    const res = await request(app).get('/api/nonexistent');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
    expect(res.body.error).not.toHaveProperty('stack');
  });
});
