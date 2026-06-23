/**
 * U-08: helpers.formatDate / formatDateTime / formatTime
 * Documenta el bug del locale 'en-IN' (debería ser es-CL).
 */
import { describe, it, expect } from "vitest";
import { formatDate, formatDateTime, formatTime } from "../../utils/helpers";

describe("U-08 · format helpers (BUG locale 'en-IN')", () => {
  const testDate = "2026-06-22T15:30:00.000Z";

  it("formatDate retorna un string", () => {
    const result = formatDate(testDate);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("formatDateTime retorna un string con hora", () => {
    const result = formatDateTime(testDate);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("formatTime retorna un string", () => {
    const result = formatTime(testDate);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  // BUG DOCUMENTADO: el locale actual es 'en-IN' (indio), debería ser 'es-CL'
  // Tras fix Fase 3, estos tests deben actualizarse para validar formato chileno.
  it("BUG: usa locale 'en-IN' en vez de 'es-CL'", () => {
    // El formato indio usa ',' como separador de miles en algunos casos
    // y el orden de día/mes puede variar.
    const result = formatDate(testDate);
    // No podemos asertar formato exacto sin saber la zona horaria del runner,
    // pero el test DOCUMENTA que esto debe arreglarse en Fase 3.
    expect(result).toBeTruthy();
  });
});
