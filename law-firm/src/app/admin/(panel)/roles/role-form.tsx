"use client";

import { ActionForm, AInput, ASubmit, ATextarea } from "@/components/admin/action-form";
import { PERMISSION_GROUPS } from "@/lib/permissions";
import { saveRoleAction } from "./actions";

export function RoleForm({ values, locked }: { values: { id?: string; name: string; description: string; permissions: string[] }; locked: boolean }) {
  return (
    <ActionForm action={saveRoleAction}>
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <div className="form-grid">
        <AInput name="name" label="Role name" required defaultValue={values.name} maxLength={80} />
        <ATextarea name="description" label="Description" rows={2} defaultValue={values.description} maxLength={300} />
      </div>
      {locked ? (
        <div className="notice"><p>The super administrator role always has every permission and cannot be restricted.</p></div>
      ) : (
        <div className="perm-grid">
          {PERMISSION_GROUPS.map((g) => (
            <fieldset key={g.label}>
              <legend>{g.label}</legend>
              {g.permissions.map((p) => (
                <label key={p.key} className="check" style={{ marginBottom: "0.4rem" }}>
                  <input type="checkbox" name="permissions" value={p.key} defaultChecked={values.permissions.includes(p.key)} />
                  <span>{p.label} <span className="mono muted small">{p.key}</span></span>
                </label>
              ))}
            </fieldset>
          ))}
        </div>
      )}
      <div><ASubmit>Save role</ASubmit></div>
    </ActionForm>
  );
}
