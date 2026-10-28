import Link from "next/link";
import { Plus, Truck } from "lucide-react";
import { formatDate } from "@/lib/dates";
import { orderItemStatus } from "@/lib/labels";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

type Item = { id: string; description: string; quantity: number; status: keyof typeof orderItemStatus; neededBy: Date | null; supplier: { name: string } | null; purchaseOrder: { id: string; expectedAt: Date | null } | null };

/** Artículos pedidos (o por pedir) para una reparación, unas plantillas, un cliente o un centro. */
export function LinkedItems({ items, newHref, title = "Pedidos a marcas", hideWhenEmpty = false }: { items: Item[]; newHref: string; title?: string; hideWhenEmpty?: boolean }) {
  if (hideWhenEmpty && items.length === 0) return null;
  return (
    <Card>
      <CardHeader
        title={title}
        icon={Truck}
        action={<Link href={newHref} className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-sm font-medium text-teal-700 hover:bg-teal-50"><Plus className="size-4" />Pedir</Link>}
      />
      {items.length === 0 ? (
        <p className="px-5 py-4 text-sm text-slate-500">Nada pedido. Use «Pedir» para apuntar lo que haga falta pedir a una marca.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((i) => (
            <li key={i.id}>
              <Link href={i.purchaseOrder ? `/pedidos/${i.purchaseOrder.id}` : `/pedidos/articulo/${i.id}`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{i.quantity.toLocaleString("es-ES")} × {i.description}</p>
                  <p className="truncate text-xs text-slate-500">
                    {i.supplier?.name ?? "Sin marca"}
                    {i.status === "ORDERED" && i.purchaseOrder?.expectedAt && ` · llega el ${formatDate(i.purchaseOrder.expectedAt)}`}
                    {i.status === "PENDING" && i.neededBy && ` · hace falta el ${formatDate(i.neededBy)}`}
                  </p>
                </div>
                <Badge tone={orderItemStatus[i.status].tone}>{orderItemStatus[i.status].label}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
