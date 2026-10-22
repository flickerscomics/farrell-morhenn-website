import { expect, test } from "@playwright/test";

test("mobile menu opens and closes with the button, Escape and navigation", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByRole("navigation", { name: "Main" })).toBeHidden();
  const toggle = page.getByRole("button", { name: "Menu" });
  await toggle.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(dialog).toBeHidden();
  await toggle.click();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await toggle.click();
  await dialog.getByRole("link", { name: "Practice Areas" }).click();
  await expect(page).toHaveURL(/\/practice-areas\/$/);
  await expect(page.getByRole("dialog")).toBeHidden();
});

test("pages do not scroll horizontally on a phone", async ({ page }) => {
  for (const path of ["./", "people/", "news/", "contact/", "practice-areas/family-law/", "careers/paralegal/", "press/", "press/paleto-bay-legal-clinics/"]) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${path} overflows horizontally`).toBeLessThanOrEqual(1);
  }
});
