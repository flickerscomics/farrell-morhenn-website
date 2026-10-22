import "server-only";
import type { ClientAccount, Upload } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import type { StaffActor } from "./auth";
import { findAccessibleMatter } from "./services/matters";

/**
 * Decides whether a signed-in staff member or portal client may download a
 * stored file. Every rule fails closed.
 */
export async function canAccessUpload(upload: Upload, staff: StaffActor | null, client: ClientAccount | null) {
  if (upload.visibility === "PUBLIC") return true;

  if (staff) {
    const p = staff.permissions;
    switch (upload.purpose) {
      case "ENQUIRY_ATTACHMENT":
        if (hasPermission(p, "enquiries.view")) return true;
        break;
      case "APPLICATION_ATTACHMENT":
        if (hasPermission(p, "recruitment.view")) return true;
        break;
      case "MATTER_DOCUMENT":
      case "CLIENT_UPLOAD":
        if (upload.matterId && hasPermission(p, "matters.documents") && (await findAccessibleMatter(staff, upload.matterId))) return true;
        break;
      default:
        if (hasPermission(p, "media.manage")) return true;
    }
  }

  if (client && upload.matterId && (upload.purpose === "MATTER_DOCUMENT" || upload.purpose === "CLIENT_UPLOAD")) {
    const matter = await prisma.matter.findFirst({ where: { id: upload.matterId, clientAccountId: client.id } });
    if (matter && (upload.clientVisible || upload.uploadedByClientId === client.id)) return true;
  }
  return false;
}
