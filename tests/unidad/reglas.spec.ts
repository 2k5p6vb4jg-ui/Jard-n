import { test, expect } from "@playwright/test";
import { whatsappLink, whatsappNumber } from "@/lib/whatsapp";
import { canAccessPath, canSee } from "@/lib/permissions";
import { proposalTotals, contractValueCents } from "@/lib/proposals";

test.describe("WhatsApp", () => {
  test("solo móviles; prefijo español añadido", () => {
    expect(whatsappNumber("611 22 33 44")).toBe("34611223344");
    expect(whatsappNumber("+34 711-223-344")).toBe("34711223344");
    expect(whatsappNumber("0033 6 12 34 56 78")).toBe("33612345678");
    expect(whatsappNumber("985 12 34 56")).toBeNull(); // fijo
    expect(whatsappNumber("+34 985 123 456")).toBeNull();
    expect(whatsappNumber("")).toBeNull();
    expect(whatsappLink("611223344", "Hola, ¿qué tal?")).toBe("https://wa.me/34611223344?text=Hola%2C%20%C2%BFqu%C3%A9%20tal%3F");
  });
});

test.describe("Permisos por perfil", () => {
  test("sin usuarios todo está abierto", () => {
    expect(canAccessPath(null, "/configuracion")).toBe(true);
  });
  test("Taller no ve fichas clínicas, centros, estadísticas ni ajustes", () => {
    for (const p of ["/pacientes", "/pacientes/abc", "/api/pacientes/abc/exportar", "/centros", "/api/propuestas/x", "/estadisticas", "/configuracion/usuarios", "/api/backup"]) {
      expect(canAccessPath("WORKSHOP", p), p).toBe(false);
    }
    for (const p of ["/", "/taller/x", "/plantillas", "/pedidos", "/agenda", "/trazabilidad", "/mi-pin", "/firmar"]) expect(canAccessPath("WORKSHOP", p), p).toBe(true);
  });
  test("Mostrador: todo salvo Ajustes y Estadísticas", () => {
    expect(canSee("FRONT_DESK", "clientes")).toBe(true);
    expect(canSee("FRONT_DESK", "centros")).toBe(true);
    expect(canAccessPath("FRONT_DESK", "/configuracion")).toBe(false);
    expect(canAccessPath("FRONT_DESK", "/estadisticas")).toBe(false);
    // Un prefijo parecido no cuenta como la sección
    expect(canAccessPath("FRONT_DESK", "/configuracionx")).toBe(true);
  });
  test("Administración: todo", () => {
    expect(canAccessPath("ADMIN", "/configuracion/usuarios")).toBe(true);
  });
});

test.describe("Propuestas", () => {
  test("descuento, IVA y valor del contrato", () => {
    const t = proposalTotals([{ description: "Revisión", quantity: 4, unit: "ud", unitPriceCents: 2500 }], 10, 21);
    expect(t).toEqual({ grossCents: 10000, discountCents: 1000, subtotalCents: 9000, taxCents: 1890, totalCents: 10890 });
    expect(contractValueCents({ totalCents: 10000, billingPeriod: "MONTHLY", durationMonths: 12 })).toBe(120000);
    expect(contractValueCents({ totalCents: 10000, billingPeriod: "ONE_OFF", durationMonths: 12 })).toBeNull();
  });
});
