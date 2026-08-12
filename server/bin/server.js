import dotenv from 'dotenv';
import init from '../plugin.js';

// Инициализируем dotenv для чтения файла .env (локально)
dotenv.config();

const startServer = async () => {
  // Включаем логирование по методологии 12-Factor App
  const app = await init({ logger: true });
  
  // Render автоматически передает переменную PORT
  const port = process.env.PORT || 3000;
  // На продакшене обязательно слушать '0.0.0.0'
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
