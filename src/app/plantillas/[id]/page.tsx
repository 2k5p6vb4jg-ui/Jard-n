import Link from "next/link";
import { notFound } from "next/navigation";
import { Camera, Check, CircleDollarSign, Footprints, Pencil, Phone, Plus, RefreshCw, Trash2, User } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";
import { formatEUR } from "@/lib/money";
import { side } from "@/lib/labels";
import { getInsoleOptions, statusTones } from "@/lib/insoleOrders";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { SubmitButton } from "@/components/ui/Form";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { PhotoGallery } from "@/components/ui/PhotoGallery";
import { deleteInsoleOrder, setInsoleOrderStatus, togglePaid } from "../actions";

export default async function InsoleOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [order, { statuses }] = await Promise.all([
    prisma.insoleOrder.findUnique({ where: { id }, include: { patient: true, type: true, material: true, status: true, photos: { orderBy: { createdAt: "asc" } } } }),
    getInsoleOptions(),
  ]);
  if (!order) notFound();
  const tones = statusTones(statuses);
  const p = order.patient;

  const item = (label: string, value: React.ReactNode) => (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-800">{value}</dd>
    </div>
  );

  return (
    <>
      <PageHeader
        eyebrow={<span className="font-mono normal-case tracking-normal">{order.code}</span>}
        title={`Plantillas ${order.type.label.toLowerCase()}`}
        description={`${p.firstName} ${p.lastName}`}
        actions={
          <>
            <span className="self-center"><Badge tone={tones[order.statusId]}>{order.status.label}</Badge></span>
            <LinkButton href={`/plantillas/${order.id}/editar`} variant="secondary" icon={Pencil}>Editar</LinkButton>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Datos de las plantillas" icon={Footprints} />
            <dl className="grid grid-cols-2 gap-2 p-5 sm:grid-cols-3">
              {item("Tipo", order.type.label)}
              {item("Pie", side[order.side])}
              {item("Número de pie", order.shoeSize != null ? order.shoeSize.toLocaleString("es-ES") : "—")}
              {item("Material", order.material?.label ?? "—")}
              {item("Toma de medidas", formatDate(order.measuredAt))}
              {item("Entrega prevista", formatDate(order.dueAt))}
            </dl>
            {order.notes && <p className="whitespace-pre-line border-t border-slate-100 px-5 py-4 text-slate-700">{order.notes}</p>}
          </Card>

<Card>
            <CardHeader title="Fotos" icon={Camera} subtitle="Molde, pisada, plantilla terminada…" />
            <PhotoGallery photos={order.photos.map((p) => ({ id: p.id, url: `/api/uploads/${p.storagePath}` }))} uploadUrl={`/api/fotos?plantilla=${order.id}`} />
          </Card>

<Card>
            <CardHeader title="Cambiar estado" icon={RefreshCw} />
            <div className="flex flex-wrap gap-2 p-5">
              {statuses
                .filter((s) => s.active || s.id === order.statusId)
                .map((s) =>
                  s.id === order.statusId ? (
                    <span key={s.id} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-teal-600 px-4 font-medium text-white">
                      <Check className="size-5" />
                      {s.label}
                    </span>
                  ) : (
                    <form key={s.id} action={setInsoleOrderStatus.bind(null, order.id, s.id)}>
                      <SubmitButton variant="secondary" icon={null}>{s.label}</SubmitButton>
                    </form>
                  ),
                )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Cliente" icon={User} />
            <div className="space-y-2 p-5">
              <Link href={`/pacientes/${p.id}`} className="font-medium text-teal-700 hover:underline">{p.firstName} {p.lastName}</Link>
              {p.phone && (
                <p className="flex items-center gap-2 text-slate-600">
                  <Phone className="size-4 text-slate-400" />
                  <a href={`tel:${p.phone.replace(/\s/g, "")}`}>{p.phone}</a>
                </p>
              )}
              <LinkButton href={`/plantillas/nueva?paciente=${p.id}`} variant="secondary" icon={Plus} className="mt-2 w-full">Otras plantillas para este cliente</LinkButton>
            </div>
          </Card>

          <Card>
            <CardHeader title="Cobro" icon={CircleDollarSign} />
            <div className="space-y-3 p-5">
              <p className="text-3xl font-semibold tracking-tight text-slate-900">{formatEUR(order.priceCents)}</p>
              <Badge tone={order.paid ? "emerald" : "rose"}>{order.paid ? "Pagado" : "Pendiente de pago"}</Badge>
              <form action={togglePaid.bind(null, order.id)}>
                <SubmitButton variant={order.paid ? "secondary" : "primary"} icon={<CircleDollarSign className="size-5" />} className="w-full">
                  {order.paid ? "Marcar como no pagado" : "Marcar como pagado"}
                </SubmitButton>
              </form>
            </div>
          </Card>

          <form action={deleteInsoleOrder.bind(null, order.id)}>
            <ConfirmButton
              message={`¿Borrar las plantillas ${order.code}? No se puede deshacer.`}
              icon={<Trash2 className="size-4" />}
              className="w-full text-sm text-slate-500 hover:bg-rose-50 hover:text-rose-600"
            >
              Borrar este registro
            </ConfirmButton>
          </form>
          <p className="text-center text-xs text-slate-400">Registrado el {formatDate(order.createdAt)}</p>
        </div>
      </div>
    </>
  );
}
