import { test, expect, type Page } from "@playwright/test";

async function mockNotesApi(page: Page) {
  const notes = new Map<
    string,
    {
      id: string;
      title: string;
      body: string;
      createdAt: string;
      updatedAt: string;
    }[]
  >();
  await page.route("http://e2e.local/notes**", async (route) => {
    const request = route.request();
    const headers = {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "*",
      "content-type": "application/json",
    };
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers });
      return;
    }
    const user = (request.headers()["authorization"] ?? "").replace(
      "Bearer ",
      "",
    );
    const list = notes.get(user) ?? [];
    const url = new URL(request.url());
    if (request.method() === "GET" && url.pathname === "/notes") {
      await route.fulfill({
        status: 200,
        headers,
        body: JSON.stringify({ notes: list, nextCursor: null }),
      });
      return;
    }
    if (request.method() === "POST") {
      const input = request.postDataJSON() as { title: string; body: string };
      const now = new Date().toISOString();
      const note = {
        id: `n-${list.length + 1}`,
        title: input.title,
        body: input.body,
        createdAt: now,
        updatedAt: now,
      };
      notes.set(user, [...list, note]);
      await route.fulfill({
        status: 201,
        headers,
        body: JSON.stringify({ note }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      headers,
      body: JSON.stringify({ ok: true }),
    });
  });
}

async function seed(page: Page, values: Record<string, unknown>) {
  await page.addInitScript((seedValues) => {
    for (const [key, value] of Object.entries(seedValues)) {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }, values);
}

test.beforeEach(async ({ page }) => {
  await seed(page, { "e2e-flags": {}, "e2e-entitlement": null });
});

test("sign-in, notes CRUD and two-user isolation", async ({ page }) => {
  await mockNotesApi(page);
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("alice@example.com");
  await page.getByLabel("Password").fill("password-123");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL("/");
  await page.goto("/notes");
  await page.getByRole("button", { name: /new/i }).click();
  await page.getByLabel(/title/i).fill("Alice note");
  await page.getByRole("button", { name: /save/i }).click();
  await expect(page.getByText("Alice note")).toBeVisible();

  await page.goto("/account");
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("bob@example.com");
  await page.getByLabel("Password").fill("password-123");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL("/");
  await page.goto("/notes");
  await expect(page.getByText("Alice note")).toHaveCount(0);
});

test("flag-gated route", async ({ page }) => {
  await seed(page, {
    "e2e-session": {
      user: {
        id: "alice",
        email: "alice@example.com",
        name: "alice",
        emailVerified: true,
      },
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    },
    "e2e-token": "alice",
    "e2e-flags": { betaExport: false },
  });
  await page.goto("/beta-export");
  await page.waitForURL("/");
});

test("entitlement gate", async ({ page }) => {
  await seed(page, {
    "e2e-session": {
      user: {
        id: "alice",
        email: "alice@example.com",
        name: "alice",
        emailVerified: true,
      },
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    },
    "e2e-token": "alice",
  });
  await page.goto("/export");
  await expect(page.getByText("Upgrade required")).toBeVisible();
});

test("consent prompt sends nothing before accept", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.getByText(/Help improve the app/)).toBeVisible();
  const before = await page.evaluate(
    () =>
      (window as unknown as { __e2eAnalytics?: { calls: unknown[] } })
        .__e2eAnalytics?.calls.length ?? 0,
  );
  expect(before).toBe(0);
  await page.getByRole("button", { name: "Accept" }).click();
  await expect(page.getByText(/Help improve the app/)).toHaveCount(0);
});

test("settings page renders native options", async ({ page }) => {
  await seed(page, {
    "e2e-session": {
      user: {
        id: "alice",
        email: "alice@example.com",
        name: "alice",
        emailVerified: true,
      },
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    },
    "e2e-token": "alice",
  });
  await page.goto("/settings");
  await expect(page.getByText("Desktop behavior")).toBeVisible();
  await expect(page.getByText("Keep running in the tray")).toBeVisible();
});
