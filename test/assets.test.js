import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { buildAppTest } from './helpers.js';

describe('assets', () => {
  let app;

  beforeEach(async () => {
    app = await buildAppTest();
  });

  afterEach(async () => {
    await app.close();
  });

  it('отдаёт собранный css', async () => {
    const res = await app.inject({ method: 'GET', url: '/assets/main.css' });

    expect(res.statusCode).toBe(200);
    expect(res.payload).toContain('.rounded');
  });
});