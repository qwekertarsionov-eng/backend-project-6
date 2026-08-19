import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrations = {
  directory: path.join(__dirname, 'server', 'migrations'),
};

export default {
  development: {
    client: 'sqlite3',
    connection: {
      filename: path.join(__dirname, 'database.sqlite'),
    },
    useNullAsDefault: true,
    migrations,
  },
  test: {
    client: 'sqlite3',
    connection: ':memory:', // In-Memory режим по ТЗ Хекслета
    useNullAsDefault: true,
    migrations,
  },
  production: {
    client: 'postgresql',
    connection: process.env.DATABASE_URL, // Render автоматически передаст эту переменную
    pool: {
      min: 2,
      max: 10,
    },
    migrations,
  },
};
