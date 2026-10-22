"use client";

import { ConfirmSubmit } from "@/components/client-ui";
import { ActionForm, ACheckbox, AInput, ASubmit } from "@/components/admin/action-form";
import { appointmentTransitionAction, linkAppointmentRecordAction } from "../actions";

export function TransitionForms({
  id,
  actions,
  requestedLabel,
  alternativeLabel,
  location,
}: {
  id: string;
  actions: string[];
  requestedLabel: string;
  alternativeLabel: string | null;
  location: string;
}) {
  return (
    <div className="stack">
      {actions.includes("confirm") && (
        <ActionForm action={appointmentTransitionAction}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="op" value="confirm" />
          <fieldset>
            <legend>Confirm</legend>
            <div className="form">
              <label className="check"><input type="radio" name="slot" value="requested" defaultChecked /> <span>Requested: {requestedLabel}</span></label>
              {alternativeLabel && <label className="check"><input type="radio" name="slot" value="alternative" /> <span>Alternative: {alternativeLabel}</span></label>}
              <label className="check"><input type="radio" name="slot" value="custom" /> <span>Another time</span></label>
              <AInput name="customStart" label="Other date and time (office time)" type="datetime-local" />
              <AInput name="location" label="Location" defaultValue={location || "Arcadius Business Center, Suite 2210"} maxLength={200} />
              <ACheckbox name="allowOutsideHours" label="Allow outside office hours" />
              <div><ASubmit>Confirm appointment</ASubmit></div>
            </div>
          </fieldset>
        </ActionForm>
      )}
      {actions.includes("reschedule") && (
        <ActionForm action={appointmentTransitionAction}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="op" value="reschedule" />
          <fieldset>
            <legend>Reschedule</legend>
            <div className="form">
              <AInput name="newStart" label="New date and time (office time)" type="datetime-local" required />
              <AInput name="reason" label="Reason" maxLength={500} />
              <ACheckbox name="allowOutsideHours" label="Allow outside office hours" />
              <div><ASubmit className="btn btn-secondary">Reschedule</ASubmit></div>
            </div>
          </fieldset>
        </ActionForm>
      )}
      {(actions.includes("complete") || actions.includes("no_show")) && (
        <div className="row">
          {actions.includes("complete") && (
            <ActionForm action={appointmentTransitionAction} className="">
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="op" value="complete" />
              <ASubmit className="btn btn-secondary btn-sm">Mark completed</ASubmit>
            </ActionForm>
          )}
          {actions.includes("no_show") && (
            <ActionForm action={appointmentTransitionAction} className="">
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="op" value="no_show" />
              <ConfirmSubmit title="Mark as no-show?" message="Record that the client did not attend this appointment." confirmLabel="Mark no-show">
                Mark no-show
              </ConfirmSubmit>
            </ActionForm>
          )}
        </div>
      )}
      {(actions.includes("decline") || actions.includes("cancel")) && (
        <ActionForm action={appointmentTransitionAction}>
          <input type="hidden" name="id" value={id} />
          <fieldset>
            <legend>{actions.includes("decline") ? "Decline or cancel" : "Cancel"}</legend>
            <div className="form">
              <AInput name="reason" label="Reason" required maxLength={500} />
              <div className="row">
                {actions.includes("decline") && (
                  <ConfirmSubmit title="Decline this request?" message="The request will be marked as declined." confirmLabel="Decline request" name="op" value="decline">
                    Decline request
                  </ConfirmSubmit>
                )}
                <ConfirmSubmit title="Cancel this appointment?" message="The appointment will be marked as cancelled." confirmLabel="Cancel appointment" name="op" value="cancel">
                  Cancel appointment
                </ConfirmSubmit>
              </div>
            </div>
          </fieldset>
        </ActionForm>
      )}
    </div>
  );
}

export function LinkRecordForm({ id }: { id: string }) {
  return (
    <ActionForm action={linkAppointmentRecordAction}>
      <input type="hidden" name="id" value={id} />
      <AInput name="reference" label="Enquiry or matter reference" placeholder="ENQ-2026-… or CW-2026-…" maxLength={30} />
      <div><ASubmit className="btn btn-secondary btn-sm">Link</ASubmit></div>
    </ActionForm>
  );
}
