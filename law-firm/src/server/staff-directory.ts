import "server-only";
import { prisma } from "@/lib/db";
import { hasAnyPermission, type Permission } from "@/lib/permissions";

/** Active staff accounts holding any of the given permissions (for assignment pickers). */
export async function staffWith(...permissions: Permission[]) {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, role: { select: { name: true, permissions: true } } },
  });
  return users
    .filter((u) => hasAnyPermission(u.role.permissions, permissions))
    .map((u) => ({ id: u.id, name: u.name, roleName: u.role.name }));
}
