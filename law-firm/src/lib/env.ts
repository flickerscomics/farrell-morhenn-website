import path from "node:path";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}. See .env.example.`);
  return value;
}

export const env = {
  get appSecret(): string {
    const secret = required("APP_SECRET");
    if (secret.length < 32) throw new Error("APP_SECRET must be at least 32 characters long.");
    return secret;
  },
  get siteUrl(): string {
    return (process.env.SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
  },
  get storageDir(): string {
    return path.resolve(process.env.STORAGE_DIR || "./storage");
  },
  get maxUploadBytes(): number {
    const mb = Number(process.env.MAX_UPLOAD_MB || "8");
    return Math.max(1, Math.min(Number.isFinite(mb) ? mb : 8, 25)) * 1024 * 1024;
  },
  get secureCookies(): boolean {
    return process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "true";
  },
};
