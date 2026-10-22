import { expect, type Page } from "@playwright/test";

export const USERS = {
  admin: "e2e-admin@test.local",
  attorney: "e2e-attorney@test.local",
  receptionist: "e2e-reception@test.local",
  editor: "e2e-editor@test.local",
} as const;

export async function login(page: Page, who: keyof typeof USERS) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(USERS[who]);
  await page.getByLabel("Password").fill(process.env[`E2E_PASSWORD_${who.toUpperCase()}`]!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

/** Public forms reject submissions made faster than a human could (anti-spam). */
export async function humanPause(page: Page) {
  await page.waitForTimeout(2700);
}

/** A weekday at least `days` ahead, formatted for <input type="date">. */
export function weekdayAhead(days: number) {
  const d = new Date(Date.now() + days * 86400_000);
  while ([0, 6].includes(d.getUTCDay())) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
