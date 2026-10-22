// Creates (or promotes) a super administrator account.
//
//   npm run admin:create
//   npm run admin:create -- --email you@example.com --name "Your Name"
//
// The password is prompted for without echo. For unattended setups you may
// supply ADMIN_PASSWORD in the environment instead; never commit it.

import { PrismaClient } from "@prisma/client";
import { passwordSchema, emailSchema } from "../src/lib/validation";
import { hashPassword } from "../src/server/passwords";
import { arg, ask, askHidden } from "./cli-utils";

const prisma = new PrismaClient();

async function main() {
  const role = await prisma.role.findUnique({ where: { key: "super_admin" } });
  if (!role) throw new Error("Roles are missing. Run `npm run db:deploy && npm run db:seed` first.");

  const email = emailSchema.parse(arg("email") ?? (await ask("Administrator email: ")));
  const name = (arg("name") ?? (await ask("Full name: "))).trim() || "Administrator";

  let password = process.env.ADMIN_PASSWORD ?? "";
  if (!password) {
    password = await askHidden("Password (min 12 characters): ");
    const confirm = await askHidden("Confirm password: ");
    if (password !== confirm) throw new Error("Passwords do not match.");
  }
  const check = passwordSchema.safeParse(password);
  if (!check.success) throw new Error(check.error.issues[0].message);

  const passwordHash = await hashPassword(password);
  const existing = await prisma.user.findUnique({ where: { email } });
  const user = existing
    ? await prisma.user.update({ where: { email }, data: { name, roleId: role.id, passwordHash, isActive: true, mustChangePassword: false } })
    : await prisma.user.create({ data: { email, name, roleId: role.id, passwordHash } });
  await prisma.auditEvent.create({
    data: { actorType: "SYSTEM", actorLabel: "CLI", action: existing ? "user.promoted" : "user.created", entityType: "User", entityId: user.id, summary: `Super administrator ${existing ? "updated" : "created"} from the command line: ${email}` },
  });
  console.log(`\n${existing ? "Updated" : "Created"} super administrator ${email}. Sign in at /admin/login.`);
}

main()
  .catch((e) => {
    console.error(`Error: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
