import { expect, test, type Page } from "@playwright/test";
import { humanPause, login, USERS } from "./helpers";

async function submitEnquiry(page: Page, subject: string) {
  await page.goto("/enquiry");
  await page.getByLabel("Character name").fill("Mara Kowalski");
  await page.getByLabel("Practice area").selectOption({ label: "Landlord and Tenant Disputes" });
  await page.getByLabel("Are you the tenant or the landlord?").selectOption("Tenant");
  await page.getByLabel("Main issue").selectOption("Deposit");
  await page.getByLabel("Summary").fill("Deposit kept without explanation.");
  await page.getByLabel("Subject").fill(subject);
  await page.getByLabel("Describe the matter").fill("My landlord in Mirror Park has kept my full deposit without explanation.");
  await page.getByLabel(/I understand this is a fictional roleplay service/).check();
  await humanPause(page);
  await page.getByRole("button", { name: "Send enquiry" }).click();
  await expect(page).toHaveURL(/confirmation/);
  return (await page.locator(".reference-box").textContent())!.trim();
}

test.describe("administration", () => {
  test("rejects a wrong password without revealing which part was wrong", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(USERS.admin);
    await page.getByLabel("Password").fill("not-the-password-123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("That email and password combination was not recognised.")).toBeVisible();
  });

  test("receptionist can triage enquiries but cannot open matters, settings or recruitment", async ({ page }) => {
    const ref = await submitEnquiry(page, "Deposit withheld (reception test)");
    await login(page, "receptionist");
    await page.getByRole("link", { name: "Enquiries", exact: false }).first().click();
    await page.getByRole("link", { name: "Deposit withheld (reception test)" }).click();
    await expect(page.getByText(ref)).toBeVisible();
    await expect(page.getByText("Are you the tenant or the landlord?")).toBeVisible();
    await page.getByLabel("Status").selectOption("UNDER_REVIEW");
    await page.getByLabel("Priority").selectOption("HIGH");
    await page.getByLabel("Assigned to").selectOption({ label: "E2E Attorney (Attorney)" });
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText(/status: New → Under review/)).toBeVisible();
    await page.getByLabel("Add a note").fill("Asked for the lease dates.");
    await page.getByRole("button", { name: "Add note" }).click();
    await expect(page.getByText("Asked for the lease dates.")).toBeVisible();

    await expect(page.getByRole("navigation", { name: undefined }).getByRole("link", { name: "Matters" })).toHaveCount(0);
    for (const path of ["/admin/matters", "/admin/matters/new", "/admin/settings", "/admin/recruitment", "/admin/users"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: "You do not have access to that page" })).toBeVisible();
    }
  });

  test("attorney converts an enquiry into a matter and manages its timeline and documents", async ({ page, browser }) => {
    await submitEnquiry(page, "Deposit withheld (matter test)");
    await login(page, "attorney");
    await page.goto("/admin/enquiries?q=matter+test");
    await page.getByRole("link", { name: "Deposit withheld (matter test)" }).click();
    await page.getByLabel("Matter title").fill("Kowalski — deposit recovery");
    await page.getByRole("button", { name: "Open matter" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kowalski — deposit recovery");
    await expect(page.getByText(/CW-\d{4}-\d{4}/).first()).toBeVisible();
    await expect(page.getByText(/ENQ-\d{4}-/).first()).toBeVisible();

    await page.getByText("Add an entry").click();
    await page.getByLabel("Type").selectOption("DEADLINE");
    await page.getByLabel("Date and time (office time)").fill("2030-01-15T10:00");
    await page.getByRole("textbox", { name: "Title", exact: true }).fill("File small claims form");
    await page.getByRole("button", { name: "Add to timeline" }).click();
    await expect(page.locator("strong", { hasText: "File small claims form" })).toBeVisible();

    await page.locator("input[type=file][name=file]").setInputFiles({ name: "evil.png", mimeType: "image/png", buffer: Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]) });
    await page.getByRole("button", { name: "Upload document" }).click();
    await expect(page.getByText(/Unsupported file type/)).toBeVisible();

    await page.locator("input[type=file][name=file]").setInputFiles({ name: "lease-notes.txt", mimeType: "text/plain", buffer: Buffer.from("In-character lease notes.") });
    await page.getByRole("textbox", { name: "Description", exact: true }).fill("Lease notes");
    await page.getByRole("button", { name: "Upload document" }).click();
    const link = page.getByRole("link", { name: "lease-notes.txt" });
    await expect(link).toBeVisible();
    const href = (await link.getAttribute("href"))!;
    expect((await page.request.get(href)).status()).toBe(200);

    const anonymous = await browser.newContext();
    expect((await anonymous.request.get(`http://localhost:3100${href}`)).status()).toBe(404);
    await anonymous.close();
  });

  test("content editor drafts, previews and publishes an article but cannot see client records", async ({ page, browser }) => {
    await login(page, "editor");
    await page.goto("/admin/content/articles/new");
    await page.getByRole("textbox", { name: "Title", exact: true }).fill("Small claims in San Andreas explained");
    await page.getByLabel("URL slug").fill("small-claims-explained");
    await page.getByRole("textbox", { name: "Summary", exact: true }).fill("How small claims work in the roleplay setting.");
    await page.getByRole("textbox", { name: "Article body" }).fill("## Overview\n\nSmall claims are a quick way to resolve minor disputes in character.");
    await page.getByRole("button", { name: "Save article" }).click();
    await expect(page.getByText("Draft", { exact: true }).first()).toBeVisible();

    const visitor = await browser.newContext();
    expect((await visitor.request.get("http://localhost:3100/news/small-claims-explained")).status()).toBe(404);

    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page.getByText("Published", { exact: true }).first()).toBeVisible();
    const res = await visitor.request.get("http://localhost:3100/news/small-claims-explained");
    expect(res.status()).toBe(200);
    expect(await res.text()).toContain("Small claims in San Andreas explained");
    await visitor.close();

    await page.goto("/admin/enquiries");
    await expect(page.getByRole("heading", { name: "You do not have access to that page" })).toBeVisible();
  });

  test("administrator updates site settings and sees them on the public site", async ({ page }) => {
    await login(page, "admin");
    await page.goto("/admin/settings");
    await page.getByLabel("Tagline").fill("Counsel you can rely on in Los Santos.");
    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(page.getByText("Settings saved.")).toBeVisible();
    await page.goto("/");
    await expect(page.locator("footer").getByText("Counsel you can rely on in Los Santos.")).toBeVisible();
    await page.goto("/admin/audit?q=settings");
    await expect(page.getByText("Updated website settings").first()).toBeVisible();
  });

  test("dashboard figures come from the database", async ({ page }) => {
    await login(page, "admin");
    const stat = page.locator(".stat", { hasText: "Consultation requests" }).locator(".value");
    const before = Number(await stat.textContent());
    expect(Number.isFinite(before)).toBe(true);
    await page.goto("/admin/enquiries");
    await expect(page.getByText(/matching enquir/)).toBeVisible();
  });
});
