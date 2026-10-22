import { expect, test } from "@playwright/test";
import { humanPause, weekdayAhead } from "./helpers";

test.describe("public forms", () => {
  test("intake form validates, saves and shows a reference; resubmission does not duplicate", async ({ page }) => {
    await page.goto("/enquiry?area=criminal-defence");
    await page.getByRole("button", { name: "Send enquiry" }).click();
    await expect(page.getByText("Character name must be at least 2 characters.")).toBeVisible();
    await expect(page.getByText("Current stage is required.")).toBeVisible();

    await page.getByLabel("Character name").fill("Vincent Moreau");
    await page.getByLabel("Subject").fill("Arrested after a traffic stop");
    await page.getByLabel("Describe the matter").fill("I was stopped on Strawberry Avenue and my car was searched without consent.");
    await page.getByLabel("In general terms, what is being alleged?").fill("Possession of a prohibited item");
    await page.getByLabel("Current stage").selectOption("Charges filed");
    await page.getByLabel("What assistance are you looking for?").fill("Representation at the arraignment");
    await page.getByLabel(/I understand this is a fictional roleplay service/).check();
    await humanPause(page);
    await page.getByRole("button", { name: "Send enquiry" }).click();

    await expect(page).toHaveURL(/\/confirmation\?type=enquiry&ref=ENQ-/);
    const reference = (await page.locator(".reference-box").textContent())!.trim();
    expect(reference).toMatch(/^ENQ-\d{4}-[A-Z0-9]{6}$/);

    // Sending the same enquiry again (e.g. from another tab) links to the original.
    await page.goto("/enquiry");
    await page.getByLabel("Character name").fill("Vincent Moreau");
    await page.getByLabel("Subject").fill("Arrested after a traffic stop");
    await page.getByLabel("Describe the matter").fill("I was stopped on Strawberry Avenue and my car was searched without consent.");
    await page.getByLabel(/I understand this is a fictional roleplay service/).check();
    await humanPause(page);
    await page.getByRole("button", { name: "Send enquiry" }).click();
    await expect(page).toHaveURL(/duplicate=1/);
    await expect(page.locator(".reference-box")).toHaveText(reference);
    await expect(page.getByText(/already received this submission/)).toBeVisible();
  });

  test("attachments of a disallowed type are rejected with a clear message", async ({ page }) => {
    await page.goto("/contact");
    await page.getByLabel("Character name").fill("Ada Quill");
    await page.getByLabel("Subject").fill("Question about a contract");
    await page.getByLabel("Describe the matter").fill("My supplier stopped delivering goods last week.");
    await page.getByLabel("Supporting document").setInputFiles({ name: "virus.pdf", mimeType: "application/pdf", buffer: Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03]) });
    await page.getByLabel(/I understand this is a fictional roleplay service/).check();
    await humanPause(page);
    await page.getByRole("button", { name: "Send enquiry" }).click();
    await expect(page.getByText(/Unsupported file type/)).toBeVisible();
    await expect(page).toHaveURL(/\/contact$/);
    // The visitor's answers are kept.
    await expect(page.getByLabel("Subject")).toHaveValue("Question about a contract");
  });

  test("consultation requests only offer office-hour slots and are recorded as requests", async ({ page }) => {
    await page.goto("/consultation?attorney=theo-okafor");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Theo Okafor");
    await page.getByLabel("Character name").fill("Jordan Hayes");
    await page.getByLabel("Requested date").fill(weekdayAhead(4));
    const times = page.getByLabel("Requested time");
    await expect(times.locator("option", { hasText: "9:00 AM" })).toHaveCount(1);
    await expect(times.locator("option", { hasText: "8:00 PM" })).toHaveCount(0);
    await times.selectOption("10:00");
    await page.getByLabel("Reason for the appointment").fill("Discuss a freeway collision claim.");
    await page.getByLabel(/I understand this is a fictional roleplay service/).check();
    await humanPause(page);
    await page.getByRole("button", { name: "Request consultation" }).click();
    await expect(page).toHaveURL(/type=appointment&ref=APT-/);
    await expect(page.getByText(/This is a request, not a confirmed appointment/)).toBeVisible();
  });

  test("recruitment applications receive a reference; closed vacancies refuse applications", async ({ page }) => {
    await page.goto("/careers");
    await page.getByRole("link", { name: /Paralegal Support attorneys/ }).click();
    await page.getByLabel("Character name").fill("Sam Tran");
    await page.getByLabel("In-character contact details").fill("555-0123");
    await page.getByLabel("Relevant experience").fill("Two years as a legal secretary in Rockford Hills.");
    await page.getByLabel("Availability").fill("Weekday evenings, Pacific Time");
    await page.getByLabel("Application statement").fill("I enjoy careful, detailed work and would like to support the litigation team with filings and deadlines.");
    await page.getByLabel(/in-character application to a fictional firm/).check();
    await humanPause(page);
    await page.getByRole("button", { name: "Submit application" }).click();
    await expect(page).toHaveURL(/type=application&ref=APP-/);

    await page.goto("/careers/receptionist");
    await expect(page.getByText(/This vacancy is closed/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Submit application" })).toHaveCount(0);
  });

  test("instant bot submissions are rejected", async ({ page }) => {
    await page.goto("/enquiry");
    await page.getByLabel("Character name").fill("Speedy Bot");
    await page.getByLabel("Subject").fill("Fast submission");
    await page.getByLabel("Describe the matter").fill("This form was submitted immediately after loading.");
    await page.getByLabel(/I understand this is a fictional roleplay service/).check();
    await page.getByRole("button", { name: "Send enquiry" }).click();
    await expect(page.getByText(/Please check your details and submit again/)).toBeVisible();
  });
});
