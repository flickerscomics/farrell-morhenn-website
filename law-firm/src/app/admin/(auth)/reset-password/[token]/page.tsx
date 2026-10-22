import Link from "next/link";
import { prisma } from "@/lib/db";
import { sha256 } from "@/server/security";
import { ResetForm } from "./reset-form";

export const metadata = { title: "Reset password" };

export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const record =
    token.length >= 20 && token.length <= 100
      ? await prisma.passwordResetToken.findUnique({ where: { tokenHash: sha256(token) }, include: { user: { select: { name: true } } } })
      : null;
  const valid = record && !record.usedAt && record.expiresAt > new Date() && record.user;
  return (
    <div className="auth-card">
      <h1>Choose a new password</h1>
      {valid ? (
        <>
          <p className="muted">Setting a new password for {record.user!.name}. This link can only be used once.</p>
          <ResetForm token={token} />
        </>
      ) : (
        <>
          <div className="notice notice-error"><p>This reset link is invalid, has expired or has already been used.</p></div>
          <p style={{ marginTop: "1rem" }}><Link href="/admin/login">Go to sign-in</Link></p>
        </>
      )}
    </div>
  );
}
