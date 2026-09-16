import dotenv from 'dotenv';
import buildApp from '../app.js';

dotenv.config();

const startServer = async () => {
  const app = await buildApp({ logger: true });
  const port = process.env.PORT || 3000;
  const host = '0.0.0.0';
  try {
    await app.listen({ port, host });
    console.log(`Server running on http://${host}:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

startServer();
