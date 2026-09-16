import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { buildAppTest, registerUser, login, authed, authedForm } from './helpers.js';

describe('statuses', () => {
  let app;

  beforeEach(async () => {
    app = await buildAppTest();
  });

  afterEach(async () => {
    await app.close();
  });

  it('без логина GET /statuses редиректит на /session/new', async () => {
    const res = await app.inject({ method: 'GET', url: '/statuses' });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/session/new');
  });

  it('залогиненный пользователь может создать статус', async () => {
    await registerUser(app);
    const cookie = await login(app);

    const create = await app.inject({
      method: 'POST',
      url: '/statuses',
      ...authedForm(cookie, { 'data[name]': 'New' }),
    });

    expect(create.statusCode).toBe(302);
    expect(create.headers.location).toBe('/statuses');

    const list = await app.inject({ method: 'GET', url: '/statuses', ...authed(cookie) });
    expect(list.payload).toContain('New');
  });

  it('валидация пустого имени статуса', async () => {
    await registerUser(app);
    const cookie = await login(app);

    const create = await app.inject({
      method: 'POST',
      url: '/statuses',
      ...authedForm(cookie, { 'data[name]': '' }),
    });

    expect(create.statusCode).toBe(200);
    expect(create.payload).toContain('role="alert"');

    const list = await app.inject({ method: 'GET', url: '/statuses', ...authed(cookie) });
    const statuses = await app.models.TaskStatus.query();
    expect(statuses).toHaveLength(0);
    expect(list.payload).toContain('No statuses available');
  });

  it('обновление статуса', async () => {
    await registerUser(app);
    const cookie = await login(app);

    await app.inject({
      method: 'POST',
      url: '/statuses',
      ...authedForm(cookie, { 'data[name]': 'New' }),
    });

    const status = await app.models.TaskStatus.query().findOne({ name: 'New' });

    const update = await app.inject({
      method: 'POST',
      url: `/statuses/${status.id}?_method=PATCH`,
      ...authedForm(cookie, { 'data[name]': 'In progress' }),
    });

    expect(update.statusCode).toBe(302);
    expect(update.headers.location).toBe('/statuses');

    const list = await app.inject({ method: 'GET', url: '/statuses', ...authed(cookie) });
    expect(list.payload).toContain('In progress');
    expect(list.payload).not.toContain('New');
  });

  it('удаление статуса', async () => {
    await registerUser(app);
    const cookie = await login(app);

    await app.inject({
      method: 'POST',
      url: '/statuses',
      ...authedForm(cookie, { 'data[name]': 'New' }),
    });

    const status = await app.models.TaskStatus.query().findOne({ name: 'New' });

    const del = await app.inject({
      method: 'POST',
      url: `/statuses/${status.id}?_method=DELETE`,
      ...authed(cookie),
    });

    expect(del.statusCode).toBe(302);
    expect(del.headers.location).toBe('/statuses');

    const list = await app.inject({ method: 'GET', url: '/statuses', ...authed(cookie) });
    expect(list.payload).not.toContain('New');

    const remaining = await app.models.TaskStatus.query().findById(status.id);
    expect(remaining).toBeUndefined();
  });
});