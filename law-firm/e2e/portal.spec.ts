import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test("client portal: registration, matter sharing, messaging and isolation", async ({ page, browser }) => {
  // 1. A client registers.
  await page.goto("/portal/register");
  await page.getByLabel("Character name").fill("Luis Alvarez");
  await page.getByLabel("Email").fill("luis@roleplay.test");
  await page.getByRole("textbox", { name: "Password", exact: true }).fill("Strong-passw0rd-1");
  await page.getByLabel("Confirm password").fill("Strong-passw0rd-1");
  await page.getByLabel(/fictional roleplay/).check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Welcome, Luis Alvarez");
  await expect(page.getByText("No matters have been shared with you yet")).toBeVisible();

  // 2. Staff open a matter, add a private note and a shared update, and share it.
  const staff = await browser.newPage();
  await login(staff, "attorney");
  await staff.goto("/admin/matters/new");
  await staff.getByLabel("Matter title").fill("State v. Alvarez");
  await staff.getByLabel("Client (character) name").fill("Luis Alvarez");
  await staff.getByLabel("Status").selectOption("ACTIVE");
  await staff.getByRole("button", { name: "Open matter" }).click();
  await expect(staff.getByRole("heading", { level: 1 })).toHaveText("State v. Alvarez");
  const matterUrl = staff.url();
  await staff.getByLabel("Add a note").fill("PRIVATE strategy note");
  await staff.getByRole("button", { name: "Add note" }).click();
  await expect(staff.locator(".note-body", { hasText: "PRIVATE strategy note" })).toBeVisible();
  const openEntryForm = async () => {
    if (!(await staff.getByRole("button", { name: "Add to timeline" }).isVisible())) await staff.getByText("Add an entry").click();
  };
  await openEntryForm();
  await staff.getByLabel("Date and time (office time)").fill("2030-02-01T09:30");
  await staff.getByRole("textbox", { name: "Title", exact: true }).fill("Arraignment scheduled");
  await staff.getByLabel("Show to the client in the portal").check();
  await staff.getByRole("button", { name: "Add to timeline" }).click();
  await expect(staff.locator("strong", { hasText: "Arraignment scheduled" })).toBeVisible();
  await openEntryForm();
  await staff.getByLabel("Date and time (office time)").fill("2030-02-02T09:30");
  await staff.getByRole("textbox", { name: "Title", exact: true }).fill("INTERNAL ONLY entry");
  await staff.getByRole("button", { name: "Add to timeline" }).click();
  await expect(staff.locator("strong", { hasText: "INTERNAL ONLY entry" })).toBeVisible();
  await staff.getByLabel("Client portal email").fill("luis@roleplay.test");
  await staff.getByRole("button", { name: "Save portal access" }).click();
  await expect(staff.getByText(/Shared with/)).toBeVisible();

  // 3. The client sees only what was shared and can message the team.
  await page.goto("/portal");
  await page.getByRole("link", { name: /State v. Alvarez/ }).click();
  await expect(page.getByText("Arraignment scheduled")).toBeVisible();
  await expect(page.getByText("INTERNAL ONLY entry")).toHaveCount(0);
  await expect(page.getByText("PRIVATE strategy note")).toHaveCount(0);
  const portalMatterUrl = page.url();
  await page.getByLabel("Message to your legal team").fill("I found the citation paperwork.");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText("I found the citation paperwork.")).toBeVisible();

  await staff.goto(matterUrl);
  await expect(staff.locator(".note-body", { hasText: "I found the citation paperwork." })).toBeVisible();

  // 4. A different client cannot open the matter.
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await otherPage.goto("/portal/register");
  await otherPage.getByLabel("Character name").fill("Nosy Neighbour");
  await otherPage.getByLabel("Email").fill("nosy@roleplay.test");
  await otherPage.getByRole("textbox", { name: "Password", exact: true }).fill("Strong-passw0rd-2");
  await otherPage.getByLabel("Confirm password").fill("Strong-passw0rd-2");
  await otherPage.getByLabel(/fictional roleplay/).check();
  await otherPage.getByRole("button", { name: "Create account" }).click();
  await expect(otherPage.getByRole("heading", { level: 1 })).toHaveText("Welcome, Nosy Neighbour");
  const res = await otherPage.goto(portalMatterUrl);
  expect(res?.status()).toBe(404);
  await expect(otherPage.getByText("State v. Alvarez")).toHaveCount(0);
  await other.close();
  await staff.close();
});
