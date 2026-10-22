"use client";

import { submitApplicationAction } from "@/app/(site)/actions";
import { Acknowledge, FileField, FormMessage, SelectField, SpamGuards, TextArea, TextField } from "@/components/fields";
import { usePublicForm } from "@/components/use-public-form";
import { applicationSchema, zodFieldErrors } from "@/lib/validation";

export function ApplicationForm({
  token,
  vacancy,
  contactMethods,
  maxUploadMb,
}: {
  token: string;
  vacancy: { id: string; title: string } | null;
  contactMethods: string[];
  maxUploadMb: number;
}) {
  const validate = (values: Record<string, string>) => {
    const parsed = applicationSchema.safeParse(values);
    return parsed.success ? {} : zodFieldErrors(parsed.error);
  };
  const { state, formAction, onSubmit, errors, pending } = usePublicForm(submitApplicationAction, validate);
  const v = state.values ?? {};

  return (
    <form className="form" action={formAction} onSubmit={onSubmit} noValidate encType="multipart/form-data">
      <SpamGuards token={state.token ?? token} />
      {vacancy && <input type="hidden" name="vacancyId" value={vacancy.id} />}
      <FormMessage message={state.message} ok={state.ok} />
      {errors.vacancyId && <FormMessage message={errors.vacancyId} />}
      <div className="form-grid">
        <TextField name="characterName" label="Character name" required maxLength={80} autoComplete="off" defaultValue={v.characterName} error={errors.characterName} />
        <TextField
          name="desiredRole"
          label="Desired role"
          required
          maxLength={120}
          defaultValue={v.desiredRole ?? vacancy?.title ?? ""}
          error={errors.desiredRole}
        />
        <TextField
          name="contactDetails"
          label="In-character contact details"
          required
          maxLength={200}
          defaultValue={v.contactDetails}
          error={errors.contactDetails}
          help="An in-game phone number or forum username."
        />
        <SelectField
          name="preferredContact"
          label="Preferred contact method"
          options={contactMethods.map((m) => ({ value: m, label: m }))}
          defaultValue={v.preferredContact}
          error={errors.preferredContact}
        />
        <TextArea
          name="experience"
          label="Relevant experience"
          required
          className="full"
          rows={5}
          maxLength={4000}
          defaultValue={v.experience}
          error={errors.experience}
          help="In-character legal, administrative or customer-facing experience."
        />
        <TextField
          name="availability"
          label="Availability"
          required
          className="full"
          maxLength={500}
          defaultValue={v.availability}
          error={errors.availability}
          help="Days and times you are usually available, in Pacific Time."
        />
        <TextArea
          name="statement"
          label="Application statement"
          required
          className="full"
          rows={8}
          maxLength={6000}
          defaultValue={v.statement}
          error={errors.statement}
          help="Why you would like to join the firm and what you would bring (at least 50 characters)."
        />
        <FileField
          name="attachment"
          label="Supporting document"
          className="full"
          accept=".pdf,.txt,.jpg,.jpeg,.png,.webp"
          error={errors.attachment}
          help={`Optional in-character CV or writing sample. PDF, TXT or image, up to ${maxUploadMb} MB.`}
        />
      </div>
      <Acknowledge error={errors.acknowledge}>
        I understand this is an in-character application to a fictional firm and I have not included real-world personal
        information.
      </Acknowledge>
      <div>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? (
            <>
              <span className="spinner" aria-hidden="true" /> Submitting…
            </>
          ) : (
            "Submit application"
          )}
        </button>
      </div>
    </form>
  );
}
