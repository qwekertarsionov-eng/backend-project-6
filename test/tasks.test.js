import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { buildAppTest, registerUser, login, authed, authedForm } from './helpers.js';

describe('tasks', () => {
  let app;

  beforeEach(async () => {
    app = await buildAppTest();
  });

  afterEach(async () => {
    await app.close();
  });

  it('без логина GET /tasks/new редиректит на /session/new', async () => {
    const res = await app.inject({ method: 'GET', url: '/tasks/new' });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/session/new');
  });

  it('создание задачи', async () => {
    await registerUser(app);
    const cookie = await login(app);
    const user = await app.models.User.query().findOne({ email: 'john@example.com' });
    const [statusId] = await app.knex('task_statuses').insert({ name: 'New' });

    const create = await app.inject({
      method: 'POST',
      url: '/tasks',
      ...authedForm(cookie, {
        'data[name]': 'Write report',
        'data[description]': 'Quarterly report',
        'data[statusId]': String(statusId),
        'data[executorId]': String(user.id),
      }),
    });

    expect(create.statusCode).toBe(302);
    expect(create.headers.location).toBe('/tasks');

    const list = await app.inject({ method: 'GET', url: '/tasks', ...authed(cookie) });
    expect(list.payload).toContain('Write report');
  });

  it('создание задачи подставляет creatorId текущего пользователя', async () => {
    await registerUser(app);
    const cookie = await login(app);
    const user = await app.models.User.query().findOne({ email: 'john@example.com' });
    const [statusId] = await app.knex('task_statuses').insert({ name: 'New' });

    await app.inject({
      method: 'POST',
      url: '/tasks',
      ...authedForm(cookie, { 'data[name]': 'Write report', 'data[statusId]': String(statusId) }),
    });

    const task = await app.models.Task.query().findOne({ name: 'Write report' });
    expect(task.creatorId).toBe(user.id);

    const list = await app.inject({ method: 'GET', url: '/tasks', ...authed(cookie) });
    expect(list.payload).toContain('John Doe');
  });

  it('детальный просмотр задачи', async () => {
    await registerUser(app);
    const cookie = await login(app);
    const [statusId] = await app.knex('task_statuses').insert({ name: 'New' });

    await app.inject({
      method: 'POST',
      url: '/tasks',
      ...authedForm(cookie, { 'data[name]': 'Write report', 'data[statusId]': String(statusId) }),
    });

    const task = await app.models.Task.query().findOne({ name: 'Write report' });

    const show = await app.inject({ method: 'GET', url: `/tasks/${task.id}` });
    expect(show.statusCode).toBe(200);
    expect(show.payload).toContain('Write report');
    expect(show.payload).toContain('John Doe');
  });

  it('задача с пустым именем не создаётся', async () => {
    await registerUser(app);
    const cookie = await login(app);
    const [statusId] = await app.knex('task_statuses').insert({ name: 'New' });

    const create = await app.inject({
      method: 'POST',
      url: '/tasks',
      ...authedForm(cookie, { 'data[name]': '', 'data[statusId]': String(statusId) }),
    });

    expect(create.statusCode).toBe(200);
    expect(create.payload).toContain('role="alert"');

    const task = await app.models.Task.query().findOne({ name: '' });
    expect(task).toBeUndefined();

    const all = await app.models.Task.query();
    expect(all).toHaveLength(0);
  });

  it('обновление задачи', async () => {
    await registerUser(app);
    const cookie = await login(app);
    const [statusId] = await app.knex('task_statuses').insert({ name: 'New' });

    await app.inject({
      method: 'POST',
      url: '/tasks',
      ...authedForm(cookie, { 'data[name]': 'Write report', 'data[statusId]': String(statusId) }),
    });

    const task = await app.models.Task.query().findOne({ name: 'Write report' });

    const update = await app.inject({
      method: 'POST',
      url: `/tasks/${task.id}?_method=PATCH`,
      ...authedForm(cookie, { 'data[name]': 'Write final report', 'data[statusId]': String(statusId) }),
    });

    expect(update.statusCode).toBe(302);
    expect(update.headers.location).toBe('/tasks');

    const list = await app.inject({ method: 'GET', url: '/tasks', ...authed(cookie) });
    expect(list.payload).toContain('Write final report');
    expect(list.payload).not.toContain('Write report');
  });

  it('создатель может удалить свою задачу', async () => {
    await registerUser(app);
    const cookie = await login(app);
    const [statusId] = await app.knex('task_statuses').insert({ name: 'New' });

    await app.inject({
      method: 'POST',
      url: '/tasks',
      ...authedForm(cookie, { 'data[name]': 'Write report', 'data[statusId]': String(statusId) }),
    });

    const task = await app.models.Task.query().findOne({ name: 'Write report' });

    const del = await app.inject({
      method: 'POST',
      url: `/tasks/${task.id}?_method=DELETE`,
      ...authed(cookie),
    });

    expect(del.statusCode).toBe(302);
    expect(del.headers.location).toBe('/tasks');

    const remaining = await app.models.Task.query().findById(task.id);
    expect(remaining).toBeUndefined();
  });

  it('чужую задачу удалить нельзя', async () => {
    await registerUser(app);
    const cookieA = await login(app);
    const [statusId] = await app.knex('task_statuses').insert({ name: 'New' });

    await app.inject({
      method: 'POST',
      url: '/tasks',
      ...authedForm(cookieA, { 'data[name]': 'Write report', 'data[statusId]': String(statusId) }),
    });

    const task = await app.models.Task.query().findOne({ name: 'Write report' });

    await registerUser(app, { email: 'bobby@example.com', password: 'secret' });
    const cookieB = await login(app, { email: 'bobby@example.com', password: 'secret' });

    const del = await app.inject({
      method: 'POST',
      url: `/tasks/${task.id}?_method=DELETE`,
      ...authed(cookieB),
    });

    expect(del.statusCode).toBe(302);
    expect(del.headers.location).toBe('/tasks');

    const remaining = await app.models.Task.query().findById(task.id);
    expect(remaining).toBeDefined();
  });
});