import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import crypto from 'crypto';
import { buildAppTest, registerUser, login, authed } from './helpers.js';

describe('filter tasks', () => {
  let app;

  beforeEach(async () => {
    app = await buildAppTest();
  });

  afterEach(async () => {
    await app.close();
  });

  it('фильтрация по статусу, исполнителю, метке и создателю', async () => {
    await registerUser(app, {
      firstName: 'Alfa',
      lastName: 'One',
      email: 'alfa@example.com',
      password: 'secret',
    });
    const alfa = await app.models.User.query().findOne({ email: 'alfa@example.com' });

    const digest = crypto.createHash('sha256').update('secret').digest('hex');
    const [betaId] = await app.knex('users').insert({
      first_name: 'Beta',
      last_name: 'Two',
      email: 'beta@example.com',
      password_digest: digest,
    });

    const [newStatusId] = await app.knex('task_statuses').insert({ name: 'New' });
    const [doneStatusId] = await app.knex('task_statuses').insert({ name: 'Done' });
    const [labelId] = await app.knex('labels').insert({ name: 'Urgent' });

    const [taskAlfaId] = await app.knex('tasks').insert({
      name: 'Task Alfa',
      status_id: newStatusId,
      creator_id: alfa.id,
      executor_id: betaId,
    });
    await app.knex('tasks').insert({
      name: 'Task Beta',
      status_id: doneStatusId,
      creator_id: alfa.id,
      executor_id: alfa.id,
    });
    await app.knex('tasks').insert({
      name: 'Task Gamma',
      status_id: newStatusId,
      creator_id: betaId,
      executor_id: betaId,
    });
    await app.knex('tasks_labels').insert({ task_id: taskAlfaId, label_id: labelId });

    const byStatus = await app.inject({ method: 'GET', url: `/tasks?statusId=${newStatusId}` });
    expect(byStatus.statusCode).toBe(200);
    expect(byStatus.payload).toContain('Task Alfa');
    expect(byStatus.payload).toContain('Task Gamma');
    expect(byStatus.payload).not.toContain('Task Beta');

    const byExecutor = await app.inject({ method: 'GET', url: `/tasks?executorId=${betaId}` });
    expect(byExecutor.statusCode).toBe(200);
    expect(byExecutor.payload).toContain('Task Alfa');
    expect(byExecutor.payload).toContain('Task Gamma');
    expect(byExecutor.payload).not.toContain('Task Beta');

    const byLabel = await app.inject({ method: 'GET', url: `/tasks?labelId=${labelId}` });
    expect(byLabel.statusCode).toBe(200);
    expect(byLabel.payload).toContain('Task Alfa');
    expect(byLabel.payload).not.toContain('Task Beta');
    expect(byLabel.payload).not.toContain('Task Gamma');

    const cookie = await login(app, { email: 'alfa@example.com', password: 'secret' });
    const byCreator = await app.inject({
      method: 'GET',
      url: '/tasks?isCreator=true',
      ...authed(cookie),
    });
    expect(byCreator.statusCode).toBe(200);
    expect(byCreator.payload).toContain('Task Alfa');
    expect(byCreator.payload).toContain('Task Beta');
    expect(byCreator.payload).not.toContain('Task Gamma');
  });

  it('без фильтров показывает все задачи', async () => {
    const [userId] = await app.knex('users').insert({
      first_name: 'Alfa',
      last_name: 'One',
      email: 'alfa@example.com',
      password_digest: crypto.createHash('sha256').update('secret').digest('hex'),
    });
    const [statusId] = await app.knex('task_statuses').insert({ name: 'New' });
    const [labelId] = await app.knex('labels').insert({ name: 'Urgent' });

    const [taskId] = await app.knex('tasks').insert({
      name: 'Task Alpha',
      status_id: statusId,
      creator_id: userId,
      executor_id: userId,
    });
    await app.knex('tasks').insert({
      name: 'Task Beta',
      status_id: statusId,
      creator_id: userId,
      executor_id: userId,
    });
    await app.knex('tasks_labels').insert({ task_id: taskId, label_id: labelId });

    const res = await app.inject({ method: 'GET', url: '/tasks' });
    expect(res.statusCode).toBe(200);
    expect(res.payload).toContain('Task Alpha');
    expect(res.payload).toContain('Task Beta');
  });
});