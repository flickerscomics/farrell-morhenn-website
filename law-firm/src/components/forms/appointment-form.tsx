"use client";

import { useState } from "react";
import { submitAppointmentAction } from "@/app/(site)/actions";
import { Acknowledge, FormMessage, SelectField, SpamGuards, TextArea, TextField } from "@/components/fields";
import { usePublicForm } from "@/components/use-public-form";
import { isValidDateString, WEEKDAY_NAMES, type OfficeHours } from "@/lib/time";
import { appointmentSchema, zodFieldErrors } from "@/lib/validation";

type Attorney = { id: string; slug: string; fullName: string; title: string };

function slotsFor(date: string, hours: OfficeHours, slotMinutes: number, duration: number) {
  if (!isValidDateString(date)) return { closed: false, slots: [] as string[], weekday: -1 };
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  const day = hours[weekday];
  if (day.closed) return { closed: true, slots: [], weekday };
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  const slots: string[] = [];
  for (let m = toMin(day.open); m + duration <= toMin(day.close); m += slotMinutes) {
    slots.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
  }
  return { closed: false, slots, weekday };
}

function to12h(t: string) {
  const [h, m] = t.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

function TimeSelect({
  name,
  label,
  date,
  required,
  error,
  defaultValue,
  hours,
  slotMinutes,
  duration,
  tzName,
}: {
  name: string;
  label: string;
  date: string;
  required?: boolean;
  error?: string;
  defaultValue?: string;
  hours: OfficeHours;
  slotMinutes: number;
  duration: number;
  tzName: string;
}) {
  const { closed, slots, weekday } = slotsFor(date, hours, slotMinutes, duration);
  const help = !date
    ? "Choose a date first."
    : closed
      ? `The office is closed on ${WEEKDAY_NAMES[weekday]}s. Please choose another date.`
      : `Times are ${tzName}.`;
  return (
    <SelectField
      key={`${name}-${date}`}
      name={name}
      label={label}
      required={required}
      error={error}
      help={help}
      defaultValue={slots.includes(defaultValue ?? "") ? defaultValue : ""}
      placeholder={slots.length ? "Select a time…" : "No times available"}
      options={slots.map((s) => ({ value: s, label: to12h(s) }))}
    />
  );
}

export function AppointmentForm({
  token,
  attorneys,
  consultationTypes,
  contactMethods,
  officeHours,
  slotMinutes,
  durationMinutes,
  minDate,
  maxDate,
  tzName,
  timezone,
  initialAttorneyId = "",
  notice,
}: {
  token: string;
  attorneys: Attorney[];
  consultationTypes: string[];
  contactMethods: string[];
  officeHours: OfficeHours;
  slotMinutes: number;
  durationMinutes: number;
  minDate: string;
  maxDate: string;
  tzName: string;
  timezone: string;
  initialAttorneyId?: string;
  notice: string;
}) {
  const validate = (values: Record<string, string>) => {
    const parsed = appointmentSchema.safeParse(values);
    return parsed.success ? {} : zodFieldErrors(parsed.error);
  };
  const { state, formAction, onSubmit, errors, pending } = usePublicForm(submitAppointmentAction, validate);
  const v = state.values ?? {};
  const [date, setDate] = useState(v.requestedDate ?? "");
  const [altDate, setAltDate] = useState(v.alternativeDate ?? "");
  const timeProps = { hours: officeHours, slotMinutes, duration: durationMinutes, tzName };

  return (
    <form className="form" action={formAction} onSubmit={onSubmit} noValidate>
      <SpamGuards token={state.token ?? token} />
      <div className="notice notice-info" role="note">
        <p>
          Submitting this form <strong>requests</strong> a consultation. It is not confirmed until a member of staff
          contacts you. All times are {tzName} ({timezone}).
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
            help="For example an in-game phone number. Do not enter real-world contact details."
          />
        </div>
      </fieldset>

      <fieldset>
        <legend>Consultation</legend>
        <div className="form-grid">
          <SelectField
            name="consultationType"
            label="Consultation type"
            required
            options={consultationTypes.map((t) => ({ value: t, label: t }))}
            defaultValue={v.consultationType ?? consultationTypes[0]}
            placeholder={null}
            error={errors.consultationType}
          />
          <SelectField
            name="attorneyId"
            label="Attorney"
            options={attorneys.map((a) => ({ value: a.id, label: `${a.fullName} — ${a.title}` }))}
            placeholder="General consultation (first available)"
            defaultValue={v.attorneyId ?? initialAttorneyId}
            error={errors.attorneyId}
          />
          <div className="field">
            <label className="label" htmlFor="f-requestedDate">
              Requested date <span className="req" aria-hidden="true">*</span>
            </label>
            <input
              id="f-requestedDate"
              name="requestedDate"
              type="date"
              className="input"
              required
              min={minDate}
              max={maxDate}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-invalid={errors.requestedDate ? true : undefined}
              aria-describedby={errors.requestedDate ? "f-requestedDate-error" : undefined}
            />
            {errors.requestedDate && (
              <p className="error-text" id="f-requestedDate-error" role="alert">
                {errors.requestedDate}
              </p>
            )}
          </div>
          <TimeSelect name="requestedTime" label="Requested time" required date={date} error={errors.requestedTime} defaultValue={v.requestedTime} {...timeProps} />
          <div className="field">
            <label className="label" htmlFor="f-alternativeDate">
              Alternative date <span className="optional">(optional)</span>
            </label>
            <input
              id="f-alternativeDate"
              name="alternativeDate"
              type="date"
              className="input"
              min={minDate}
              max={maxDate}
              value={altDate}
              onChange={(e) => setAltDate(e.target.value)}
            />
          </div>
          <TimeSelect name="alternativeTime" label="Alternative time" date={altDate} error={errors.alternativeTime} defaultValue={v.alternativeTime} {...timeProps} />
          <TextArea
            name="reason"
            label="Reason for the appointment"
            required
            className="full"
            rows={4}
            maxLength={2000}
            defaultValue={v.reason}
            error={errors.reason}
            help="A sentence or two is enough."
          />
          <TextArea name="notes" label="Additional notes" className="full" rows={3} maxLength={2000} defaultValue={v.notes} error={errors.notes} />
        </div>
      </fieldset>

      <Acknowledge error={errors.acknowledge}>
        I understand this is a fictional roleplay service. {notice}
      </Acknowledge>

      <div className="row">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? (
            <>
              <span className="spinner" aria-hidden="true" /> Sending request…
            </>
          ) : (
            "Request consultation"
          )}
        </button>
        <span className="small muted">Appointments last about {durationMinutes} minutes.</span>
      </div>
    </form>
  );
}
