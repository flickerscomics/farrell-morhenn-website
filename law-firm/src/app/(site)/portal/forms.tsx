"use client";

import { ActionForm, ACheckbox, AFile, AInput, ASubmit, ATextarea } from "@/components/admin/action-form";
import {
  clientChangePasswordAction,
  clientLoginAction,
  clientMessageAction,
  clientResetAction,
  clientUploadAction,
  registerAction,
} from "./actions";

export function ClientLoginForm({ next }: { next: string }) {
  return (
    <ActionForm action={clientLoginAction}>
      <input type="hidden" name="next" value={next} />
      <AInput name="email" label="Email" type="email" required />
      <AInput name="password" label="Password" type="password" required />
      <div><ASubmit>Sign in</ASubmit></div>
    </ActionForm>
  );
}

export function RegisterForm() {
  return (
    <ActionForm action={registerAction}>
      <AInput name="characterName" label="Character name" required maxLength={80} />
      <AInput name="email" label="Email" type="email" required help="Used only to sign in to this portal. You may use an address created for roleplay." />
      <AInput name="password" label="Password" type="password" required help="At least 12 characters, mixing letters with numbers or symbols." />
      <AInput name="confirmPassword" label="Confirm password" type="password" required />
      <ACheckbox name="acknowledge" label="I understand this portal is part of a fictional roleplay and I will not upload genuine confidential or real-world personal material." />
      <div><ASubmit>Create account</ASubmit></div>
    </ActionForm>
  );
}

export function ClientResetForm({ token }: { token: string }) {
  return (
    <ActionForm action={clientResetAction}>
      <input type="hidden" name="token" value={token} />
      <AInput name="password" label="New password" type="password" required />
      <AInput name="confirmPassword" label="Confirm new password" type="password" required />
      <div><ASubmit>Set password</ASubmit></div>
    </ActionForm>
  );
}

export function ClientPasswordForm() {
  return (
    <ActionForm action={clientChangePasswordAction}>
      <AInput name="current" label="Current password" type="password" required />
      <AInput name="password" label="New password" type="password" required />
      <AInput name="confirmPassword" label="Confirm new password" type="password" required />
      <div><ASubmit>Change password</ASubmit></div>
    </ActionForm>
  );
}

export function MessageForm({ matterId }: { matterId: string }) {
  return (
    <ActionForm action={clientMessageAction}>
      <input type="hidden" name="matterId" value={matterId} />
      <ATextarea name="body" label="Message to your legal team" required rows={4} maxLength={5000} help="Use this to send further information about your matter." />
      <div><ASubmit className="btn btn-primary btn-sm">Send message</ASubmit></div>
    </ActionForm>
  );
}

export function ClientUploadForm({ matterId, maxMb }: { matterId: string; maxMb: number }) {
  return (
    <ActionForm action={clientUploadAction} multipart>
      <input type="hidden" name="matterId" value={matterId} />
      <AFile name="file" label="Document" accept=".pdf,.txt,.jpg,.jpeg,.png,.webp" help={`PDF, TXT, JPEG, PNG or WebP up to ${maxMb} MB. In-character documents only.`} />
      <AInput name="description" label="What is this document?" maxLength={200} />
      <div><ASubmit className="btn btn-secondary btn-sm">Upload</ASubmit></div>
    </ActionForm>
  );
}
