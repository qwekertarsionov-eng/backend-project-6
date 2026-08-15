import path from 'path';
import { fileURLToPath } from 'url';
import fastifyView from '@fastify/view';
import fastifyI18n from 'fastify-i18n';
import pug from 'pug';
import en from './locales/en.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async (app, options = {}) => {
  // Регистрируем плагин локализации i18n
  await app.register(fastifyI18n, {
    fallbackLng: 'en',
    messages: { en },
  });

  // Регистрируем шаблонизатор Pug
  await app.register(fastifyView, {
    engine: { pug },
    includeViewExtension: true,
    root: path.join(__dirname, 'views'),
    defaultContext: {
      t: function (key, bindings) {
        return app.i18n.t(key, bindings);
      },
    },
  });

  // Настраиваем роут для главной страницы
  app.get('/', async (request, reply) => {
    return reply.view('index');
  });

  return app;
};
