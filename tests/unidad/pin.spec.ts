import { test, expect } from "@playwright/test";
import { type AuthConfig, createSessionToken, findUserByPin, hashPin, isPredictablePin, isValidPin, sessionUser, verifyPin } from "@/lib/auth";

const cfg = (over: Partial<AuthConfig> = {}): AuthConfig => ({
  enabled: true,
  secret: "secreto-de-pruebas",
  version: 3,
  hours: 12,
  users: [
    { id: "u1", name: "Ana", role: "ADMIN", pinHash: hashPin("2468"), version: 0 },
    { id: "u2", name: "Pepe", role: "WORKSHOP", pinHash: hashPin("1357"), version: 2 },
  ],
  ...over,
});

test.describe("PIN y sesiones", () => {
  test("el PIN se guarda cifrado y se comprueba", () => {
    const h = hashPin("2468");
    expect(h).not.toContain("2468");
    expect(verifyPin("2468", h)).toBe(true);
    expect(verifyPin("2469", h)).toBe(false);
    expect(hashPin("2468")).not.toBe(h); // sal distinta cada vez
  });

  test("formato y PIN obvios", () => {
    expect(isValidPin("1234")).toBe(true);
    expect(isValidPin("123")).toBe(false);
    expect(isValidPin("12a4")).toBe(false);
    for (const p of ["1111", "1234", "4321", "0000", "56789"]) expect(isPredictablePin(p), p).toBe(true);
    expect(isPredictablePin("2468")).toBe(false);
  });

  test("el PIN identifica a la persona", () => {
    expect(findUserByPin("1357", cfg())?.name).toBe("Pepe");
    expect(findUserByPin("9999", cfg())).toBeNull();
  });

  test("la sesión caduca al cambiar el PIN, al desactivar o al cerrar todas", () => {
    const c = cfg();
    const pepe = c.users[1];
    const { token } = createSessionToken({ secret: c.secret!, version: c.version, hours: c.hours }, pepe);
    expect(sessionUser(token, c)).toEqual({ id: "u2", name: "Pepe", role: "WORKSHOP" });
    // Cambió su PIN
    expect(sessionUser(token, cfg({ users: [{ ...pepe, version: 3 }] }))).toBeNull();
    // Desactivado (no está entre los activos)
    expect(sessionUser(token, cfg({ users: [c.users[0]] }))).toBeNull();
    // «Cerrar todas las sesiones»
    expect(sessionUser(token, cfg({ version: 4 }))).toBeNull();
    // Firma manipulada
    expect(sessionUser(token.slice(0, -2) + "xx", c)).toBeNull();
    expect(sessionUser(token, cfg({ secret: "otro" }))).toBeNull();
  });
});
