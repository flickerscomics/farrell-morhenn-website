"use client";

import { ActionForm, AInput, ASelect, ASubmit, ATextarea } from "@/components/admin/action-form";
import { createAppointmentAction } from "../actions";

export function NewAppointmentForm({ attorneys, types, methods, duration }: { attorneys: { id: string; fullName: string }[]; types: string[]; methods: string[]; duration: number }) {
  return (
    <ActionForm action={createAppointmentAction}>
      <div className="form-grid">
        <AInput name="characterName" label="Client (character) name" required maxLength={80} />
        <AInput name="contactDetails" label="Contact details" maxLength={200} />
        <ASelect name="preferredContact" label="Preferred contact" options={methods.map((m) => ({ value: m, label: m }))} placeholder="—" />
        <ASelect name="attorneyId" label="Attorney" options={attorneys.map((a) => ({ value: a.id, label: a.fullName }))} placeholder="General" />
        <ASelect name="consultationType" label="Type" required options={types.map((t) => ({ value: t, label: t }))} defaultValue={types[0]} />
        <AInput name="start" label="Date and time (office time)" type="datetime-local" required />
        <AInput name="durationMinutes" label="Duration (minutes)" type="number" defaultValue={duration} required />
        <AInput name="location" label="Location" maxLength={200} defaultValue="Arcadius Business Center, Suite 2210" />
        <ATextarea name="reason" label="Reason" required rows={3} maxLength={2000} className="full" />
      </div>
      <div><ASubmit>Book appointment</ASubmit></div>
    </ActionForm>
  );
}
