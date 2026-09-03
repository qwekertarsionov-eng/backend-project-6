import path from 'path';
import { fileURLToPath } from 'url';
import Knex from 'knex';
import { Model } from 'objection';
import fastifyView from '@fastify/view';
import fastifyI18n from 'fastify-i18n';
import fastifyFormbody from '@fastify/formbody';
import fastifySecureSession from '@fastify/secure-session';
import { Authenticator } from '@fastify/passport';
import { Strategy as LocalStrategy } from 'passport-local';
import pug from 'pug';
import crypto from 'crypto';


import knexConfig from '../knexfile.js';
import User from './models/User.js';
import en from './locales/en.js';
import qs from 'qs';
import TaskStatus from './models/TaskStatus.js';
import Task from './models/Task.js';
import Label from './models/Label.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Создаем инстанс аутентификатора Passport
const fastifyPassport = new Authenticator();

export default async (app) => {
  // 1. Настройка базы данных и ORM
  const mode = process.env.NODE_ENV || 'development';
  const knex = Knex(knexConfig[mode]);
  Model.knex(knex);

 app.decorate('models', { User, TaskStatus, Task, Label });

  app.addHook('onClose', async () => {
    await knex.destroy();
  });

  // 2. Регистрация парсера форм
// Настраиваем парсер форм так, чтобы он понимал структуры вида data[firstName]
  await app.register(fastifyFormbody, {
  parser: (str) => qs.parse(str),
  });


  // 3. Настройка защищенных сессий (куки)
  // По ТЗ Хекслета секретный ключ передается через переменные окружения (.env)
  await app.register(fastifySecureSession, {
    secret: process.env.SESSION_SECRET || 'a_very_long_secret_string_with_32_characters_minimum',
    cookie: {
      path: '/',
    },
  });

  // 4. Инициализация Passport
  await app.register(fastifyPassport.initialize());
  await app.register(fastifyPassport.secureSession());

  // Настройка локальной стратегии аутентификации (email + password)
  // Настройка локальной стратегии аутентификации (email + password)
  fastifyPassport.use('local', new LocalStrategy(
    { usernameField: 'data[email]', passwordField: 'data[password]' },
    async (email, password, done) => {
      try {
        const user = await User.query().findOne({ email });
        
        if (!user) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        // Хешируем пароль из формы прямо здесь для сравнения
        const passwordDigest = crypto
          .createHash('sha256')
          .update(password)
          .digest('hex');

        // Сравниваем с сохраненным в БД passwordDigest (или password_digest)
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



  // Сериализация и десериализация пользователя для сессий
  fastifyPassport.registerUserSerializer(async (user) => user.id);
  fastifyPassport.registerUserDeserializer(async (id) => {
    return User.query().findById(id);
  });

  // Делаем passport доступным в приложении
  app.decorate('passport', fastifyPassport);

  // 5. Регистрация плагина локализации i18n
  await app.register(fastifyI18n, {
    fallbackLocale: 'en',
    messages: en,
  });

  // 6. Регистрация шаблонизатора Pug
  await app.register(fastifyView, {
    engine: { pug },
    includeViewExtension: true,
    root: path.join(__dirname, 'views'),
  });

  // Хук для проброса хелперов и состояния авторизации в шаблоны
  app.addHook('preHandler', async (request, reply) => {
    reply.locals = {
      t: (key, bindings) => request.i18n.t(key, bindings),
      isAuthenticated: request.isAuthenticated(),
      currentUser: request.user,
    };
  });

  // 7. Роуты приложения

  // Главная страница
  app.get('/', async (request, reply) => reply.view('index', {}));

  // Список всех пользователей
  app.get('/users', async (request, reply) => {
    const users = await User.query();
    return reply.view('users/index', { users });
  });
  // 1. GET /statuses - список всех статусов
  app.get('/statuses', async (request, reply) => {
    if (!request.isAuthenticated()) {
      request.flash('error', 'Access denied. Please log in.');
      return reply.redirect('/session/new');
    }
    const statuses = await TaskStatus.query();
    return reply.view('statuses/index', { statuses });
  });


  // 2. GET /statuses/new
  app.get('/statuses/new', async (request, reply) => {
    if (!request.isAuthenticated()) return reply.redirect('/session/new');
    return reply.view('statuses/new', { status: {} });
  });

  // 3. POST /statuses
  app.post('/statuses', async (request, reply) => {
    if (!request.isAuthenticated()) return reply.redirect('/session/new');
    const statusData = request.body.data;
    try {
      await TaskStatus.query().insert(statusData);
      request.flash('success', app.i18n.t('flash.statuses.create.success'));
      return reply.redirect('/statuses');
    } catch (err) {
      request.flash('error', app.i18n.t('flash.statuses.create.error'));
      return reply.view('statuses/new', { status: statusData, errors: err.data });
    }
  });

  // 4. GET /statuses/:id/edit
  app.get('/statuses/:id/edit', async (request, reply) => {
    if (!request.isAuthenticated()) return reply.redirect('/session/new');
    const { id } = request.params;
    const status = await TaskStatus.query().findById(id);
    return reply.view('statuses/edit', { status });
  });

  // 5. PATCH /statuses/:id
  app.patch('/statuses/:id', async (request, reply) => {
    if (!request.isAuthenticated()) return reply.redirect('/session/new');
    const { id } = request.params;
    const statusData = request.body.data;
    try {
      const status = await TaskStatus.query().findById(id);
      await status.$query().patch(statusData);
      request.flash('success', app.i18n.t('flash.statuses.update.success'));
      return reply.redirect('/statuses');
    } catch (err) {
      request.flash('error', app.i18n.t('flash.statuses.update.error'));
      return reply.view('statuses/edit', { status: { id, ...statusData }, errors: err.data });
    }
  });

  // 6. DELETE /statuses/:id
  app.delete('/statuses/:id', async (request, reply) => {
    if (!request.isAuthenticated()) return reply.redirect('/session/new');
    const { id } = request.params;
    try {
      await TaskStatus.query().deleteById(id);
      request.flash('success', app.i18n.t('flash.statuses.delete.success'));
    } catch {
      request.flash('error', app.i18n.t('flash.statuses.delete.error'));
    }
    return reply.redirect('/statuses');
  });
    // 1. GET /tasks - Список всех задач
  app.get('/tasks', async (request, reply) => {
    const tasks = await Task.query().withGraphFetched('[status, creator, executor, labels]');
    return reply.view('tasks/index', { tasks });
  });

  // 2. GET /tasks/new - Форма создания задачи
  app.get('/tasks/new', async (request, reply) => {
    if (!request.isAuthenticated()) return reply.redirect('/session/new');
    const statuses = await app.models.TaskStatus.query();
    const users = await app.models.User.query();
    const labels = await app.models.Label.query(); // Добавили эту строку
    return reply.view('tasks/new', { task: {}, statuses, users, labels });
  });

  // 3. POST /tasks - Создание новой задачи
  app.post('/tasks', async (request, reply) => {
    if (!request.isAuthenticated()) return reply.redirect('/session/new');
    
    const { labels, ...rawTaskData } = request.body.data;
    
    // Преобразуем массив ID меток в формат отношений Objection.js [{ id: 1 }, { id: 2 }]
    const labelsData = labels 
      ? (Array.isArray(labels) ? labels : [labels]).map((id) => ({ id: Number(id) }))
      : [];

    const taskData = {
      ...rawTaskData,
      creatorId: request.user.id,
      statusId: Number(rawTaskData.statusId),
      executorId: rawTaskData.executorId ? Number(rawTaskData.executorId) : null,
      labels: labelsData, // Передаем граф связей
    };

    try {
      // Исполняем безопасную вставку графа
      await app.models.Task.query().insertGraph(taskData, { relate: true });
      request.flash('success', app.i18n.t('flash.tasks.create.success'));
      return reply.redirect('/tasks');
    } catch (err) {
      const statuses = await app.models.TaskStatus.query();
      const users = await app.models.User.query();
      const allLabels = await app.models.Label.query();
      return reply.view('tasks/new', { task: taskData, statuses, users, labels: allLabels, errors: err.data });
    }
  });


  // 4. GET /tasks/:id - Просмотр одной задачи
  app.get('/tasks/:id', async (request, reply) => {
    const { id } = request.params;
    const task = await Task.query().findById(id).withGraphFetched('[status, creator, executor]');
    return reply.view('tasks/show', { task });
  });

  // 5. GET /tasks/:id/edit - Страница редактирования задачи
  app.get('/tasks/:id/edit', async (request, reply) => {
    if (!request.isAuthenticated()) return reply.redirect('/session/new');
    const task = await app.models.Task.query().findById(request.params.id).withGraphFetched('labels');
    const statuses = await app.models.TaskStatus.query();
    const users = await app.models.User.query();
    const labels = await app.models.Label.query(); // Добавили эту строку
    return reply.view('tasks/edit', { task, statuses, users, labels });
  });

  // 6. PATCH /tasks/:id - Обновление задачи
  app.patch('/tasks/:id', async (request, reply) => {
    if (!request.isAuthenticated()) return reply.redirect('/session/new');
    
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
      // upsertGraph автоматически удалит старые связи m2m и запишет новые
      await app.models.Task.query().upsertGraph(updateData, {
        relate: true,
        unrelate: true,
      });
      request.flash('success', app.i18n.t('flash.tasks.update.success'));
      return reply.redirect('/tasks');
    } catch (err) {
      const statuses = await app.models.TaskStatus.query();
      const users = await app.models.User.query();
      const allLabels = await app.models.Label.query();
      return reply.view('tasks/edit', { task: updateData, statuses, users, labels: allLabels, errors: err.data });
    }
  });


  // 7. DELETE /tasks/:id - Удаление задачи
  app.delete('/tasks/:id', async (request, reply) => {
    if (!request.isAuthenticated()) return reply.redirect('/session/new');
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
    // 1.  GET /labels - Список всех меток
  app.get('/labels', async (request, reply) => {
    if (!request.isAuthenticated()) return reply.redirect('/session/new');
    const labels = await app.models.Label.query();
    return reply.view('labels/index', { labels });
  });

  // 2.  GET /labels/new - Страница создания
  app.get('/labels/new', async (request, reply) => {
    if (!request.isAuthenticated()) return reply.redirect('/session/new');
    return reply.view('labels/new', { label: {} });
  });

  // 3. . POST /labels - Создание новой метки
  app.post('/labels', async (request, reply) => {
    if (!request.isAuthenticated()) return reply.redirect('/session/new');
    const labelData = request.body.data;
    try {
      await app.models.Label.query().insert(labelData);
      request.flash('success', app.i18n.t('flash.labels.create.success'));
      return reply.redirect('/labels');
    } catch (err) {
      request.flash('error', app.i18n.t('flash.labels.create.error'));
      return reply.view('labels/new', { label: labelData, errors: err.data });
    }
  });

  // 4.  GET /labels/:id/edit - Страница редактирования
  app.get('/labels/:id/edit', async (request, reply) => {
    if (!request.isAuthenticated()) return reply.redirect('/session/new');
    const label = await app.models.Label.query().findById(request.params.id);
    return reply.view('labels/edit', { label });
  });

  // Роут-заглушка для обработки PATCH и DELETE из HTML-форм задач
  // Исправленный роут-заглушка с принудительной установкой типа контента HTML
  app.post('/tasks/:id', async (request, reply) => {
    const method = request.body?._method?.toUpperCase() || request.body?.data?._method?.toUpperCase();
    
    if (method === 'DELETE') {
      const res = await app.inject({
        method: 'DELETE',
        url: `/tasks/${request.params.id}`,
        cookies: request.cookies, 
      });
      // Если это редирект (302), перенаправляем браузер по адресу
      if (res.statusCode === 302) {
        return reply.redirect(res.headers.location);
      }
      return reply.code(res.statusCode).type('text/html').send(res.body);
    }
    
    // Иначе это форма редактирования (PATCH)
    const res = await app.inject({
      method: 'PATCH',
      url: `/tasks/${request.params.id}`,
      payload: request.body,
      cookies: request.cookies,
    });

    // Обязательно обрабатываем редирект после успешного сохранения!
    if (res.statusCode === 302) {
      return reply.redirect(res.headers.location);
    }

    // Если возникла ошибка валидации, возвращаем форму с типом text/html
    return reply.code(res.statusCode).type('text/html').send(res.body);
  });


  // 5. PATCH /labels/:id - обновление
  app.patch('/labels/:id', async (request, reply) => {
    if (!request.isAuthenticated()) return reply.redirect('/session/new');
    try {
      const label = await app.models.Label.query().findById(request.params.id);
      await label.$query().patch(request.body.data);
      request.flash('success', app.i18n.t('flash.labels.update.success'));
      return reply.redirect('/labels');
    } catch (err) {
      return reply.view('labels/edit', { label: { id: request.params.id, ...request.body.data }, errors: err.data });
    }
  });

  // 6. DELETE /labels/:id - удаление
  app.delete('/labels/:id', async (request, reply) => {
    if (!request.isAuthenticated()) return reply.redirect('/session/new');
    try {
      await app.models.Label.query().deleteById(request.params.id);
      request.flash('success', app.i18n.t('flash.labels.delete.success'));
    } catch {
      // База данных выкинет ошибку, если метка связана с задачей (RESTRICT)
      request.flash('error', app.i18n.t('flash.labels.delete.error'));
    }
    return reply.redirect('/labels');
  });

  // Страница регистрации
  app.get('/users/new', async (request, reply) => reply.view('users/new', { user: {} }));

  // Создание пользователя (Регистрация)
  app.post('/users', async (request, reply) => {
    // Если расширенный парсер отработал, данные будут в request.body.data.
    // Если нет — берём весь request.body
    const userData = request.body.data || request.body;
    
    try {
      await User.query().insert(userData);
      return reply.redirect('/users');
    } catch (err) {
      console.error('ОШИБКА ВАЛИДАЦИИ:', err);
      const errors = err.data || {};
      return reply.view('users/new', { user: userData, errors });
    }
  });

  // Страница входа (GET)
  app.get('/session/new', async (request, reply) => reply.view('session/new', {}));

  // Единый обработчик POST /session (обрабатывает и вход, и симуляцию DELETE через скрытое поле)
  app.post('/session', async (request, reply) => {
    // Если форма прислала имитацию DELETE (кнопка Logout)
    if (request.body && request.body._method === 'DELETE') {
      request.logOut();
      return reply.redirect('/');
    }

    // Иначе это обычный вход, передаем управление Passport
    return app.passport.authenticate('local', {
      successRedirect: '/',
      failureRedirect: '/session/new',
    })(request, reply);
  });
};
