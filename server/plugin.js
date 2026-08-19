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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Создаем инстанс аутентификатора Passport
const fastifyPassport = new Authenticator();

export default async (app, options = {}) => {
  // 1. Настройка базы данных и ORM
  const mode = process.env.NODE_ENV || 'development';
  const knex = Knex(knexConfig[mode]);
  Model.knex(knex);

  app.decorate('models', { User });

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
