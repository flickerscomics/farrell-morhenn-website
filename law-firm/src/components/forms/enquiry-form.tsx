"use client";

import { useMemo, useState } from "react";
import { submitEnquiryAction } from "@/app/(site)/actions";
import { Acknowledge, FileField, FormMessage, SelectField, SpamGuards, TextArea, TextField } from "@/components/fields";
import { usePublicForm } from "@/components/use-public-form";
import { INTAKE_PREFIX, maxLengthFor, validateIntakeAnswers, type IntakeField } from "@/lib/intake";
import { enquirySchema, zodFieldErrors, type FieldErrors } from "@/lib/validation";

type Area = { id: string; slug: string; name: string; intakeFields: IntakeField[] };
type Attorney = { id: string; fullName: string; title: string; practiceAreaIds: string[] };

export function EnquiryForm({
  token,
  areas,
  attorneys,
  contactMethods,
  notice,
  initialAreaId = "",
  maxUploadMb,
}: {
  token: string;
  areas: Area[];
  attorneys: Attorney[];
  contactMethods: string[];
  notice: string;
  initialAreaId?: string;
  maxUploadMb: number;
}) {
  const [areaId, setAreaId] = useState(initialAreaId);
  const area = useMemo(() => areas.find((a) => a.id === areaId), [areas, areaId]);

  const validate = (values: Record<string, string>): FieldErrors => {
    const parsed = enquirySchema.safeParse(values);
    const errors = parsed.success ? {} : zodFieldErrors(parsed.error);
    if (area) {
      const intake: Record<string, string> = {};
      for (const [k, v] of Object.entries(values)) if (k.startsWith(INTAKE_PREFIX)) intake[k.slice(INTAKE_PREFIX.length)] = v;
      const res = validateIntakeAnswers(area.intakeFields, intake);
      if (!res.ok) Object.assign(errors, res.errors);
    }
    return errors;
  };

  const { state, formAction, onSubmit, errors, pending } = usePublicForm(submitEnquiryAction, validate);
  const v = state.values ?? {};
  const relevantAttorneys = area ? attorneys.filter((a) => a.practiceAreaIds.includes(area.id)) : attorneys;
  const attorneyOptions = (relevantAttorneys.length ? relevantAttorneys : attorneys).map((a) => ({
    value: a.id,
    label: `${a.fullName} — ${a.title}`,
  }));

  return (
    <form className="form" action={formAction} onSubmit={onSubmit} noValidate encType="multipart/form-data">
      <SpamGuards token={state.token ?? token} />
      <div className="notice notice-warn" role="note">
        <p>
          <strong>Roleplay notice.</strong> {notice}
        </p>
      </div>
      <FormMessage message={state.message} ok={state.ok} />

      <fieldset>
        <legend>About you</legend>
        <div className="form-grid">
          <TextField name="characterName" label="Character name" required maxLength={80} autoComplete="off" defaultValue={v.characterName} error={errors.characterName} />
          <SelectField
            name="preferredContact"
            label="Preferred contact method"
            options={contactMethods.map((m) => ({ value: m, label: m }))}
            defaultValue={v.preferredContact}
            error={errors.preferredContact}
          />
          <TextField
            name="contactDetails"
            label="In-character contact details"
            className="full"
            maxLength={200}
            autoComplete="off"
            defaultValue={v.contactDetails}
            error={errors.contactDetails}
            help="For example an in-game phone number or forum username. Do not enter real-world contact details."
          />
        </div>
      </fieldset>

      <fieldset>
        <legend>Your matter</legend>
        <div className="form-grid">
          <SelectField
            name="practiceAreaId"
            label="Practice area"
            options={areas.map((a) => ({ value: a.id, label: a.name }))}
            placeholder="Not sure / general enquiry"
            value={areaId}
            onChange={setAreaId}
            error={errors.practiceAreaId}
            help={area?.intakeFields.length ? "A few extra questions for this practice area appear below." : undefined}
          />
          <SelectField
            name="preferredAttorneyId"
            label="Preferred attorney"
            options={attorneyOptions}
            placeholder="No preference"
            defaultValue={v.preferredAttorneyId}
            error={errors.preferredAttorneyId}
          />
          <TextField name="subject" label="Subject" required className="full" maxLength={140} defaultValue={v.subject} error={errors.subject} />
          <TextArea
            name="description"
            label="Describe the matter"
            required
            className="full"
            maxLength={5000}
            rows={7}
            defaultValue={v.description}
            error={errors.description}
            help="What happened, when, who was involved (in character) and what help you would like. General details are enough."
          />
        </div>
      </fieldset>

      {area && area.intakeFields.length > 0 && (
        <fieldset>
          <legend>{area.name}: a few more details</legend>
          <div className="form-grid">
            {area.intakeFields.map((f) => {
              const name = INTAKE_PREFIX + f.key;
              const common = { name, label: f.label, required: f.required, error: errors[name], help: f.help || undefined, defaultValue: v[name] };
              if (f.type === "textarea") return <TextArea key={name} {...common} className="full" rows={4} maxLength={maxLengthFor("textarea")} />;
              if (f.type === "select")
                return <SelectField key={name} {...common} options={f.options.map((o) => ({ value: o, label: o }))} />;
              if (f.type === "date") return <TextField key={name} {...common} type="date" />;
              return <TextField key={name} {...common} maxLength={maxLengthFor("text")} />;
            })}
          </div>
        </fieldset>
      )}

      <fieldset>
        <legend>Appointment preference</legend>
        <div className="form-grid">
          <TextField name="preferredDate" type="date" label="Preferred date" defaultValue={v.preferredDate} error={errors.preferredDate} />
          <TextField name="preferredTime" type="time" step={900} label="Preferred time (Pacific)" defaultValue={v.preferredTime} error={errors.preferredTime} />
        </div>
        <p className="help" style={{ marginTop: "0.75rem" }}>
          This is only a preference. To request a specific consultation slot, use the consultation request form.
        </p>
      </fieldset>

      <FileField
        name="attachment"
        label="Supporting document"
        accept=".pdf,.txt,.jpg,.jpeg,.png,.webp"
        error={errors.attachment}
        help={`Optional. PDF, TXT, JPEG, PNG or WebP up to ${maxUploadMb} MB. In-character documents only.`}
      />

      <Acknowledge error={errors.acknowledge}>
        I understand this is a fictional roleplay service and I have not included genuine confidential material or
        real-world personal information.
      </Acknowledge>

      <div className="row">
        <button type="submit" className="btn btn-primary" disabled={pending} aria-disabled={pending}>
          {pending ? (
            <>
              <span className="spinner" aria-hidden="true" /> Sending…
            </>
          ) : (
            "Send enquiry"
          )}
        </button>
        <span className="small muted">You will receive a reference number straight away.</span>
      </div>
    </form>
  );
}
