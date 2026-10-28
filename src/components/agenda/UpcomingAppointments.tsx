import Link from "next/link";
import { CalendarDays, Plus } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { upcomingFor } from "@/lib/appointments";
import { businessName } from "@/lib/settings";
import { Card, CardHeader } from "@/components/ui/Card";
import { AppointmentCard } from "./AppointmentCard";

/** Tarjeta «Próximas citas» para las fichas de cliente, centro, plantillas y reparación. */
export async function UpcomingAppointments({ where, newHref }: { where: Prisma.AppointmentWhereInput; newHref: string }) {
  const [items, business] = await Promise.all([upcomingFor(where), businessName()]);
  return (
    <Card>
      <CardHeader
        title="Próximas citas"
        icon={CalendarDays}
        action={
          <Link href={newHref} className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-medium text-teal-700 hover:bg-teal-50">
            <Plus className="size-4" />Dar cita
          </Link>
        }
      />
      {items.length === 0 ? (
        <p className="px-5 py-4 text-sm text-slate-500">Sin citas pendientes.</p>
      ) : (
        <div className="space-y-2 p-3">{items.map((a) => <AppointmentCard key={a.id} a={a} business={business} showDay />)}</div>
      )}
    </Card>
  );
}
