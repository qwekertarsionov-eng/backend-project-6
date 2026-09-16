# AGENTS.md

Менеджер задач (Hexlet Project 6): Fastify 5 + Objection/Knex + Passport + eta + Tailwind v4/Vite. ESM, Node >= 24, деплой на Render (PostgreSQL).

## Команды

```
make setup   # то, чем «проверка» ставит решение: npm ci + vite build + knex migrate (dev)
make lint    # npx eslint .
make test    # vite build + vitest run (31 тест)
make dev     # node --watch server/bin/server.js
make start   # node server/bin/server.js
npm run migrate   # knex migrate:latest (разворачивает server/migrations в dev-БД)
```

## Структура и точка входа

- `package.json` `main` → `server/app.js`: экспортирует `buildApp(options)` — создаёт и настраивает fastify-приложение (`server/bin/server.js` и тесты используют её). НЕ выноси роуты из `server/plugin.js` без нужды — они все там.
- `server/plugin.js` — каркас (knex/Model.knex, formbody/static/view/secure-session/passport/i18n/flash) + все роуты. Декораторы: `app.models` (User/TaskStatus/Task/Label), `app.knex`.
- База: `knexfile.js` — `development` sqlite-файл `database.sqlite` (+ `PRAGMA foreign_keys = ON`), `test` sqlite `:memory:` при `NODE_ENV=test`, `production` PostgreSQL через `DATABASE_URL`. Миграции: `server/migrations/` (FK RESTRICT/CASCADE заданы на уровне БД).

## Ключевые механики (не дадут ошибиться)

- **`_method`**: формы в браузере шлют только GET/POST. PATCH/DELETE — это `POST <url>?_method=PATCH|DELETE`; подмена HTTP-метода выполняется глобально через `rewriteUrl` в `server/app.js`. НЕ читай `_method` из тела (прокси-роутов и веток `body._method` больше нет).
- **Поля форм**: строго `name="data[firstName]"` / `id="data_firstName"` (паdeep-парсинг `@fastify/formbody` + qs → `request.body.data`). Стратегия passport-local использует `data[email]`/`data[password]`. Автотесты ищут `role="alert"` на flash-элементах — не убирай.
- **Flash**: `@fastify/flash` — `request.flash(type, msg)` пишет, `reply.flash()` читает+очищает (в `preHandler` прокидывается в шаблоны как `it.flash`).
- **Права доступа**: `request.isAuthenticated()` проверяется в каждом роуте вручную. Свой профиль правит/удаляет только сам пользователь; задачу удаляет только создатель; пользователя/статус/метку, связанную с задачей, удалить нельзя (FK RESTRICT → catch + flash-ошибка).
- **Пароли**: sha256-hex в колонке `passwordDigest`, считается в `User.$beforeInsert` (только при insert!). При PATCH пользователя хэш пересчитывается в роуте.
- **Модели**: везде `columnNameMappers = snakeCaseMappers()` (JS camelCase ↔ DB snake_case). В `Task` relationMapping многие-ко-многим через таблицу `tasks_labels` (имена колонок в join указывать snake_case).
- **Стили**: `src/styles.css` → `@import "tailwindcss"; @source "../views";`. `@source` критично: Tailwind собирает только классы из шаблонов eta (`server/views/*.eta`). Без правки шаблонов не пересобирай css — сборка «зелёная», но страница без стилей. `dist/` не коммитить.
- **i18n**: `server/locales/en.js`, язык по умолчанию английский. В шаблонах `it.t('ключ')`.

## Тесты

- `test/` — vitest + `buildApp().inject()`. Хелпер включает `PRAGMA foreign_keys = ON` на in-memory sqlite и накатывает миграции через **тот же** `app.knex`, которым пользуется приложение (для `:memory:` база живёт в одном соединении). Новый тест-файл — свой `buildApp()` в `beforeEach`, `app.close()` в `afterEach`.
- Сессии в тестах: логин через `POST /session` (form `data[email]`/`data[password]`), cookie из `headers['set-cookie']` передаётся как заголовок `cookie` в последующие inject.

## Прочее

- `.github/workflows/hexlet-check.yml` — автогенерируемый, НЕ удалять и не редактировать.
- `database.sqlite` в .gitignore; dev-модификации БД коммитить нельзя.
- `make test` обязан сначала собрать css (`dist/`) — тест `test/assets.test.js` проверяет `/assets/main.css` на наличии tailwind-классов.