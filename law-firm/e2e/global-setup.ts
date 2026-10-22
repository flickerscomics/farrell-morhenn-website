import { execSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/server/passwords";

// Resets the e2e database, seeds the sample content and creates one staff
// account per role with a random password shared with the tests via env.

export const E2E_USERS = {
  admin: { email: "e2e-admin@test.local", role: "super_admin", name: "E2E Admin" },
  attorney: { email: "e2e-attorney@test.local", role: "attorney", name: "E2E Attorney" },
  receptionist: { email: "e2e-reception@test.local", role: "receptionist", name: "E2E Reception" },
  editor: { email: "e2e-editor@test.local", role: "content_editor", name: "E2E Editor" },
} as const;

export default async function globalSetup() {
  const url = process.env.E2E_DATABASE_URL!;
  if (url === process.env.DATABASE_URL) throw new Error("E2E_DATABASE_URL must differ from DATABASE_URL.");
  // Safety net: only ever clear a database that is clearly the e2e one.
  const dbName = new URL(url).pathname.replace(/^\//, "");
  if (!dbName.includes("e2e")) throw new Error(`Refusing to reset "${dbName}": the e2e database name must contain "e2e".`);

  const env = { ...process.env, DATABASE_URL: url, SEED_DEMO_ACCOUNTS: "false" };
  execSync("npx prisma migrate deploy", { stdio: "inherit", env });
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    const tables = await prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables.map((t) => `"${t.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`);
    execSync("npx tsx prisma/seed.ts", { stdio: "inherit", env });
    fs.rmSync("storage-e2e", { recursive: true, force: true });

    for (const [key, u] of Object.entries(E2E_USERS)) {
      const password = `E2e-${crypto.randomBytes(9).toString("base64url")}`;
      const role = await prisma.role.findUniqueOrThrow({ where: { key: u.role } });
      await prisma.user.create({ data: { email: u.email, name: u.name, roleId: role.id, passwordHash: await hashPassword(password) } });
      process.env[`E2E_PASSWORD_${key.toUpperCase()}`] = password;
    }
  } finally {
    await prisma.$disconnect();
  }
}
