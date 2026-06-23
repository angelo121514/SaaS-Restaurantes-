/**
 * U-02: helpers.isValidPhone()
 * Documenta que el regex actual es para India (roto para LATAM).
 * Tras fix P1-X, este test debe actualizarse.
 */
import { describe, it, expect } from "vitest";
import { isValidPhone } from "../../utils/helpers";

describe("U-02 · isValidPhone (BUG DOCUMENTADO)", () => {
  it("rechaza teléfono chileno válido (BUG — regex es para India)", () => {
    // Chile: +56 9 1234 5678 → 9 dígitos empezando con 9
    expect(isValidPhone("+56912345678")).toBe(false); // ← BUG
    expect(isValidPhone("912345678")).toBe(false); // ← BUG
  });

  it("acepta teléfono indio válido (regex actual)", () => {
    expect(isValidPhone("9876543210")).toBe(true); // 10 dígitos, empieza con 9
    expect(isValidPhone("8765432109")).toBe(true);
  });

  it("rechaza formatos inválidos universally", () => {
    expect(isValidPhone("")).toBe(false);
    expect(isValidPhone("123")).toBe(false);
    expect(isValidPhone("abcdefghij")).toBe(false);
  });

  // Test SKIP: pendiente fix (Fase 3 internacionalización)
  it.skip("acepta teléfono chileno +56 (tras fix)", () => {
    expect(isValidPhone("+56912345678")).toBe(true);
  });

  it.skip("acepta teléfono mexicano +52 (tras fix)", () => {
    expect(isValidPhone("+521234567890")).toBe(true);
  });
});
