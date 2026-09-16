import path from 'path';
import { fileURLToPath } from 'url';
import Knex from 'knex';
import { Model } from 'objection';
import fastifyView from '@fastify/view';
import fastifyI18n from 'fastify-i18n';
import fastifyFormbody from '@fastify/formbody';
import fastifySecureSession from '@fastify/secure-session';
import fastifyStatic from '@fastify/static';
import fastifyCookie from '@fastify/cookie';
import { Authenticator } from '@fastify/passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Eta } from 'eta';
import crypto from 'crypto';
import qs from 'qs';

import knexConfig from '../knexfile.js';
import User from './models/User.js';
import TaskStatus from './models/TaskStatus.js';
import Task from './models/Task.js';
import Label from './models/Label.js';
import en from './locales/en.js';
import ru from './locales/ru.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fastifyPassport = new Authenticator();

const flashView = (reply, template, data) => {
  reply.locals = { ...(reply.locals || {}), flash: reply.flash() };
  return reply.view(template, data);
};

export default async (app, options = {}) => {
  const mode = process.env.NODE_ENV || 'development';
  const knex = Knex(knexConfig[mode]);
  Model.knex(knex);

  app.decorate('models', { User, TaskStatus, Task, Label });
  app.decorate('knex', knex);

  app.addHook('onClose', async () => {
    await knex.destroy();
  });

  await app.register(fastifyFormbody, { parser: (str) => qs.parse(str) });

  await app.register(fastifyStatic, {
    root: path.join(__dirname, '..', 'dist'),
    prefix: '/assets/',
  });

  await app.register(fastifyView, {
    engine: { eta: new Eta() },
    templates: path.join(__dirname, 'views'),
    defaultContext: {
      assetPath: (filename) => `/assets/${filename}`,
    },
  });

  await app.register(fastifyCookie);

  await app.register(fastifySecureSession, {
    secret: process.env.SESSION_SECRET || 'a_very_long_secret_string_with_32_characters_minimum',
    cookie: { path: '/' },
  });

  await app.register(fastifyPassport.initialize());
  await app.register(fastifyPassport.secureSession());

  fastifyPassport.use('local', new LocalStrategy(
    { usernameField: 'data[email]', passwordField: 'data[password]' },
    async (email, password, done) => {
      try {
        const user = await User.query().findOne({ email });

        if (!user) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        const passwordDigest = crypto
          .createHash('sha256')
          .update(password)
          .digest('hex');

        const userHash = user.passwordDigest || user.password_digest;

        if (userHash !== passwordDigest) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  ));

  fastifyPassport.registerUserSerializer(async (user) => user.id);
  fastifyPassport.registerUserDeserializer(async (id) => {
    return User.query().findById(id);
  });

  app.decorate('passport', fastifyPassport);

  await app.register(fastifyI18n, {
    fallbackLocale: process.env.NODE_ENV === 'test' ? 'en' : 'ru',
    messages: { en: en.en, ru: ru.ru },
  });

  app.addHook('preHandler', async (request, reply) => {
    reply.locals = {
      t: (key, bindings) => request.i18n.t(key, bindings),
      isAuthenticated: request.isAuthenticated(),
      currentUser: request.user,
      flash: reply.flash(),
    };
  });

  // === Routes ===

  // Home
  app.get('/', async (request, reply) => reply.view('index', {}));

  // Users
  app.get('/users', async (request, reply) => {
    const users = await User.query();
    return reply.view('users/index', { users });
  });

  app.get('/users/new', async (request, reply) => reply.view('users/new', { user: {} }));

  app.post('/users', async (request, reply) => {
    const userData = request.body.data || request.body;
    try {
      await User.query().insert(userData);
      request.flash('success', app.i18n.t('flash.users.create.success'));
      return reply.redirect('/');
    } catch (err) {
      request.flash('warning', app.i18n.t('flash.users.create.error'));
      const errors = err.data || {};
      return flashView(reply, 'users/new', { user: userData, errors });
    }
  });

  app.get('/users/:id/edit', async (request, reply) => {
    if (!request.isAuthenticated()) {
      request.flash('warning', app.i18n.t('flash.authError'));
      return reply.redirect('/session/new');
    }
    if (request.user.id !== Number(request.params.id)) {
      request.flash('warning', app.i18n.t('flash.userAccessError'));
      return reply.redirect('/users');
    }
    const user = await User.query().findById(request.params.id);
    if (!user) {
      return reply.redirect('/users');
    }
    return reply.view('users/edit', { user, errors: {} });
  });

  app.patch('/users/:id', async (request, reply) => {
    if (!request.isAuthenticated()) {
      request.flash('warning', app.i18n.t('flash.authError'));
      return reply.redirect('/session/new');
    }
    if (request.user.id !== Number(request.params.id)) {
      request.flash('warning', app.i18n.t('flash.userAccessError'));
      return reply.redirect('/users');
    }
    const userData = request.body.data || request.body;
    const { password, ...rest } = userData;
    const patchData = { ...rest };
    if (password) {
      patchData.passwordDigest = crypto
        .createHash('sha256')
        .update(password)
        .digest('hex');
    }
    try {
      const user = await User.query().findById(Number(request.params.id));
      await user.$query().patch(patchData);
      request.flash('success', app.i18n.t('flash.users.update.success'));
      return reply.redirect('/users');
    } catch (err) {
      request.flash('warning', app.i18n.t('flash.users.update.error'));
      return flashView(reply, 'users/edit', {
        user: { id: Number(request.params.id), ...userData },
        errors: err.data || {},
      });
    }
  });

  app.delete('/users/:id', async (request, reply) => {
    if (!request.isAuthenticated()) {
      request.flash('warning', app.i18n.t('flash.authError'));
      return reply.redirect('/session/new');
    }
    if (request.user.id !== Number(request.params.id)) {
      request.flash('warning', app.i18n.t('flash.userAccessError'));
      return reply.redirect('/users');
    }
    try {
      await User.query().deleteById(Number(request.params.id));
      await request.logOut();
      request.flash('success', app.i18n.t('flash.users.delete.success'));
    } catch {
      request.flash('error', app.i18n.t('flash.users.delete.error'));
    }
    return reply.redirect('/users');
  });

  // Session
  app.get('/session/new', async (request, reply) => reply.view('session/new', {}));

  app.post('/session', async (request, reply) => {
    return app.passport.authenticate('local', async (req, res, err, user) => {
      if (err || !user) {
        req.flash('error', app.i18n.t('flash.session.signInError'));
        return res.redirect('/session/new');
      }
      await req.logIn(user);
      req.flash('success', app.i18n.t('flash.session.signedIn'));
      return res.redirect('/');
    })(request, reply);
  });

  app.delete('/session', async (request, reply) => {
    await request.logOut();
    request.flash('success', app.i18n.t('flash.session.signedOut'));
    return reply.redirect('/');
  });

  // Statuses
  app.get('/statuses', async (request, reply) => {
    if (!request.isAuthenticated()) {
      request.flash('warning', app.i18n.t('flash.authError'));
      return reply.redirect('/session/new');
    }
    const statuses = await TaskStatus.query();
    return reply.view('statuses/index', { statuses });
  });

  app.get('/statuses/new', async (request, reply) => {
    if (!request.isAuthenticated()) {
      request.flash('warning', app.i18n.t('flash.authError'));
      return reply.redirect('/session/new');
    }
    return reply.view('statuses/new', { status: {} });
  });

  app.post('/statuses', async (request, reply) => {
    if (!request.isAuthenticated()) {
      request.flash('warning', app.i18n.t('flash.authError'));
      return reply.redirect('/session/new');
    }
    const statusData = request.body.data;
    try {
      await TaskStatus.query().insert(statusData);
      request.flash('success', app.i18n.t('flash.statuses.create.success'));
      return reply.redirect('/statuses');
    } catch (err) {
      request.flash('error', app.i18n.t('flash.statuses.create.error'));
      return flashView(reply, 'statuses/new', { status: statusData, errors: err.data });
    }
  });

  app.get('/statuses/:id/edit', async (request, reply) => {
    if (!request.isAuthenticated()) {
      request.flash('warning', app.i18n.t('flash.authError'));
      return reply.redirect('/session/new');
    }
    const { id } = request.params;
    const status = await TaskStatus.query().findById(id);
    return reply.view('statuses/edit', { status });
  });

  app.patch('/statuses/:id', async (request, reply) => {
    if (!request.isAuthenticated()) {
      request.flash('warning', app.i18n.t('flash.authError'));
      return reply.redirect('/session/new');
    }
    const { id } = request.params;
    const statusData = request.body.data;
    try {
      const status = await TaskStatus.query().findById(id);
      await status.$query().patch(statusData);
      request.flash('success', app.i18n.t('flash.statuses.update.success'));
      return reply.redirect('/statuses');
    } catch (err) {
      request.flash('error', app.i18n.t('flash.statuses.update.error'));
      return flashView(reply, 'statuses/edit', { status: { id, ...statusData }, errors: err.data });
    }
  });

  app.delete('/statuses/:id', async (request, reply) => {
    if (!request.isAuthenticated()) {
      request.flash('warning', app.i18n.t('flash.authError'));
      return reply.redirect('/session/new');
    }
    const { id } = request.params;
    try {
      await TaskStatus.query().deleteById(id);
      request.flash('success', app.i18n.t('flash.statuses.delete.success'));
    } catch {
      request.flash('error', app.i18n.t('flash.statuses.delete.error'));
    }
    return reply.redirect('/statuses');
  });

  // Tasks
  app.get('/tasks', async (request, reply) => {
    if (!request.isAuthenticated()) {
      request.flash('warning', app.i18n.t('flash.authError'));
      return reply.redirect('/');
    }

    const filter = request.query || {};

    const query = app.models.Task.query().withGraphFetched('[status, creator, executor, labels]');

    if (filter.statusId) {
      query.where('status_id', Number(filter.statusId));
    }

    if (filter.executorId) {
      query.where('executor_id', Number(filter.executorId));
    }

    if (filter.labelId) {
      query.whereExists(
        app.models.Task.relatedQuery('labels').where('labels.id', Number(filter.labelId))
      );
    }

    if (filter.isCreator === 'true' && request.isAuthenticated()) {
      query.where('creator_id', request.user.id);
    }

    const tasks = await query;
    const statuses = await app.models.TaskStatus.query();
    const users = await app.models.User.query();
    const labels = await app.models.Label.query();

    return reply.view('tasks/index', { tasks, statuses, users, labels, filter });
  });

  app.get('/tasks/new', async (request, reply) => {
    if (!request.isAuthenticated()) {
      request.flash('warning', app.i18n.t('flash.authError'));
      return reply.redirect('/session/new');
    }
    const statuses = await app.models.TaskStatus.query();
    const users = await app.models.User.query();
    const labels = await app.models.Label.query();
    return reply.view('tasks/new', { task: {}, statuses, users, labels });
  });

  app.post('/tasks', async (request, reply) => {
    if (!request.isAuthenticated()) {
      request.flash('warning', app.i18n.t('flash.authError'));
      return reply.redirect('/session/new');
    }

    const { labels, ...rawTaskData } = request.body.data;

    const labelsData = labels
      ? (Array.isArray(labels) ? labels : [labels]).map((id) => ({ id: Number(id) }))
      : [];

    const taskData = {
      ...rawTaskData,
      creatorId: request.user.id,
      statusId: Number(rawTaskData.statusId),
      executorId: rawTaskData.executorId ? Number(rawTaskData.executorId) : null,
      labels: labelsData,
    };

    try {
      await app.models.Task.query().insertGraph(taskData, { relate: true });
      request.flash('success', app.i18n.t('flash.tasks.create.success'));
      return reply.redirect('/tasks');
    } catch (err) {
      const statuses = await app.models.TaskStatus.query();
      const users = await app.models.User.query();
      const allLabels = await app.models.Label.query();
      request.flash('error', app.i18n.t('flash.tasks.create.error'));
      return flashView(reply, 'tasks/new', { task: taskData, statuses, users, labels: allLabels, errors: err.data });
    }
  });

  app.get('/tasks/:id', async (request, reply) => {
    const { id } = request.params;
    const task = await Task.query().findById(id).withGraphFetched('[status, creator, executor, labels]');
    return reply.view('tasks/show', { task });
  });

  app.get('/tasks/:id/edit', async (request, reply) => {
    if (!request.isAuthenticated()) {
      request.flash('warning', app.i18n.t('flash.authError'));
      return reply.redirect('/session/new');
    }
    const task = await app.models.Task.query().findById(request.params.id).withGraphFetched('labels');
    const statuses = await app.models.TaskStatus.query();
    const users = await app.models.User.query();
    const labels = await app.models.Label.query();
    return reply.view('tasks/edit', { task, statuses, users, labels });
  });

  app.patch('/tasks/:id', async (request, reply) => {
    if (!request.isAuthenticated()) {
      request.flash('warning', app.i18n.t('flash.authError'));
      return reply.redirect('/session/new');
    }

    const { labels, ...rawTaskData } = request.body.data;

    const labelsData = labels
      ? (Array.isArray(labels) ? labels : [labels]).map((id) => ({ id: Number(id) }))
      : [];

    const updateData = {
      id: Number(request.params.id),
      ...rawTaskData,
      statusId: Number(rawTaskData.statusId),
      executorId: rawTaskData.executorId ? Number(rawTaskData.executorId) : null,
      labels: labelsData,
    };

    try {
      await app.models.Task.query().upsertGraph(updateData, { relate: true, unrelate: true });
      request.flash('success', app.i18n.t('flash.tasks.update.success'));
      return reply.redirect('/tasks');
    } catch (err) {
      const statuses = await app.models.TaskStatus.query();
      const users = await app.models.User.query();
      const allLabels = await app.models.Label.query();
      request.flash('error', app.i18n.t('flash.tasks.update.error'));
      return flashView(reply, 'tasks/edit', { task: updateData, statuses, users, labels: allLabels, errors: err.data });
    }
  });

  app.delete('/tasks/:id', async (request, reply) => {
    if (!request.isAuthenticated()) {
      request.flash('warning', app.i18n.t('flash.authError'));
      return reply.redirect('/session/new');
    }
    const { id } = request.params;
    const task = await Task.query().findById(id);

    if (task.creatorId !== request.user.id) {
      request.flash('error', app.i18n.t('flash.tasks.delete.error'));
      return reply.redirect('/tasks');
    }

    await Task.query().deleteById(id);
    request.flash('success', app.i18n.t('flash.tasks.delete.success'));
    return reply.redirect('/tasks');
  });

  // Labels
  app.get('/labels', async (request, reply) => {
    if (!request.isAuthenticated()) {
      request.flash('warning', app.i18n.t('flash.authError'));
      return reply.redirect('/session/new');
    }
    const labels = await app.models.Label.query();
    return reply.view('labels/index', { labels });
  });

  app.get('/labels/new', async (request, reply) => {
    if (!request.isAuthenticated()) {
      request.flash('warning', app.i18n.t('flash.authError'));
      return reply.redirect('/session/new');
    }
    return reply.view('labels/new', { label: {} });
  });

  app.post('/labels', async (request, reply) => {
    if (!request.isAuthenticated()) {
      request.flash('warning', app.i18n.t('flash.authError'));
      return reply.redirect('/session/new');
    }
    const labelData = request.body.data;
    try {
      await app.models.Label.query().insert(labelData);
      request.flash('success', app.i18n.t('flash.labels.create.success'));
      return reply.redirect('/labels');
    } catch (err) {
      request.flash('error', app.i18n.t('flash.labels.create.error'));
      return flashView(reply, 'labels/new', { label: labelData, errors: err.data });
    }
  });

  app.get('/labels/:id/edit', async (request, reply) => {
    if (!request.isAuthenticated()) {
      request.flash('warning', app.i18n.t('flash.authError'));
      return reply.redirect('/session/new');
    }
    const label = await app.models.Label.query().findById(request.params.id);
    return reply.view('labels/edit', { label });
  });

  app.patch('/labels/:id', async (request, reply) => {
    if (!request.isAuthenticated()) {
      request.flash('warning', app.i18n.t('flash.authError'));
      return reply.redirect('/session/new');
    }
    try {
      const label = await app.models.Label.query().findById(request.params.id);
      await label.$query().patch(request.body.data);
      request.flash('success', app.i18n.t('flash.labels.update.success'));
      return reply.redirect('/labels');
    } catch (err) {
      request.flash('error', app.i18n.t('flash.labels.update.error'));
      return flashView(reply, 'labels/edit', { label: { id: request.params.id, ...request.body.data }, errors: err.data });
    }
  });

  app.delete('/labels/:id', async (request, reply) => {
    if (!request.isAuthenticated()) {
      request.flash('warning', app.i18n.t('flash.authError'));
      return reply.redirect('/session/new');
    }
    try {
      await app.models.Label.query().deleteById(request.params.id);
      request.flash('success', app.i18n.t('flash.labels.delete.success'));
    } catch {
      request.flash('error', app.i18n.t('flash.labels.delete.error'));
    }
    return reply.redirect('/labels');
  });
};
