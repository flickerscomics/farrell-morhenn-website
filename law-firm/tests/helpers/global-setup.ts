import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export default function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("Set TEST_DATABASE_URL (a disposable database) to run the test suite.");
  if (url === process.env.DATABASE_URL && !url.includes("test")) {
    throw new Error("TEST_DATABASE_URL must not point at the main application database.");
  }
  execSync("npx prisma migrate deploy", { stdio: "inherit", env: { ...process.env, DATABASE_URL: url } });
  return () => fs.rmSync(path.resolve("storage-test"), { recursive: true, force: true });
}
