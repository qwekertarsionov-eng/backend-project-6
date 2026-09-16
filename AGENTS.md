# AGENTS.md

Менеджер задач (Hexlet Project 6): Fastify 5 + Objection/Knex + Passport + eta + Tailwind v4/Vite. ESM, Node >= 24, деплой на Render (PostgreSQL).

## Команды

```
make setup   # то, чем «проверка» ставит решение: npm ci + vite build + knex migrate (dev)
make lint    # npx eslint .
make test    # vite build + vitest run (31 тест)
make dev     # node --watch server/bin/server.js
make start   # node server/bin/server.js
make db-migrate   # миграции прод-конфига (Postgres: NODE_ENV=production + DATABASE_URL)
npm run migrate   # knex migrate:latest (разворачивает server/migrations в dev-БД)
```

## Структура и точка входа

- `package.json` `main` → `server/app.js`: двойной экспорт — named `buildApp(options)` создаёт и настраивает fastify-приложение (используют `server/bin/server.js` и тесты); default-экспорт — async-плагин `(fastify, opts)` (ровно 2 аргумента), которым харнесс Hexlet запускает сервер через `npx fastify start ... -o <main>`; свойство `startApp.options = { rewriteUrl }` передаёт rewriteUrl в конструктор Fastify. НЕ выноси роуты из `server/plugin.js` без нужды — они все там.
- `server/plugin.js` — каркас (knex/Model.knex, formbody/static/view/secure-session/passport/i18n/flash) + все роуты. Декораторы: `app.models` (User/TaskStatus/Task/Label), `app.knex`.
- База: `knexfile.js` — `development` sqlite-файл `database.sqlite` (+ `PRAGMA foreign_keys = ON`), `test` sqlite `:memory:` при `NODE_ENV=test`, `production` PostgreSQL через `DATABASE_URL`. Миграции: `server/migrations/` (FK RESTRICT/CASCADE заданы на уровне БД).

## Ключевые механики (не дадут ошибиться)

- **`_method`**: формы в браузере шлют только GET/POST. PATCH/DELETE — это `POST <url>?_method=PATCH|DELETE`; подмена HTTP-метода выполняется глобально через `rewriteUrl` в `server/app.js`. НЕ читай `_method` из тела (прокси-роутов и веток `body._method` больше нет).
- **Поля форм**: строго `name="data[firstName]"` / `id="data_firstName"` — `@fastify/formbody` + `qs` раскладывают такие имена в `request.body.data` (в части роутов есть фолбэк `request.body.data || request.body`). Стратегия passport-local использует `data[email]`/`data[password]`. Автотесты ищут `role="alert"` на flash-элементах — не убирай.
- **Flash**: `@fastify/flash` — `request.flash(type, msg)` пишет, `reply.flash()` читает+очищает (в `preHandler` прокидывается в шаблоны как `it.flash`).
- **Права доступа**: `request.isAuthenticated()` проверяется в каждом роуте вручную. Свой профиль правит/удаляет только сам пользователь; задачу удаляет только создатель; пользователя/статус/метку, связанную с задачей, удалить нельзя (FK RESTRICT → catch + flash-ошибка).
- **Пароли**: sha256-hex в колонке `passwordDigest`, считается в `User.$beforeInsert` (только при insert!). При PATCH пользователя хэш пересчитывается в роуте.
- **Модели**: везде `columnNameMappers = snakeCaseMappers()` (JS camelCase ↔ DB snake_case). В `Task` relationMapping многие-ко-многим через таблицу `tasks_labels` (имена колонок в join указывать snake_case).
- **Стили**: `src/styles.css` → `@import "tailwindcss"; @source "../views";`. `@source` критично: Tailwind собирает только классы из шаблонов eta (`server/views/*.eta`). Без правки шаблонов не пересобирай css — сборка «зелёная», но страница без стилей. `dist/` не коммитить.
- **i18n**: `server/locales/en.js` + `ru.js` (default-экспорты вида `{ en: {...} }`/`{ ru: {...} }`). Локаль по умолчанию — русская (`ru`); английская (`en`) используется в тестах при `NODE_ENV=test`. Выбор задаётся в `server/plugin.js`: `fallbackLocale: process.env.NODE_ENV === 'test' ? 'en' : 'ru'`, `messages: { en: en.en, ru: ru.ru }` (без двойной вложенности — fastify-i18n ждёт ресурсы «как есть»). В реальном браузере язык может быть выбран из заголовка `accept-language`. Шаблоны используют `it.t('ключ')`. ЕСЛИ в будущем понадобится «полностью русский вариант» (включая русский в тестах), достаточно править русские строки тестов и ключи в `server/locales/*.js` — вёрстка уже на `it.t()`.

## Тесты

- `test/` — vitest + `buildApp().inject()`. Хелпер включает `PRAGMA foreign_keys = ON` на in-memory sqlite и накатывает миграции через **тот же** `app.knex`, которым пользуется приложение (для `:memory:` база живёт в одном соединении). Новый тест-файл — свой `buildApp()` в `beforeEach`, `app.close()` в `afterEach`.
- Сессии в тестах: логин через `POST /session` (form `data[email]`/`data[password]`), cookie из `headers['set-cookie']` передаётся как заголовок `cookie` в последующие inject.
- `test/helpers.js` — готовые хелперы: `buildAppTest` (миграции + PRAGMA), `registerUser`, `login` (возвращает cookie), `authed`, `authedForm`. Используй их в новых тестах вместо ручного `inject`.

## Прочее

- `.github/workflows/*` (hexlet-check.yml и др.) — автогенерируемые, на GitHub их ставит сам Хекслет; НЕ создавать, НЕ редактировать, НЕ удалять. Локально их может не быть.
- `database.sqlite` в .gitignore; dev-модификации БД коммитить нельзя.
- `make test` обязан сначала собрать css (`dist/`) — тест `test/assets.test.js` проверяет `/assets/main.css` на наличии tailwind-классов.
- **Ошибки** → Bugsink через `@sentry/node`. Init в `server/instrument.js` (preload `--import`); DSN из env `SENTRY_DSN`; без него SDK не инициализируется и не влияет на тесты. Роут-ошибки Fastify 5 ловит `Sentry.fastifyIntegration()` (диагностический канал, `setupFastifyErrorHandler` не нужен). Разовый смок-тест: `SENTRY_SMOKE=1` (лёмпочка, в проде не держать).

## План и процесс проверки (lint-контракт Hexlet)

CI (`hexlet/project-action`) после Chromium-e2e запускает `@hexlet/project` → `oxlint && oxfmt --ignore-path=.oxfmtignore --check` поверх решения. Конфиги приходят из образа, в репозиторий их коммитить не нужно.

- `oxlint@1.80`: `categories.correctness=error`, плагины typescript/unicorn/oxc/import/promise/node/jsdoc/vitest/... Неиспользуемые параметры и переменные должны начинаться с `_`.
- `oxfmt@0.65`: дефолты — двойные кавычки, `printWidth: 100`, `trailingComma: "all"`, `semi`, `arrowParens: "always"`. Поэтому весь JS в репозитории отформатирован oxfmt; `.eta`, `.css`, `.json`, `.md`, `.yml` форматтер игнорирует.
- Lint-тулинг держим в `/tmp/opencode/lintcheck` (`oxfmt@0.65.0`, `oxlint@1.80.0`) вместе с извлечёнными из слоя образа `.oxfmtignore` и `.oxlintrc.json`; в репозиторий их не добавляем.
- Свой eslint не должен ругаться на `_`-префикс: в `eslint.config.js` правило `no-unused-vars: ["warn", { argsIgnorePattern: "^_" }]`.

### План исполнения (субагенты)

Вся работа выполняется субагентами (вложенность допустима), нагрузка сбалансирована:

1. Agent A — правки под oxlint в `server/plugin.js`: `_options` вместо `options`, спред без пустого fallback `|| {}`.
2. Agent B — oxfmt-реформат всех JS-файлов.
3. Agent C — верификация: oxlint 0 ошибок, `make lint`, `make test` 31/31, Playwright-харнесс 28/28.
4. Agent D — иное решение для warning (eslint `argsIgnorePattern`), сохранение плана в `AGENTS.md`.
5. Agent E — коммит и пуш, наблюдение за CI.

Запуск харнесса: сервер `npx fastify start -a 0.0.0.0 -p 3000 -l info -o server/app.js`; тесты в `/tmp/opencode/harness/src` с `LOCALE=ru-RU BASE_URL=http://localhost:3000` и `LD_LIBRARY_PATH` из `/tmp/opencode/sysroot`-каталога `/tmp/opencode/pw/sysroot`.