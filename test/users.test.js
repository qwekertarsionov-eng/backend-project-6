import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { buildAppTest, registerUser, login, authed, authedForm } from './helpers.js';

describe('users', () => {
  let app;

  beforeEach(async () => {
    app = await buildAppTest();
  });

  afterEach(async () => {
    await app.close();
  });

  it('страница /users публична', async () => {
    await registerUser(app);

    const res = await app.inject({ method: 'GET', url: '/users' });

    expect(res.statusCode).toBe(200);
    expect(res.payload).toContain('john@example.com');
  });

  it('регистрация создаёт пользователя', async () => {
    const res = await registerUser(app);

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/users');

    const list = await app.inject({ method: 'GET', url: '/users' });
    expect(list.statusCode).toBe(200);
    expect(list.payload).toContain('john@example.com');
  });

  it('редактировать профиль может только сам', async () => {
    await registerUser(app);
    const userA = await app.models.User.query().findOne({ email: 'john@example.com' });

    await registerUser(app, { firstName: 'Bob', email: 'bob@example.com' });
    const userB = await app.models.User.query().findOne({ email: 'bob@example.com' });

    const anonymous = await app.inject({ method: 'GET', url: `/users/${userA.id}/edit` });
    expect(anonymous.statusCode).toBe(302);
    expect(anonymous.headers.location).toBe('/session/new');

    const cookie = await login(app);
    const foreign = await app.inject({
      method: 'GET',
      url: `/users/${userB.id}/edit`,
      ...authed(cookie),
    });
    expect(foreign.statusCode).toBe(302);
    expect(foreign.headers.location).toBe('/users');
  });

  it('обновление профиля', async () => {
    await registerUser(app);
    const user = await app.models.User.query().findOne({ email: 'john@example.com' });
    const cookie = await login(app);

    const res = await app.inject({
      method: 'POST',
      url: `/users/${user.id}?_method=PATCH`,
      ...authedForm(cookie, { 'data[firstName]': 'Updated' }),
    });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/users');

    const list = await app.inject({ method: 'GET', url: '/users', ...authed(cookie) });
    expect(list.payload).toContain('Updated');
  });

  it('удаление профиля', async () => {
    await registerUser(app);
    const user = await app.models.User.query().findOne({ email: 'john@example.com' });
    const cookie = await login(app);

    const res = await app.inject({
      method: 'POST',
      url: `/users/${user.id}?_method=DELETE`,
      ...authed(cookie),
    });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/users');

    const list = await app.inject({ method: 'GET', url: '/users' });
    expect(list.payload).not.toContain('john@example.com');

    const gone = await app.models.User.query().findById(user.id);
    expect(gone).toBeUndefined();
  });

  it('нельзя удалить пользователя с задачами', async () => {
    await registerUser(app);
    const user = await app.models.User.query().findOne({ email: 'john@example.com' });

    const [statusId] = await app.knex('task_statuses').insert({ name: 'New' });
    await app.knex('tasks').insert({
      name: 'Task with user',
      status_id: statusId,
      creator_id: user.id,
    });

    const cookie = await login(app);
    const res = await app.inject({
      method: 'POST',
      url: `/users/${user.id}?_method=DELETE`,
      ...authed(cookie),
    });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/users');

    const stillThere = await app.models.User.query().findById(user.id);
    expect(stillThere).toBeDefined();

    const list = await app.inject({ method: 'GET', url: '/users' });
    expect(list.payload).toContain('john@example.com');
  });
});