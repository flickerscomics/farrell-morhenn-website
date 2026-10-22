import { AdminHead } from "@/components/admin/panels";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/server/auth";
import { getSettings } from "@/server/settings";
import { NewAppointmentForm } from "./form";

export const metadata = { title: "Book an appointment" };

export default async function NewAppointmentPage() {
  await requirePermission("appointments.manage");
  const settings = await getSettings();
  const attorneys = await prisma.staffProfile.findMany({ where: { status: "ACTIVE", acceptsConsultations: true }, orderBy: { sortOrder: "asc" }, select: { id: true, fullName: true } });
  return (
    <>
      <AdminHead back={{ href: "/admin/appointments", label: "Appointments" }} title="Book an appointment" description="For bookings taken by phone or in person. Staff bookings are created as confirmed." />
      <section className="panel" style={{ maxWidth: 820 }}>
        <NewAppointmentForm attorneys={attorneys} types={settings.consultationTypes} methods={settings.contactMethods} duration={settings.appointmentMinutes} />
      </section>
    </>
  );
}
