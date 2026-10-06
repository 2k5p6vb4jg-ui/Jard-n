import "server-only";
import { prisma } from "./prisma";

/** "Álvarez  Gil" → "alvarez gil" (sin tildes, minúsculas) */
export const normalize = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/** Todas las palabras buscadas deben aparecer en alguno de los campos. Ignora espacios en teléfonos/DNI. */
function matcher(term: string) {
  const tokens = normalize(term).split(" ").filter(Boolean);
  return (...fields: (string | null | undefined)[]) => {
    const hay = normalize(fields.filter(Boolean).join(" "));
    const compact = hay.replace(/[\s.-]/g, "");
    return tokens.every((t) => hay.includes(t) || compact.includes(t.replace(/[\s.-]/g, "")));
  };
}

/**
 * Búsqueda sin distinguir tildes ni mayúsculas. SQLite no sabe ignorar tildes, así que se
 * filtra en memoria: con el volumen de una ortopedia (miles de fichas) es instantáneo.
 */
export async function searchPatients(term: string, limit = 200) {
  const all = await prisma.patient.findMany({
    where: { archivedAt: null },
    include: { _count: { select: { insoles: true, stockings: true, documents: true, workOrders: true } } },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  if (!term.trim()) return all.slice(0, limit);
  const m = matcher(term);
  return all.filter((p) => m(p.firstName, p.lastName, p.dni, p.phone, p.phoneAlt, p.email, p.healthCardNo, p.city)).slice(0, limit);
}

export async function globalSearch(term: string) {
  if (normalize(term).length < 2) return null;
  const m = matcher(term);
  const [patients, orders, products, quotes] = await Promise.all([
    searchPatients(term, 20),
    prisma.workOrder.findMany({
      select: {
        id: true, code: true, status: true, equipmentCategory: true, equipmentBrand: true, equipmentModel: true,
        serialNumber: true, customerName: true, reportedIssue: true, receivedAt: true,
        patient: { select: { firstName: true, lastName: true } },
      },
      orderBy: { receivedAt: "desc" },
    }),
    prisma.trackedProduct.findMany({
      select: { id: true, serialNumber: true, lotNumber: true, brand: true, model: true, category: true, patient: { select: { firstName: true, lastName: true } } },
    }),
    prisma.quote.findMany({ select: { id: true, number: true, totalCents: true, status: true, validUntil: true, workOrderId: true, workOrder: { select: { code: true } } } }),
  ]);
  return {
    patients,
    orders: orders
      .filter((o) => m(o.code, o.serialNumber, o.equipmentBrand, o.equipmentModel, o.customerName, o.patient?.firstName, o.patient?.lastName))
      .slice(0, 20),
    products: products.filter((p) => m(p.serialNumber, p.lotNumber, p.brand, p.model, p.patient?.firstName, p.patient?.lastName)).slice(0, 20),
    quotes: quotes.filter((q) => m(q.number, q.workOrder.code)).slice(0, 20),
  };
}
