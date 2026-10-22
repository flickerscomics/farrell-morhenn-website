import "server-only";
import { cookies } from "next/headers";

export const FLASH_COOKIE = "cw_flash";

/**
 * Queues a one-time notification shown after the next navigation. The cookie
 * is readable by the client Toaster, which displays it as text and clears it.
 */
export async function setFlash(message: string, tone: "success" | "error" | "info" = "success") {
  // base64url keeps the value cookie-safe without relying on URL encoding.
  (await cookies()).set(FLASH_COOKIE, Buffer.from(JSON.stringify({ message, tone })).toString("base64url"), {
    path: "/",
    maxAge: 30,
    sameSite: "lax",
    httpOnly: false,
  });
}
