import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { buildAppTest, form, registerUser, login, authed } from "./helpers.js";

describe("sessions", () => {
  let app;

  beforeEach(async () => {
    app = await buildAppTest();
  });

  afterEach(async () => {
    await app.close();
  });

  it("вход с верным паролем", async () => {
    await registerUser(app);

    const loginRes = await app.inject({
      method: "POST",
      url: "/session",
      ...form({ "data[email]": "john@example.com", "data[password]": "secret" }),
    });

    expect(loginRes.statusCode).toBe(302);
    expect(loginRes.headers.location).toBe("/");
    expect(loginRes.headers["set-cookie"]).toBeDefined();

    const cookie = await login(app);
    expect(cookie).not.toBe("");

    const home = await app.inject({ method: "GET", url: "/", ...authed(cookie) });
    expect(home.statusCode).toBe(200);
    expect(home.payload).toContain("Sign Out");
  });

  it("вход с неверным паролем", async () => {
    await registerUser(app);

    const res = await app.inject({
      method: "POST",
      url: "/session",
      ...form({ "data[email]": "john@example.com", "data[password]": "wrong-password" }),
    });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe("/session/new");
  });

  it("логаут", async () => {
    await registerUser(app);
    const cookie = await login(app);

    const homeBefore = await app.inject({ method: "GET", url: "/", ...authed(cookie) });
    expect(homeBefore.payload).toContain("Statuses");

    const logout = await app.inject({
      method: "POST",
      url: "/session?_method=DELETE",
      ...authed(cookie),
    });

    expect(logout.statusCode).toBe(302);
    expect(logout.headers.location).toBe("/");

    const afterLogoutCookies = logout.headers["set-cookie"];
    const afterLogoutCookie = Array.isArray(afterLogoutCookies)
      ? afterLogoutCookies[0]?.split(";")[0]
      : afterLogoutCookies?.split(";")[0];

    const homeAfter = await app.inject({
      method: "GET",
      url: "/",
      ...authed(afterLogoutCookie || ""),
    });
    expect(homeAfter.payload).not.toContain("Statuses");
  });
});
