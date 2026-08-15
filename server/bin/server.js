import dotenv from 'dotenv';
import fastify from 'fastify';
import initApp from '../plugin.js';

dotenv.config();

const startServer = async () => {
  // Создаем инстанс Fastify здесь
  const app = fastify({ logger: true });
  
  // Передаем его в плагин инициализации
  await initApp(app);
  
  const port = process.env.PORT || 3000;
  const host = '0.0.0.0';

  try {
    await app.listen({ port, host });
    console.log(`Сервер запущен на http://${host}:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

startServer();
