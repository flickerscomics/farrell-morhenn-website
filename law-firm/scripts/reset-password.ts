// Resets a staff account's password from the command line (for when no
// administrator can sign in). Prompts for the new password without echo.
//
//   npm run admin:reset-password -- --email you@example.com

import { PrismaClient } from "@prisma/client";
import { emailSchema, passwordSchema } from "../src/lib/validation";
import { hashPassword } from "../src/server/passwords";
import { arg, ask, askHidden } from "./cli-utils";

const prisma = new PrismaClient();

async function main() {
  const email = emailSchema.parse(arg("email") ?? (await ask("Account email: ")));
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("No staff account has that email.");
  const password = await askHidden("New password (min 12 characters): ");
  if (password !== (await askHidden("Confirm password: "))) throw new Error("Passwords do not match.");
  const check = passwordSchema.safeParse(password);
  if (!check.success) throw new Error(check.error.issues[0].message);
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(password), isActive: true, mustChangePassword: false } }),
    prisma.session.deleteMany({ where: { userId: user.id } }),
    prisma.auditEvent.create({ data: { actorType: "SYSTEM", actorLabel: "CLI", action: "auth.password_reset", entityType: "User", entityId: user.id, summary: `Password reset from the command line for ${email}` } }),
  ]);
  console.log(`Password updated for ${email}. Existing sessions were signed out.`);
}

main()
  .catch((e) => {
    console.error(`Error: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
