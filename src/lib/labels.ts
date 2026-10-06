import type {
  CompressionClass,
  CorrectionType,
  DocumentType,
  EquipmentCategory,
  FootPathology,
  GarmentType,
  InsoleFinish,
  InsoleMaterial,
  InterventionType,
  PartCategory,
  PrescriptionStatus,
  Priority,
  QuoteStatus,
  ServiceType,
  WorkOrderStatus,
} from "@prisma/client";

/** Tonos de badge disponibles (ver components/ui/Badge.tsx) */
export type Tone = "slate" | "teal" | "indigo" | "sky" | "amber" | "rose" | "emerald" | "violet";

export const workOrderStatus: Record<WorkOrderStatus, { label: string; tone: Tone }> = {
  RECEIVED: { label: "Entrada", tone: "slate" },
  DIAGNOSIS: { label: "Diagnóstico", tone: "sky" },
  QUOTED: { label: "Presupuestado", tone: "violet" },
  IN_REPAIR: { label: "En reparación", tone: "amber" },
  READY: { label: "Listo para entregar", tone: "teal" },
  DELIVERED: { label: "Entregado", tone: "emerald" },
  CANCELLED: { label: "Anulado", tone: "rose" },
};

/** Orden del flujo de taller (sin CANCELLED) */
export const WORK_ORDER_FLOW: WorkOrderStatus[] = [
  "RECEIVED",
  "DIAGNOSIS",
  "QUOTED",
  "IN_REPAIR",
  "READY",
  "DELIVERED",
];

export const priority: Record<Priority, { label: string; tone: Tone }> = {
  LOW: { label: "Baja", tone: "slate" },
  NORMAL: { label: "Normal", tone: "sky" },
  HIGH: { label: "Alta", tone: "amber" },
  URGENT: { label: "Urgente", tone: "rose" },
};

export const prescriptionStatus: Record<PrescriptionStatus, { label: string; tone: Tone }> = {
  PENDING: { label: "Pendiente", tone: "slate" },
  IN_PRODUCTION: { label: "En fabricación", tone: "amber" },
  READY: { label: "Lista", tone: "teal" },
  DELIVERED: { label: "Entregada", tone: "emerald" },
  CANCELLED: { label: "Anulada", tone: "rose" },
};

export const quoteStatus: Record<QuoteStatus, { label: string; tone: Tone }> = {
  DRAFT: { label: "Borrador", tone: "slate" },
  SENT: { label: "Enviado", tone: "sky" },
  ACCEPTED: { label: "Aceptado", tone: "emerald" },
  REJECTED: { label: "Rechazado", tone: "rose" },
  EXPIRED: { label: "Caducado", tone: "amber" },
};

export const equipmentCategory: Record<EquipmentCategory, string> = {
  MANUAL_WHEELCHAIR: "Silla de ruedas manual",
  ELECTRIC_WHEELCHAIR: "Silla de ruedas eléctrica",
  MOBILITY_SCOOTER: "Scooter de movilidad",
  PATIENT_LIFT: "Grúa de traslado",
  WALKER: "Andador",
  ORTHOSIS: "Órtesis",
  PROSTHESIS: "Prótesis",
  MOTOR: "Motor",
  OTHER: "Otro",
};

export const serviceType: Record<ServiceType, string> = {
  GENERAL_REPAIR: "Reparación general",
  PREVENTIVE_MAINTENANCE: "Mantenimiento preventivo",
  BATTERY_REPLACEMENT: "Cambio de baterías",
  CLEANING_DISINFECTION: "Limpieza y desinfección",
  CUSTOM_ADJUSTMENT: "Ajuste a medida",
  WARRANTY: "Garantía",
};

export const partCategory: Record<PartCategory, string> = {
  RESIN: "Resina",
  EVA: "EVA",
  THERMOPLASTIC: "Termoplástico",
  BATTERY: "Batería",
  MOTOR: "Motor",
  WHEEL: "Rueda",
  SPARE_PART: "Recambio",
  UPHOLSTERY: "Tapicería",
  ELECTRONICS: "Electrónica",
  CONSUMABLE: "Consumible",
  OTHER: "Otro",
};

export const footPathology: Record<FootPathology, string> = {
  FLAT_FOOT: "Pie plano",
  CAVUS_FOOT: "Pie cavo",
  PLANTAR_FASCIITIS: "Fascitis plantar",
  HEEL_SPUR: "Espolón calcáneo",
  METATARSALGIA: "Metatarsalgia",
  HALLUX_VALGUS: "Hallux valgus",
  MORTON_NEUROMA: "Neuroma de Morton",
  PRONATION: "Pie pronador",
  SUPINATION: "Pie supinador",
  LEG_LENGTH_DISCREPANCY: "Dismetría",
  DIABETIC_FOOT: "Pie diabético",
  OTHER: "Otra",
};

export const insoleMaterial: Record<InsoleMaterial, string> = {
  EVA: "EVA",
  POLYPROPYLENE: "Polipropileno",
  RESIN: "Resina",
  CORK: "Corcho",
  CARBON_FIBER: "Fibra de carbono",
  PORON: "Poron",
  LEATHER: "Piel",
  OTHER: "Otro",
};

export const insoleFinish: Record<InsoleFinish, string> = {
  MICROPERFORATED: "Microperforado",
  OPEN_CELL: "Celdas abiertas",
  CLOSED_CELL: "Celdas cerradas",
  LEATHER_LINED: "Forrado en piel",
  TEXTILE_LINED: "Forrado textil",
  NONE: "Sin forro",
};

export const correctionType: Record<CorrectionType, string> = {
  MEDIAL_WEDGE: "Cuña interna",
  LATERAL_WEDGE: "Cuña externa",
  ARCH_SUPPORT: "Soporte de arco",
  RETROCAPITAL_BAR: "Barra retrocapital",
  METATARSAL_PAD: "Oliva metatarsal",
  HEEL_CUP: "Copa de talón",
  HEEL_LIFT: "Alza de talón",
  HEEL_SPUR_RELIEF: "Descarga de espolón",
  FOREFOOT_RELIEF: "Descarga de antepié",
  OTHER: "Otra",
};

export const compressionClass: Record<CompressionClass, string> = {
  CCL1: "CCL1 · 18–21 mmHg",
  CCL2: "CCL2 · 23–32 mmHg",
  CCL3: "CCL3 · 34–46 mmHg",
  CCL4: "CCL4 · >49 mmHg",
};

export const garmentType: Record<GarmentType, string> = {
  KNEE_HIGH: "Media corta (A-D)",
  THIGH_HIGH: "Media a muslo (A-G)",
  THIGH_HIGH_SILICONE: "Media a muslo con blonda",
  PANTYHOSE: "Panty (A-T)",
  MATERNITY_PANTYHOSE: "Panty premamá",
  ARM_SLEEVE: "Manguito",
  OTHER: "Otra",
};

export const documentType: Record<DocumentType, string> = {
  GAIT_STUDY: "Estudio de pisada",
  FOOTPRINT_PHOTO: "Foto de huella",
  PRESCRIPTION: "Receta",
  MEDICAL_REPORT: "Informe médico",
  CONSENT: "Consentimiento",
  PHOTO: "Foto clínica",
  OTHER: "Otro",
};

export const interventionType: Record<InterventionType, string> = {
  DELIVERY: "Entrega",
  INSPECTION: "Revisión",
  REPAIR: "Reparación",
  MAINTENANCE: "Mantenimiento",
  ADJUSTMENT: "Ajuste",
  WARRANTY_CLAIM: "Garantía",
  RETURN: "Devolución",
};
