import fastify from 'fastify';

export default async (options = {}) => {
  const app = fastify(options);

  // Убрали неиспользуемые аргументы request и reply
  app.get('/', async () => {
    return 'Привет от Менеджера Задач Хекслета!';
  });

  return app;
};
