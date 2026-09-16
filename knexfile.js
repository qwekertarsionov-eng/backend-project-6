import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrations = {
  directory: path.join(__dirname, 'server', 'migrations'),
};

// sqlite по умолчанию не включает внешние ключи; включаем их, чтобы
// поведение RESTRICT/CASCADE совпадало с PostgreSQL.
const sqlitePool = {
  afterCreate(conn, done) {
    conn.run('PRAGMA foreign_keys = ON', (err) => done(err, conn));
  },
};

export default {
  development: {
    client: 'sqlite3',
    connection: {
      filename: path.join(__dirname, 'database.sqlite'),
    },
    useNullAsDefault: true,
    pool: sqlitePool,
    migrations,
  },
  test: {
    client: 'sqlite3',
    connection: ':memory:', // In-Memory режим по ТЗ Хекслета
    useNullAsDefault: true,
    pool: sqlitePool,
    migrations,
  },
  production: {
    client: 'postgresql',
    connection: process.env.DATABASE_URL || 'postgres://postgres:password@db:5432/postgres', // Render передаст DATABASE_URL; фолбэк для CI-харнесса Hexlet
    pool: {
      min: 2,
      max: 10,
    },
    migrations,
  },
};
