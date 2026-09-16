import { buildApp } from '../server/app.js';

process.env.NODE_ENV = 'test';

export const buildAppTest = async (options = {}) => {
  const app = await buildApp(options);
  await app.knex.migrate.latest();
  await app.knex.raw('PRAGMA foreign_keys = ON');
  return app;
};

export const form = (data) => ({
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  payload: new URLSearchParams(data).toString(),
});

export const registerUser = async (app, data = {}) => {
  const payload = {
    'data[firstName]': data.firstName ?? 'John',
    'data[lastName]': data.lastName ?? 'Doe',
    'data[email]': data.email ?? 'john@example.com',
    'data[password]': data.password ?? 'secret',
  };
  return app.inject({ method: 'POST', url: '/users', ...form(payload) });
};

export const login = async (app, { email = 'john@example.com', password = 'secret' } = {}) => {
  const res = await app.inject({
    method: 'POST',
    url: '/session',
    ...form({ 'data[email]': email, 'data[password]': password }),
  });
  const cookies = res.headers['set-cookie'];
  const cookie = Array.isArray(cookies) ? cookies[0] : cookies;
  return cookie?.split(';')[0] ?? '';
};

export const authed = (cookie) => ({ headers: { cookie } });

export const authedForm = (cookie, data) => ({
  headers: {
    cookie,
    'content-type': 'application/x-www-form-urlencoded',
  },
  payload: new URLSearchParams(data).toString(),
});