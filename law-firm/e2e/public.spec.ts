import { expect, test } from "@playwright/test";

test.describe("public website", () => {
  test("homepage shows the firm, calls to action and the roleplay disclaimer", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Calder Whitmore LLP/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: "Request a consultation" }).first()).toBeVisible();
    await expect(page.getByText(/fictional firm within the GTA World roleplay community/)).toBeVisible();
    await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute("content", "Calder Whitmore LLP");
  });

  test("main navigation reaches every section", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Main" });
    for (const [label, heading] of [
      ["About", /About the firm/],
      ["Practice Areas", /How we can help/],
      ["People", /Attorneys and staff/],
      ["News & Insights", /Announcements and legal articles/],
      ["Careers", /Careers at Calder Whitmore/],
      ["Contact", /Contact the office/],
    ] as const) {
      await nav.getByRole("link", { name: label }).click();
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
      await expect(nav.getByRole("link", { name: label })).toHaveAttribute("aria-current", "page");
    }
  });

  test("practice area pages list services, team and an enquiry link", async ({ page }) => {
    await page.goto("/practice-areas");
    await page.getByRole("link", { name: /Criminal Defence/ }).first().click();
    await expect(page).toHaveURL(/\/practice-areas\/criminal-defence$/);
    await expect(page.getByRole("heading", { name: "Matters we handle" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Criminal Defence team" })).toBeVisible();
    await page.getByRole("link", { name: /Start a criminal defence enquiry/ }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Criminal Defence enquiry");
    await expect(page.getByLabel("Current stage")).toBeVisible();
  });

  test("people directory searches, filters and hides departed staff", async ({ page }) => {
    await page.goto("/people");
    await expect(page.getByRole("link", { name: /Eleanor Calder/ })).toBeVisible();
    await expect(page.getByText("Robert Hale")).toHaveCount(0);
    await page.getByLabel("Name or title").fill("Reyes");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page.getByText("1 person match your search")).toBeVisible();
    await page.getByRole("link", { name: /Daniela Reyes/ }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Daniela Reyes");
    await expect(page.getByText("English, Spanish")).toBeVisible();
    await page.goto("/people?role=partners");
    await expect(page.getByRole("link", { name: /Marcus Whitmore/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Theo Okafor/ })).toHaveCount(0);
    expect((await page.goto("/people/robert-hale"))?.status()).toBe(404);
  });

  test("on-leave attorneys are shown but cannot be booked", async ({ page }) => {
    await page.goto("/people/samuel-brandt");
    await expect(page.locator(".notice-warn", { hasText: "currently on leave" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Request a consultation" }).last()).not.toHaveAttribute("href", /attorney=samuel-brandt/);
  });

  test("articles can be searched and read; drafts stay private", async ({ page }) => {
    await page.goto("/news");
    await page.getByRole("textbox", { name: "Search articles" }).fill("traffic");
    await page.getByRole("button", { name: "Search" }).click();
    await page.getByRole("link", { name: /Traffic stops in Los Santos/ }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Traffic stops");
    await expect(page.getByText(/not legal advice/).first()).toBeVisible();
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute("content", "article");
    expect((await page.goto("/news/updated-office-hours-autumn"))?.status()).toBe(404);
  });

  test("FAQ filters by category and keyword", async ({ page }) => {
    await page.goto("/faq");
    await page.getByRole("navigation", { name: "FAQ categories" }).getByRole("link", { name: "Appointments" }).click();
    await expect(page.getByText("What time zone are appointment times in?")).toBeVisible();
    await expect(page.getByText("How do I apply to work at the firm?")).toHaveCount(0);
    await page.goto("/faq?q=fictional");
    await expect(page.getByText("Is Calder Whitmore a real law firm?")).toBeVisible();
  });

  test("legal pages, 404, sitemap and robots are served", async ({ page, request }) => {
    for (const path of ["/privacy", "/terms", "/disclaimer"]) {
      expect((await page.goto(path))?.status()).toBe(200);
    }
    const res = await page.goto("/definitely-missing");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "We could not find that page" })).toBeVisible();
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain("/practice-areas/criminal-defence");
    expect(sitemap).not.toContain("updated-office-hours-autumn");
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /admin");
  });

  test("admin and portal pages are not reachable or indexable without signing in", async ({ page, request }) => {
    await page.goto("/admin/enquiries");
    await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Fenquiries/);
    await page.goto("/portal");
    await expect(page).toHaveURL(/\/portal\/login/);
    const res = await request.get("/admin/login");
    expect(res.headers()["x-robots-tag"]).toContain("noindex");
  });
});
