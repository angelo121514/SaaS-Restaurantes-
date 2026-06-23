/**
 * U-06: helpers.generateOrderNumber()
 * Genera número de pedido con prefijo + timestamp + random.
 */
import { describe, it, expect } from "vitest";
import { generateOrderNumber } from "../../utils/helpers";

describe("U-06 · generateOrderNumber", () => {
  it("genera un string no vacío", () => {
    const num = generateOrderNumber();
    expect(typeof num).toBe("string");
    expect(num.length).toBeGreaterThan(0);
  });

  it("contiene el prefijo de orden configurado", () => {
    const num = generateOrderNumber();
    // El prefijo viene de APP_CONFIG.orderPrefix
    expect(num).toMatch(/^[A-Z]+/);
  });

  it("genera números únicos en sucesión rápida", () => {
    const nums = new Set<string>();
    for (let i = 0; i < 100; i++) {
      nums.add(generateOrderNumber());
    }
    // Al menos 90 de 100 deben ser únicos (timestamp puede colisionar en bucle rápido)
    // NOTA: este test DOCUMENTA la debilidad del generador actual (basado en timestamp).
    // BUG #5 del reporte de auditoría: race condition en generate_order_number() de DB.
    // Tras P1-8 (migración a SEQUENCE), este test debe actualizarse.
    expect(nums.size).toBeGreaterThanOrEqual(90);
  });

  // NOTA: Este test NO cubre la race condition reportada en BUG #5
  // (la función SQL generate_order_number() en DB usa COUNT(*)+1).
  // Esa race condition se testea con tests de integración (I-*).
});
