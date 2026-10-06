/**
 * Datos de prueba FICTICIOS para testear la app de inmediato.
 * Ejecutar con:  npm run db:seed   (también se lanza tras `prisma migrate reset`)
 *
 * ⚠️  BORRA todos los datos (y los adjuntos registrados). Solo para pruebas, nunca con datos reales.
 *
 * Las fechas se calculan respecto a HOY para que el panel muestre siempre
 * avisos de renovación vencidos y próximos a vencer.
 */
import { PrismaClient, type PartCategory, type Prisma, type WorkOrderStatus } from "@prisma/client";
import { demoPdf, footprintPng, removeFiles, writeDemoFile } from "./demo-files";
import { buildQuoteSnapshot } from "../src/lib/quotes";

const prisma = new PrismaClient();

const DAY = 86_400_000;
const now = new Date();
const daysAgo = (n: number) => new Date(now.getTime() - n * DAY);
const daysAhead = (n: number) => new Date(now.getTime() + n * DAY);
const addMonths = (d: Date, m: number) => {
  const r = new Date(d);
  r.setMonth(r.getMonth() + m);
  return r;
};

/** DNI ficticio con letra de control válida */
const dni = (n: number) => `${String(n).padStart(8, "0")}${"TRWAGMYFPDXBNJZSQVHLCKE"[n % 23]}`;

async function reset() {
  // Borra también los archivos de los documentos que se van a eliminar (y sus carpetas vacías)
  const docs = await prisma.clinicalDocument.findMany({ select: { storagePath: true } });
  const logo = await prisma.settings.findUnique({ where: { id: 1 }, select: { logoPath: true } });
  await removeFiles([...docs.map((d) => d.storagePath), ...(logo?.logoPath ? [logo.logoPath] : [])]);
  // Orden inverso a las dependencias
  await prisma.auditLog.deleteMany();
  await prisma.backupRecord.deleteMany();
  await prisma.productIntervention.deleteMany();
  await prisma.quote.deleteMany();
  await prisma.workOrderStatusChange.deleteMany();
  await prisma.timeEntry.deleteMany();
  await prisma.workOrderPart.deleteMany();
  await prisma.workOrder.deleteMany();
  await prisma.trackedProduct.deleteMany();
  await prisma.technician.deleteMany();
  await prisma.clinicalDocument.deleteMany();
  await prisma.insoleCorrection.deleteMany();
  await prisma.insolePathology.deleteMany();
  await prisma.insolePrescription.deleteMany();
  await prisma.compressionStocking.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.settings.deleteMany();
}

async function main() {
  await reset();

  // ── Configuración del negocio ────────────────────────────────────────────
  await prisma.settings.create({
    data: {
      id: 1,
      businessName: "Jardón Ortopedia",
      legalName: "Jardón Ortopedia S.L.",
      taxId: "B12345678",
      healthLicense: "CS-0000-ORT",
      address: "Calle del Jardín, 12",
      city: "Valencia",
      postalCode: "46001",
      province: "Valencia",
      phone: "960 000 000",
      email: "info@jardon-ortopedia.example",
      defaultHourlyRateCents: 3800,
      defaultTaxRate: 21,
      quoteValidityDays: 30,
      quoteLegalFooter:
        "Presupuesto válido durante el plazo indicado. Los datos personales se tratan conforme al RGPD (UE) 2016/679 y la LOPDGDD 3/2018 " +
        "con la finalidad de gestionar la prestación del servicio. Puede ejercer sus derechos de acceso, rectificación, supresión y " +
        "portabilidad dirigiéndose al establecimiento. Garantía de reparación: 3 meses (RD Legislativo 1/2007).",
    },
  });

  // ── Técnicos ─────────────────────────────────────────────────────────────
  const [tecMario, tecLucia] = await Promise.all([
    prisma.technician.create({ data: { name: "Mario Ferrer", hourlyRateCents: 3800 } }),
    prisma.technician.create({ data: { name: "Lucía Navarro", hourlyRateCents: 3500 } }),
  ]);

  // ── Pacientes ────────────────────────────────────────────────────────────
  const patientsData = [
    { firstName: "Carmen", lastName: "García López", dni: dni(12345678), phone: "600 111 222", email: "carmen.garcia@example.com", city: "Valencia", birthDate: new Date("1958-03-14"), notes: "Diabética tipo 2. Revisar piel en cada visita." },
    { firstName: "Javier", lastName: "Martínez Ruiz", dni: dni(23456789), phone: "611 222 333", email: "javier.mr@example.com", city: "Paterna", birthDate: new Date("1985-07-02"), notes: "Corredor popular, 40 km/semana." },
    { firstName: "María José", lastName: "Sánchez Pérez", dni: dni(34567890), phone: "622 333 444", city: "Torrent", birthDate: new Date("1949-11-23"), notes: "Usuaria de silla eléctrica. Acude con su hija." },
    { firstName: "Antonio", lastName: "Fernández Gil", dni: dni(45678901), phone: "633 444 555", city: "Burjassot", birthDate: new Date("1962-01-30") },
    { firstName: "Lucía", lastName: "Romero Vidal", dni: dni(56789012), phone: "644 555 666", email: "lucia.romero@example.com", city: "Valencia", birthDate: new Date("1991-05-18"), notes: "Embarazada (2º trimestre)." },
    { firstName: "Francisco", lastName: "Moreno Castillo", dni: dni(67890123), phone: "655 666 777", city: "Mislata", birthDate: new Date("1940-09-09"), notes: "Movilidad reducida. Grúa en domicilio." },
    { firstName: "Elena", lastName: "Jiménez Ortega", dni: dni(78901234), phone: "666 777 888", email: "elena.jo@example.com", city: "Valencia", birthDate: new Date("2012-02-11"), notes: "Menor. Tutora legal: madre (Ana Ortega)." },
    { firstName: "Manuel", lastName: "Álvarez Serrano", dni: dni(89012345), phone: "677 888 999", city: "Alboraya", birthDate: new Date("1955-12-01"), notes: "Amputación transtibial izquierda (2019)." },
  ];

  const p = await Promise.all(
    patientsData.map((d) =>
      prisma.patient.create({
        data: { ...d, address: "Dirección de prueba, 1", gdprConsent: true, gdprConsentAt: daysAgo(400) },
      }),
    ),
  );
  const [carmen, javier, mariaJose, antonio, lucia, francisco, elena, manuel] = p;

  // ── Plantillas a medida (renovación 12 meses) ───────────────────────────
  const insoles: {
    patientId: string;
    delivered?: number; // días desde la entrega
    status?: "PENDING" | "IN_PRODUCTION" | "READY" | "DELIVERED";
    data: Record<string, unknown>;
    pathologies: { pathology: string; side?: "LEFT" | "RIGHT" | "BOTH" }[];
    corrections: { type: string; side?: "LEFT" | "RIGHT" | "BOTH"; valueMm?: number }[];
  }[] = [
    {
      patientId: carmen.id,
      delivered: 380, // VENCIDA (hace ~15 días)
      data: { insoleType: "DIABETIC", material: "EVA", shoreDensity: 25, baseMaterial: "EVA", baseDensity: 45, finish: "OPEN_CELL", shoeSize: 38, footLengthLeftMm: 241, footLengthRightMm: 243, technicalNotes: "Descarga 1ª y 5ª cabeza MTT. Forro antibacteriano.", priceCents: 16500 },
      pathologies: [{ pathology: "DIABETIC_FOOT" }, { pathology: "METATARSALGIA" }],
      corrections: [{ type: "FOREFOOT_RELIEF" }, { type: "METATARSAL_PAD", valueMm: 5 }],
    },
    {
      patientId: javier.id,
      delivered: 350, // vence en ~15 días
      data: { insoleType: "SPORT", material: "EVA", shoreDensity: 45, finish: "MICROPERFORATED", shoeSize: 43, footLengthLeftMm: 274, footLengthRightMm: 275, archHeightLeftMm: 12, archHeightRightMm: 11, prescribedBy: "Podología Dr. Ruiz", technicalNotes: "Estudio de pisada en cinta: hiperpronación bilateral en fase de apoyo medio.", priceCents: 18000 },
      pathologies: [{ pathology: "FLAT_FOOT" }, { pathology: "PRONATION" }],
      corrections: [{ type: "MEDIAL_WEDGE", valueMm: 3 }, { type: "ARCH_SUPPORT" }],
    },
    {
      patientId: antonio.id,
      delivered: 120,
      data: { insoleType: "DAILY", material: "EVA", shoreDensity: 35, finish: "TEXTILE_LINED", shoeSize: 42, footLengthLeftMm: 268, footLengthRightMm: 268, priceCents: 14500 },
      pathologies: [{ pathology: "PLANTAR_FASCIITIS", side: "RIGHT" }, { pathology: "HEEL_SPUR", side: "RIGHT" }],
      corrections: [{ type: "HEEL_SPUR_RELIEF", side: "RIGHT" }, { type: "HEEL_CUP" }],
    },
    {
      patientId: elena.id,
      status: "IN_PRODUCTION",
      data: { insoleType: "CHILD", material: "POLYPROPYLENE", finish: "TEXTILE_LINED", shoeSize: 34, footLengthLeftMm: 214, footLengthRightMm: 215, technicalNotes: "Control en 6 meses por crecimiento.", priceCents: 13000 },
      pathologies: [{ pathology: "FLAT_FOOT" }],
      corrections: [{ type: "HEEL_CUP" }, { type: "ARCH_SUPPORT" }],
    },
    {
      patientId: manuel.id,
      delivered: 395, // VENCIDA
      data: { insoleType: "DAILY", side: "RIGHT", material: "EVA", shoreDensity: 55, finish: "LEATHER_LINED", shoeSize: 41, footLengthRightMm: 262, heelLiftMm: 6, priceCents: 9500 },
      pathologies: [{ pathology: "LEG_LENGTH_DISCREPANCY", side: "RIGHT" }],
      corrections: [{ type: "HEEL_LIFT", side: "RIGHT", valueMm: 6 }],
    },
  ];

  for (const i of insoles) {
    const deliveredAt = i.delivered !== undefined ? daysAgo(i.delivered) : null;
    await prisma.insolePrescription.create({
      data: {
        patientId: i.patientId,
        ...(i.data as object),
        status: i.status ?? "DELIVERED",
        measuredAt: deliveredAt ? new Date(deliveredAt.getTime() - 10 * DAY) : daysAgo(5),
        deliveredAt,
        nextReviewAt: deliveredAt ? addMonths(deliveredAt, 12) : null,
        pathologies: { create: i.pathologies as never },
        corrections: { create: i.corrections as never },
      },
    });
  }

  // ── Medias de compresión (renovación 6 meses) ───────────────────────────
  const stockings = [
    {
      patientId: carmen.id,
      delivered: 170, // vence en ~10 días
      compressionClass: "CCL2" as const,
      garmentType: "KNEE_HIGH" as const,
      brand: "Medi", model: "Mediven Plus", color: "Beige",
      cB: 22, cC: 34, cD: 33, lAD: 39,
      diagnosis: "Insuficiencia venosa crónica C3",
      prescribingDoctor: "Dra. Pilar Esteve", doctorLicenseNo: "464612345", prescriptionNumber: "SS-2026-001234",
      isPublicHealth: true, publicHealthCode: "MCP-020", patientContribCents: 3000, priceCents: 6800,
    },
    {
      patientId: mariaJose.id,
      delivered: 200, // VENCIDA
      compressionClass: "CCL1" as const,
      garmentType: "THIGH_HIGH_SILICONE" as const,
      brand: "Juzo", model: "Soft", color: "Negro",
      cB: 21, cC: 33, cD: 32, cE: 38, cF: 50, cG: 58, lAD: 38, lAG: 72,
      diagnosis: "Varices. Prevención de edema.", priceCents: 5900,
    },
    {
      patientId: lucia.id,
      delivered: 30,
      compressionClass: "CCL1" as const,
      garmentType: "MATERNITY_PANTYHOSE" as const,
      brand: "Sigvaris", model: "Maternity", color: "Natural",
      cB: 20, cC: 32, cD: 31, cG: 56, cH: 100, lAT: 92, priceCents: 7400,
    },
    {
      patientId: francisco.id,
      delivered: 185, // VENCIDA
      compressionClass: "CCL3" as const,
      garmentType: "KNEE_HIGH" as const,
      knitType: "FLAT" as const, madeToMeasure: true, openToe: true,
      brand: "Medi", model: "Mediven Mondi",
      cB: 26, cB1: 31, cC: 39, cD: 37, lAB1: 11, lAC: 30, lAD: 40,
      diagnosis: "Linfedema secundario MII",
      prescribingDoctor: "Dr. Ramón Bosch", prescriptionNumber: "SS-2026-004321",
      isPublicHealth: true, patientContribCents: 3000, priceCents: 21000,
    },
  ];

  for (const { delivered, ...s } of stockings) {
    const deliveredAt = daysAgo(delivered);
    await prisma.compressionStocking.create({
      data: {
        ...s,
        status: "DELIVERED",
        measuredAt: new Date(deliveredAt.getTime() - 7 * DAY),
        prescriptionDate: "prescriptionNumber" in s ? new Date(deliveredAt.getTime() - 14 * DAY) : null,
        deliveredAt,
        nextReviewAt: addMonths(deliveredAt, 6),
      },
    });
  }

  // ── Documentos clínicos (archivos de ejemplo generados en uploads/) ────
  const demoDocs = [
    { patientId: javier.id, type: "GAIT_STUDY" as const, source: "UPLOAD" as const, title: "Estudio biomecánico en cinta", name: "estudio-pisada.pdf", mimeType: "application/pdf", takenAt: daysAgo(360),
      data: await demoPdf("Estudio biomecánico de la marcha", ["Paciente: Javier Martínez Ruiz", "Velocidad: 10 km/h en cinta", "Resultado: hiperpronación bilateral en apoyo medio", "Recomendación: plantilla deportiva EVA 45º con cuña interna 3 mm"]) },
    { patientId: javier.id, type: "FOOTPRINT_PHOTO" as const, source: "CAMERA" as const, title: "Pedigrafía bilateral", name: "huella.png", mimeType: "image/png", takenAt: daysAgo(360), data: footprintPng(true) },
    { patientId: elena.id, type: "FOOTPRINT_PHOTO" as const, source: "CAMERA" as const, title: "Pedigrafía inicial", name: "huella.png", mimeType: "image/png", takenAt: daysAgo(5), data: footprintPng(true) },
    { patientId: antonio.id, type: "FOOTPRINT_PHOTO" as const, source: "CAMERA" as const, title: "Pedigrafía", name: "huella.png", mimeType: "image/png", takenAt: daysAgo(130), data: footprintPng(false) },
    { patientId: carmen.id, type: "PRESCRIPTION" as const, source: "UPLOAD" as const, title: "Receta SS medias CCL2", name: "receta.pdf", mimeType: "application/pdf", takenAt: daysAgo(184),
      data: await demoPdf("Prescripción de material ortoprotésico", ["Paciente: Carmen García López", "Producto: media de compresión normal CCL2, corta (A-D)", "Dra. Pilar Esteve · Col. 464612345"]) },
    { patientId: elena.id, type: "CONSENT" as const, source: "UPLOAD" as const, title: "Consentimiento tutora legal", name: "consentimiento.pdf", mimeType: "application/pdf", takenAt: daysAgo(5),
      data: await demoPdf("Consentimiento informado", ["Paciente menor: Elena Jiménez Ortega", "Representante legal: Ana Ortega", "Autoriza el tratamiento de datos de salud (RGPD art. 9.2.a)"]) },
  ];
  for (const { data, name, ...d } of demoDocs) {
    const storagePath = `${d.patientId}/demo_${name}`;
    const sizeBytes = await writeDemoFile(storagePath, data);
    await prisma.clinicalDocument.create({ data: { ...d, originalName: name, storagePath, sizeBytes } });
  }

  // ── Trazabilidad: productos de alto valor ───────────────────────────────
  const sillaElectrica = await prisma.trackedProduct.create({
    data: {
      serialNumber: "INV-ESPRIT-2024-77812", lotNumber: "L2024-09", category: "ELECTRIC_WHEELCHAIR",
      brand: "Invacare", model: "Esprit Action 4NG", description: "Silla eléctrica, asiento 45 cm, joystick derecho",
      supplier: "Invacare España", patientId: mariaJose.id, isPublicHealth: true,
      purchasePriceCents: 210000, salePriceCents: 289000,
      deliveredAt: daysAgo(420), warrantyMonths: 24, warrantyUntil: addMonths(daysAgo(420), 24), nextServiceAt: daysAhead(20),
    },
  });
  const scooter = await prisma.trackedProduct.create({
    data: {
      serialNumber: "SCT-VEC4-23-00519", lotNumber: "B23-11", category: "MOBILITY_SCOOTER",
      brand: "Sunrise Medical", model: "Sterling S425", supplier: "Sunrise Medical S.L.",
      patientId: antonio.id, purchasePriceCents: 145000, salePriceCents: 199000,
      deliveredAt: daysAgo(800), warrantyMonths: 24, warrantyUntil: addMonths(daysAgo(800), 24),
    },
  });
  const protesis = await prisma.trackedProduct.create({
    data: {
      serialNumber: "OTB-1C30-501223", lotNumber: "OB-5512", category: "PROSTHESIS",
      brand: "Ottobock", model: "Trias 1C30", description: "Pie protésico de carbono, talla 26",
      patientId: manuel.id, isPublicHealth: true, deliveredAt: daysAgo(500), warrantyMonths: 36,
      warrantyUntil: addMonths(daysAgo(500), 36),
    },
  });
  const grua = await prisma.trackedProduct.create({
    data: {
      serialNumber: "GR-BIRDIE-182233", category: "PATIENT_LIFT", brand: "Invacare", model: "Birdie Evo",
      patientId: francisco.id, deliveredAt: daysAgo(90), warrantyMonths: 24, warrantyUntil: addMonths(daysAgo(90), 24),
      nextServiceAt: daysAhead(275),
    },
  });

  await prisma.productIntervention.createMany({
    data: [
      { productId: sillaElectrica.id, type: "DELIVERY", date: daysAgo(420), description: "Entrega y ajuste de joystick y reposabrazos." },
      { productId: sillaElectrica.id, type: "MAINTENANCE", date: daysAgo(60), description: "Revisión anual: frenos, presión neumáticos, firmware.", technicianId: tecMario.id, underWarranty: true },
      { productId: scooter.id, type: "DELIVERY", date: daysAgo(800), description: "Entrega en domicilio." },
      { productId: protesis.id, type: "DELIVERY", date: daysAgo(500), description: "Adaptación y alineación estática/dinámica." },
      { productId: protesis.id, type: "ADJUSTMENT", date: daysAgo(150), description: "Realineación por cambio de calzado.", technicianId: tecLucia.id, underWarranty: true },
      { productId: grua.id, type: "DELIVERY", date: daysAgo(90), description: "Montaje y formación al cuidador." },
    ],
  });

  // ── Órdenes de taller ───────────────────────────────────────────────────
  const year = now.getFullYear();
  let seq = 0;
  const code = () => `OT-${year}-${String(++seq).padStart(4, "0")}`;

  const orders: {
    status: WorkOrderStatus;
    data: Omit<Prisma.WorkOrderUncheckedCreateInput, "status" | "technicianId">;
    parts?: { category: PartCategory; description: string; quantity: number; unitCostCents: number; unitPriceCents: number; unit?: string }[];
    minutes?: number[];
    technicianId?: string;
  }[] = [
    {
      status: "IN_REPAIR",
      technicianId: tecMario.id,
      data: {
        code: code(), patientId: mariaJose.id, productId: sillaElectrica.id, equipmentCategory: "ELECTRIC_WHEELCHAIR",
        equipmentBrand: "Invacare", equipmentModel: "Esprit Action 4NG", serialNumber: sillaElectrica.serialNumber,
        serviceType: "BATTERY_REPLACEMENT", priority: "HIGH", accessories: "Cargador original",
        reportedIssue: "La silla pierde autonomía: no llega a 5 km.", diagnosis: "Baterías AGM 50Ah degradadas (capacidad 38%).",
        laborRateCents: 3800, receivedAt: daysAgo(4), promisedAt: daysAhead(1),
      },
      parts: [
        { category: "BATTERY", description: "Batería AGM 12V 50Ah", quantity: 2, unitCostCents: 9800, unitPriceCents: 14900 },
        { category: "CONSUMABLE", description: "Terminales y bridas", quantity: 1, unitCostCents: 300, unitPriceCents: 800 },
      ],
      minutes: [45, 30],
    },
    {
      status: "QUOTED",
      technicianId: tecMario.id,
      data: {
        code: code(), patientId: antonio.id, productId: scooter.id, equipmentCategory: "MOBILITY_SCOOTER",
        equipmentBrand: "Sunrise Medical", equipmentModel: "Sterling S425", serialNumber: scooter.serialNumber,
        serviceType: "GENERAL_REPAIR", reportedIssue: "Ruido metálico en rueda trasera y freno flojo.",
        diagnosis: "Rodamiento trasero dañado y zapata de freno desgastada.", laborRateCents: 3800, receivedAt: daysAgo(3),
      },
      parts: [
        { category: "WHEEL", description: "Rueda trasera neumática 13\"", quantity: 1, unitCostCents: 4200, unitPriceCents: 6900 },
        { category: "SPARE_PART", description: "Kit rodamientos eje trasero", quantity: 1, unitCostCents: 1800, unitPriceCents: 3200 },
        { category: "SPARE_PART", description: "Zapata de freno electromagnético", quantity: 1, unitCostCents: 3500, unitPriceCents: 5500 },
      ],
      minutes: [30],
    },
    {
      status: "RECEIVED",
      data: {
        code: code(), customerName: "Residencia Los Naranjos", customerPhone: "961 222 333", equipmentCategory: "MANUAL_WHEELCHAIR",
        equipmentBrand: "Breezy", equipmentModel: "Premier", serviceType: "PREVENTIVE_MAINTENANCE", priority: "LOW",
        reportedIssue: "Revisión periódica de 4 sillas (lote residencia). Ésta: freno derecho no bloquea.", receivedAt: daysAgo(0),
      },
    },
    {
      status: "DIAGNOSIS",
      technicianId: tecLucia.id,
      data: {
        code: code(), patientId: francisco.id, productId: grua.id, equipmentCategory: "PATIENT_LIFT",
        equipmentBrand: "Invacare", equipmentModel: "Birdie Evo", serialNumber: grua.serialNumber, serviceType: "WARRANTY",
        underWarranty: true, priority: "URGENT", reportedIssue: "El actuador no sube con carga.", receivedAt: daysAgo(1), promisedAt: daysAhead(2),
      },
      minutes: [20],
    },
    {
      status: "READY",
      technicianId: tecLucia.id,
      data: {
        code: code(), patientId: manuel.id, productId: protesis.id, equipmentCategory: "PROSTHESIS",
        equipmentBrand: "Ottobock", equipmentModel: "Trias 1C30", serialNumber: protesis.serialNumber,
        serviceType: "CUSTOM_ADJUSTMENT", laborMode: "FIXED", laborFixedCents: 4500,
        reportedIssue: "Molestia en encaje tras pérdida de peso.", diagnosis: "Holgura en encaje. Añadir almohadillado.",
        workDone: "Almohadillado interior de encaje y revisión de alineación.", receivedAt: daysAgo(6), completedAt: daysAgo(1),
      },
      parts: [{ category: "THERMOPLASTIC", description: "Lámina Pe-Lite 5 mm", quantity: 0.25, unit: "m²", unitCostCents: 2400, unitPriceCents: 4000 }],
    },
    {
      status: "DELIVERED",
      technicianId: tecMario.id,
      data: {
        code: code(), customerName: "Pedro Llorens", customerPhone: "699 000 111", equipmentCategory: "WALKER",
        equipmentBrand: "Drive", equipmentModel: "Nitro", serviceType: "CLEANING_DISINFECTION", laborMode: "FIXED", laborFixedCents: 2500,
        reportedIssue: "Limpieza y desinfección para reutilizar.", workDone: "Desinfección completa y cambio de contera.",
        receivedAt: daysAgo(12), completedAt: daysAgo(10), deliveredAt: daysAgo(9),
      },
      parts: [{ category: "SPARE_PART", description: "Contera de goma", quantity: 2, unitCostCents: 150, unitPriceCents: 400 }],
    },
    {
      status: "IN_REPAIR",
      technicianId: tecLucia.id,
      data: {
        code: code(), patientId: elena.id, equipmentCategory: "ORTHOSIS", serviceType: "CUSTOM_ADJUSTMENT",
        equipmentModel: "DAFO a medida (bilateral)", reportedIssue: "Roza en maléolo interno izquierdo.",
        diagnosis: "Termoconformar zona maleolar.", laborRateCents: 3500, receivedAt: daysAgo(2), promisedAt: daysAhead(3),
      },
      parts: [{ category: "EVA", description: "EVA 3 mm forro", quantity: 1, unitCostCents: 200, unitPriceCents: 600 }],
      minutes: [25],
    },
  ];

  const flow: WorkOrderStatus[] = ["RECEIVED", "DIAGNOSIS", "QUOTED", "IN_REPAIR", "READY", "DELIVERED"];

  for (const o of orders) {
    const receivedAt = (o.data.receivedAt as Date) ?? now;
    const wo = await prisma.workOrder.create({
      data: {
        ...o.data,
        status: o.status,
        technicianId: o.technicianId,
        parts: o.parts ? { create: o.parts } : undefined,
        timeEntries: o.minutes
          ? {
              create: o.minutes.map((m, idx) => {
                const startedAt = new Date(receivedAt.getTime() + (idx + 1) * 3_600_000);
                return { technicianId: o.technicianId, startedAt, endedAt: new Date(startedAt.getTime() + m * 60_000), minutes: m };
              }),
            }
          : undefined,
        // Historial de estados coherente con el flujo
        statusHistory: {
          create: flow.slice(0, flow.indexOf(o.status) + 1).map((to, idx, arr) => ({
            fromStatus: idx === 0 ? null : arr[idx - 1],
            toStatus: to,
            changedAt: new Date(receivedAt.getTime() + idx * 6 * 3_600_000),
          })),
        },
      },
    });

    if (o.status === "QUOTED") {
      const { lines, discountPercent: _d, ...totals } = buildQuoteSnapshot({
        parts: (o.parts ?? []).map((x) => ({ ...x, unit: x.unit ?? "ud" })),
        laborMode: "HOURLY",
        laborRateCents: 3800,
        laborFixedCents: null,
        laborMinutes: (o.minutes ?? []).reduce((a, b) => a + b, 0) + 60, // + 1 h estimada de montaje
        discountPercent: 0,
        taxRate: 21,
      });
      await prisma.quote.create({
        data: {
          number: `PRES-${year}-0001`, workOrderId: wo.id, status: "SENT", issuedAt: daysAgo(2), validUntil: daysAhead(28),
          ...totals, notes: "Plazo estimado de reparación: 3 días laborables desde la aceptación.",
          linesJson: JSON.stringify({ lines }),
        },
      });
    }

    if (wo.productId && o.status === "DELIVERED") {
      await prisma.productIntervention.create({
        data: { productId: wo.productId, workOrderId: wo.id, type: "REPAIR", description: wo.workDone ?? wo.reportedIssue, technicianId: o.technicianId },
      });
    }
  }

  // ── Histórico de 12 meses (para que las estadísticas tengan datos) ──────
  // Pseudoaleatorio con semilla fija: el resultado es siempre el mismo
  let seedN = 42;
  const rnd = () => ((seedN = (seedN * 1103515245 + 12345) % 2147483648) / 2147483648);
  const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
  const historicNames = [
    ["Rosa", "Navarro Peris"], ["José Luis", "Ortiz Martí"], ["Amparo", "Soler Ribes"], ["Vicente", "Puig Camps"],
    ["Pilar", "Gómez Sanchis"], ["Enrique", "Llopis Tormo"], ["Dolores", "Ferrer Vila"], ["Salvador", "Mas Bonet"],
  ];
  const historic = await Promise.all(
    historicNames.map(([firstName, lastName], i) =>
      prisma.patient.create({ data: { firstName, lastName, dni: dni(10000000 + i * 1234567), phone: `6${String(10000000 + i * 1111111).slice(0, 8)}`, city: pick(["Valencia", "Paterna", "Torrent", "Mislata"]), gdprConsent: true, gdprConsentAt: daysAgo(380), createdAt: daysAgo(30 + i * 40) } }),
    ),
  );
  const categories = ["MANUAL_WHEELCHAIR", "ELECTRIC_WHEELCHAIR", "MOBILITY_SCOOTER", "WALKER", "PATIENT_LIFT", "ORTHOSIS"] as const;
  const services = ["GENERAL_REPAIR", "PREVENTIVE_MAINTENANCE", "BATTERY_REPLACEMENT", "CLEANING_DISINFECTION", "CUSTOM_ADJUSTMENT"] as const;
  for (let monthsAgo = 11; monthsAgo >= 0; monthsAgo--) {
    const n = 2 + Math.floor(rnd() * 4) + (monthsAgo < 4 ? 1 : 0);
    for (let k = 0; k < n; k++) {
      const delivered = daysAgo(monthsAgo * 30 + 2 + Math.floor(rnd() * 25));
      if (delivered > now) continue;
      const received = new Date(delivered.getTime() - (2 + Math.floor(rnd() * 8)) * DAY);
      const category = pick([...categories]);
      const minutes = 30 + Math.floor(rnd() * 150);
      await prisma.workOrder.create({
        data: {
          code: code(), patientId: pick(historic).id, equipmentCategory: category, serviceType: pick([...services]),
          status: "DELIVERED", reportedIssue: "Revisión / reparación (histórico de ejemplo).", workDone: "Trabajo completado.",
          technicianId: pick([tecMario.id, tecLucia.id]), laborRateCents: 3800, receivedAt: received, completedAt: delivered, deliveredAt: delivered,
          parts: { create: [{ category: "SPARE_PART", description: "Recambio (ejemplo)", quantity: 1 + Math.floor(rnd() * 2), unitCostCents: 1500, unitPriceCents: 2500 + Math.floor(rnd() * 9000) }] },
          timeEntries: { create: { technicianId: tecMario.id, startedAt: received, endedAt: new Date(received.getTime() + minutes * 60_000), minutes } },
          statusHistory: { create: [{ toStatus: "RECEIVED", changedAt: received }, { fromStatus: "READY", toStatus: "DELIVERED", changedAt: delivered }] },
        },
      });
    }
    // Plantillas y medias entregadas ese mes (avisos ya gestionados para no llenar el panel)
    for (let k = 0; k < 1 + Math.floor(rnd() * 3); k++) {
      const deliveredAt = daysAgo(monthsAgo * 30 + 3 + Math.floor(rnd() * 24));
      await prisma.insolePrescription.create({
        data: { patientId: pick(historic).id, material: "EVA", shoreDensity: pick([35, 45, 55]), finish: pick(["MICROPERFORATED", "OPEN_CELL", "TEXTILE_LINED"]), status: "DELIVERED", measuredAt: new Date(deliveredAt.getTime() - 10 * DAY), deliveredAt, nextReviewAt: addMonths(deliveredAt, 12), renewalStatus: "RENEWED", priceCents: pick([12000, 14500, 16500, 18000]) },
      });
    }
    for (let k = 0; k < 1 + Math.floor(rnd() * 4); k++) {
      const deliveredAt = daysAgo(monthsAgo * 30 + 3 + Math.floor(rnd() * 24));
      await prisma.compressionStocking.create({
        data: { patientId: pick(historic).id, compressionClass: pick(["CCL1", "CCL2"]), garmentType: pick(["KNEE_HIGH", "THIGH_HIGH_SILICONE", "PANTYHOSE"]), status: "DELIVERED", measuredAt: new Date(deliveredAt.getTime() - 7 * DAY), deliveredAt, nextReviewAt: addMonths(deliveredAt, 6), renewalStatus: "RENEWED", priceCents: pick([5900, 6800, 7400]) },
      });
    }
  }

  const counts = {
    pacientes: await prisma.patient.count(),
    plantillas: await prisma.insolePrescription.count(),
    medias: await prisma.compressionStocking.count(),
    ordenesTaller: await prisma.workOrder.count(),
    productos: await prisma.trackedProduct.count(),
  };
  console.log("✅ Datos de prueba cargados:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
