import { SubmitButton } from "@/components/client-ui";
import { linkAppointmentAction } from "../actions";

export function LinkAppointmentForm({ enquiryId, appointments }: { enquiryId: string; appointments: { id: string; reference: string; characterName: string }[] }) {
  return (
    <form action={linkAppointmentAction} className="inline-form" style={{ marginTop: "1rem" }}>
      <input type="hidden" name="enquiryId" value={enquiryId} />
      <div className="field">
        <label className="label" htmlFor="appointmentId">Link an existing appointment</label>
        <select id="appointmentId" name="appointmentId" className="select select-sm" required defaultValue="">
          <option value="" disabled>Choose…</option>
          {appointments.map((a) => <option key={a.id} value={a.id}>{a.reference} — {a.characterName}</option>)}
        </select>
      </div>
      <SubmitButton className="btn btn-secondary btn-sm" pendingLabel="Linking…">Link</SubmitButton>
    </form>
  );
}
