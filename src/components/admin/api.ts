"use client";

// Talks to the admin API (/api/*, Cloudflare Pages Functions). Keeps the
// session's CSRF token and sends it with every change.

import type { Permission } from "@/server/permissions";
import type { Field } from "@/server/schema";

export interface Me {
  id: string;
  username: string;
  name: string;
  roleId: string;
  roleName: string;
  isAdmin: boolean;
  personSlug: string | null;
  permissions: Permission[];
}

export interface SectionInfo {
  name: string;
  label: string;
  group: string;
  kind: "file" | "collection";
  primary: string;
  fields: Field[];
  canCreate: boolean;
  restricted: string[];
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

let csrf = "";

export function setCsrf(token: string) {
  csrf = token;
}

export async function api<T = Record<string, unknown>>(method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/${path}`, {
      method,
      credentials: "same-origin",
      cache: "no-store",
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(method !== "GET" ? { "X-CSRF-Token": csrf } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "Couldn't reach the server. Check your connection and try again.");
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (typeof data.csrf === "string") csrf = data.csrf;
  if (!res.ok) {
    const fallback = res.status === 404 ? "The admin service isn't available here." : "Something went wrong. Please try again.";
    throw new ApiError(res.status, typeof data.error === "string" ? data.error : fallback);
  }
  return data as T;
}

export function can(me: Me | null, p: Permission) {
  return !!me && me.permissions.includes(p);
}

export function when(ms: number | null | undefined) {
  if (!ms) return "";
  return new Date(ms).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/** Reads a file chosen in the browser as base64 (without the data: prefix). */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^,]*,/, ""));
    reader.onerror = () => reject(new Error("The file couldn't be read."));
    reader.readAsDataURL(file);
  });
}
