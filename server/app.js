import fastify from 'fastify';
import initApp from './plugin.js';

const allowedMethods = ['HEAD', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'];

const rewriteUrl = (req) => {
  if (req.method.toUpperCase() === 'POST') {
    const { searchParams } = new URL(req.url, 'http://localhost');
    const method = searchParams.get('_method')?.toUpperCase();
    if (method && allowedMethods.includes(method)) {
      req.method = method;
    }
  }
  return req.url;
};

export async function buildApp(options = {}) {
  const app = fastify({ logger: options.logger ?? false, rewriteUrl });
  await initApp(app, options);
  return app;
}

export default async function startApp(app, opts) {
  await initApp(app, opts);
}

export const options = { rewriteUrl };
