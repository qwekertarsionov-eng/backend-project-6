import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { buildAppTest, registerUser, login, authed, authedForm } from "./helpers.js";

describe("labels", () => {
  let app;

  beforeEach(async () => {
    app = await buildAppTest();
  });

  afterEach(async () => {
    await app.close();
  });

  it("без логина GET /labels редиректит на /session/new", async () => {
    const res = await app.inject({ method: "GET", url: "/labels" });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe("/session/new");
  });

  it("залогиненный пользователь может создать метку", async () => {
    await registerUser(app);
    const cookie = await login(app);

    const create = await app.inject({
      method: "POST",
      url: "/labels",
      ...authedForm(cookie, { "data[name]": "Urgent" }),
    });

    expect(create.statusCode).toBe(302);
    expect(create.headers.location).toBe("/labels");

    const list = await app.inject({ method: "GET", url: "/labels", ...authed(cookie) });
    expect(list.payload).toContain("Urgent");
  });

  it("валидация пустого имени метки", async () => {
    await registerUser(app);
    const cookie = await login(app);

    const create = await app.inject({
      method: "POST",
      url: "/labels",
      ...authedForm(cookie, { "data[name]": "" }),
    });

    expect(create.statusCode).toBe(200);
    expect(create.payload).toContain('role="alert"');

    const labels = await app.models.Label.query();
    expect(labels).toHaveLength(0);
  });

  it("обновление метки", async () => {
    await registerUser(app);
    const cookie = await login(app);

    await app.inject({
      method: "POST",
      url: "/labels",
      ...authedForm(cookie, { "data[name]": "Urgent" }),
    });

    const label = await app.models.Label.query().findOne({ name: "Urgent" });

    const update = await app.inject({
      method: "POST",
      url: `/labels/${label.id}?_method=PATCH`,
      ...authedForm(cookie, { "data[name]": "Important" }),
    });

    expect(update.statusCode).toBe(302);
    expect(update.headers.location).toBe("/labels");

    const list = await app.inject({ method: "GET", url: "/labels", ...authed(cookie) });
    expect(list.payload).toContain("Important");
    expect(list.payload).not.toContain("Urgent");
  });

  it("удаление непривязанной метки", async () => {
    await registerUser(app);
    const cookie = await login(app);

    await app.inject({
      method: "POST",
      url: "/labels",
      ...authedForm(cookie, { "data[name]": "Urgent" }),
    });

    const label = await app.models.Label.query().findOne({ name: "Urgent" });

    const del = await app.inject({
      method: "POST",
      url: `/labels/${label.id}?_method=DELETE`,
      ...authed(cookie),
    });

    expect(del.statusCode).toBe(302);
    expect(del.headers.location).toBe("/labels");

    const list = await app.inject({ method: "GET", url: "/labels", ...authed(cookie) });
    expect(list.payload).not.toContain("Urgent");

    const remaining = await app.models.Label.query().findById(label.id);
    expect(remaining).toBeUndefined();
  });

  it("метку, привязанную к задаче, нельзя удалить", async () => {
    await registerUser(app);
    const cookie = await login(app);
    const user = await app.models.User.query().findOne({ email: "john@example.com" });

    const [statusId] = await app.knex("task_statuses").insert({ name: "New" });
    const [labelId] = await app.knex("labels").insert({ name: "Urgent" });
    const [taskId] = await app.knex("tasks").insert({
      name: "Task with label",
      status_id: statusId,
      creator_id: user.id,
    });
    await app.knex("tasks_labels").insert({ task_id: taskId, label_id: labelId });

    const del = await app.inject({
      method: "POST",
      url: `/labels/${labelId}?_method=DELETE`,
      ...authed(cookie),
    });

    expect(del.statusCode).toBe(302);
    expect(del.headers.location).toBe("/labels");

    const list = await app.inject({ method: "GET", url: "/labels", ...authed(cookie) });
    expect(list.payload).toContain("Urgent");

    const label = await app.models.Label.query().findById(labelId);
    expect(label).toBeDefined();
  });
});
