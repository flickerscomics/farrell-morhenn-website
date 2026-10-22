import { expect, test } from "@playwright/test";

// Paths are relative to the base URL (the GitHub Pages sub-path).

test("homepage shows the firm and a contact route", async ({ page }) => {
  await page.goto("./");
  await expect(page).toHaveTitle(/Farrell-Morhenn/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator(".brand-mark text").first()).toHaveText("FM");
  await page.getByRole("link", { name: "Contact the office" }).first().click();
  await expect(page).toHaveURL(/\/farrell-morhenn-website\/contact\/$/);
  await expect(page.getByRole("heading", { name: "How to reach us" })).toBeVisible();
});

test("main navigation reaches every section under the base path", async ({ page }) => {
  await page.goto("./");
  const nav = page.getByRole("navigation", { name: "Main" });
  for (const [label, heading] of [
    ["About", /About the firm/],
    ["Practice Areas", /How we can help/],
    ["People", /Attorneys and staff/],
    ["News & Insights", /Announcements and legal articles/],
    ["Careers", /Careers at Farrell-Morhenn/],
    ["Contact", /Contact the office/],
  ] as const) {
    await nav.getByRole("link", { name: label }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
    expect(new URL(page.url()).pathname.startsWith("/farrell-morhenn-website/")).toBe(true);
  }
});

test("practice area pages list matters, services, FAQs and the team", async ({ page }) => {
  await page.goto("practice-areas/");
  await page.getByRole("link", { name: /Criminal Defence/ }).first().click();
  await expect(page.getByRole("heading", { name: "Matters we handle" })).toBeVisible();
  await expect(page.getByText("Should I speak to the police before talking to a lawyer?")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Criminal Defence team" })).toBeVisible();
});

test("people directory filters in the browser and keeps the filter in the URL", async ({ page }) => {
  await page.goto("people/");
  await expect(page.getByText("Robert Hale")).toHaveCount(0);
  await page.getByLabel("Name or title").fill("Reyes");
  await expect(page.getByText("1 person match your search")).toBeVisible();
  await expect(page).toHaveURL(/\?q=Reyes$/);
  await page.reload();
  await expect(page.getByLabel("Name or title")).toHaveValue("Reyes");
  await page.getByRole("link", { name: /Daniela Reyes/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Daniela Reyes");

  await page.goto("people/?role=partners");
  await expect(page.getByRole("link", { name: /Marty Farrell/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Gideon Morhenn/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Theo Okafor/ })).toHaveCount(0);
});

test("profiles explain how to book, except for staff on leave", async ({ page }) => {
  await page.goto("people/daniela-reyes/");
  await expect(page.getByRole("heading", { name: "Arrange a consultation" })).toBeVisible();
  await page.goto("people/samuel-brandt/");
  await expect(page.locator(".notice-warn", { hasText: "currently on leave" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Arrange a consultation" })).toHaveCount(0);
});

test("articles can be searched, filtered by tag and read", async ({ page }) => {
  await page.goto("news/");
  await page.getByRole("textbox", { name: "Search articles" }).fill("traffic");
  await expect(page.getByText("1 article", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: /Traffic stops in Los Santos/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Traffic stops");
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute("content", "article");
  await page.getByRole("link", { name: "#police" }).click();
  await expect(page).toHaveURL(/news\/\?tag=police$/);
  await expect(page.getByText("1 article", { exact: true })).toBeVisible();
});

test("FAQ filters by category and keyword", async ({ page }) => {
  await page.goto("faq/");
  await page.getByRole("navigation", { name: "FAQ categories" }).getByRole("link", { name: "Appointments" }).click();
  await expect(page.getByText("What time zone are appointment times in?")).toBeVisible();
  await expect(page.getByText("How do I apply to work at the firm?")).toHaveCount(0);
  await page.goto("faq/?q=charge");
  await expect(page.getByText("Is there a charge for an initial consultation?")).toBeVisible();
});

test("careers show application instructions; closed vacancies say so", async ({ page }) => {
  await page.goto("careers/");
  await page.getByRole("link", { name: /Paralegal Support attorneys/ }).click();
  await expect(page.getByRole("heading", { name: "How to apply" })).toBeVisible();
  await page.goto("careers/receptionist/");
  await expect(page.getByText(/This vacancy is closed/)).toBeVisible();
});

test("missing pages, drafts and hidden profiles return the 404 page", async ({ page, request }) => {
  for (const path of ["no-such-page/", "people/robert-hale/", "news/updated-office-hours-autumn/", "careers/investigator/"]) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(404);
    await expect(page.getByRole("heading", { name: "We could not find that page" })).toBeVisible();
  }
  const sitemap = await (await request.get("sitemap.xml")).text();
  expect(sitemap).toContain("https://example.github.io/farrell-morhenn-website/practice-areas/criminal-defence/");
  expect(sitemap).not.toContain("robert-hale");
});

test("no page links to features that do not exist on the static site", async ({ page }) => {
  for (const path of ["./", "contact/", "people/marty-farrell/", "careers/paralegal/", "practice-areas/family-law/"]) {
    await page.goto(path);
    const hrefs = await page.locator("a[href]").evaluateAll((as) => as.map((a) => a.getAttribute("href")!));
    for (const h of hrefs) expect(h, `${path} links to ${h}`).not.toMatch(/\/(admin|portal|enquiry|consultation)(\/|$)/);
    expect(await page.locator("form[method=post], input[type=file]").count()).toBe(0);
  }
});

test("pages read like a real firm's website, with no out-of-character wording", async ({ page }) => {
  const banned = /in[- ]character|out[- ]of[- ]character|\bOOC\b|roleplay|fictional|GTA|real[- ]world|Calder|Whitmore/i;
  for (const path of [
    "./", "about/", "practice-areas/", "practice-areas/immigration-and-residency/", "people/", "people/marty-farrell/",
    "people/gideon-morhenn/", "people/daniela-reyes/", "news/", "news/traffic-stops-in-los-santos-what-to-expect/",
    "faq/", "careers/", "careers/paralegal/", "contact/", "privacy/", "terms/", "disclaimer/",
  ]) {
    await page.goto(path);
    const text = await page.locator("body").innerText();
    expect(text.match(banned)?.[0], path).toBeUndefined();
    const title = await page.title();
    expect(title.match(banned)?.[0], `${path} title`).toBeUndefined();
  }
});
